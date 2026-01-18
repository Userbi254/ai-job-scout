import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { scrapeWithPlaywright, deepScrape } from './services/playwright.js';
import { extractJobsWithCheerio, extractLinks, htmlToText } from './services/cheerio.js';
import { scrapeWithFirecrawl } from './services/firecrawl.js';
import { scrapeWithFetch } from './services/httpFetch.js';
import { scrapeWithSelenium } from './services/selenium.js';
import { extractWithGemini, extractFromHimalayas, ExtractedJob } from './services/gemini.js';
import { saveJobs, saveWorkflowRun } from './services/supabase.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Sites that need JavaScript execution
const JS_REQUIRED_SITES = [
    'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com',
    'himalayas.app', 'remoteok.com', 'weworkremotely.com',
    'angel.co', 'wellfound.com', 'flexjobs.com', 'fuzu.com'
];

function needsPlaywright(url: string): boolean {
    return JS_REQUIRED_SITES.some(site => url.toLowerCase().includes(site));
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'AI Job Scraper - Local First',
        services: ['playwright', 'selenium', 'firecrawl', 'http-fetch', 'gemini', 'supabase'],
        version: '3.1.0'
    });
});

/**
 * POST /scrape
 * Scrapes a URL with fallback chain: Playwright → Selenium → Firecrawl → HTTP Fetch
 */
app.post('/scrape', async (req: Request, res: Response) => {
    try {
        const { url, options = {} } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        console.log(`[API] /scrape request for: ${url}`);

        let result: { text: string; links: string[]; provider: string } | null = null;

        // Strategy 1: Try Playwright first (for all URLs)
        try {
            console.log('[API] Trying Playwright...');
            const pwResult: any = await scrapeWithPlaywright(url, options);
            if (pwResult.html && pwResult.html.length > 0) {
                const text = htmlToText(pwResult.html);
                result = { text, links: pwResult.links || [], provider: 'Playwright' };
                console.log(`[API] Playwright success: ${text.length} chars`);
            } else {
                console.log('[API] Playwright returned no content');
            }
        } catch (e: any) {
            console.log('[API] Playwright failed:', e.message);
        }

        // Strategy 2: Try Selenium (if Playwright failed)
        if (!result) {
            try {
                console.log('[API] Trying Selenium...');
                const seResult = await scrapeWithSelenium(url);
                if (seResult && seResult.text && seResult.text.length > 0) {
                    const text = htmlToText(seResult.text);
                    result = { text, links: seResult.links || [], provider: 'Selenium' };
                    console.log(`[API] Selenium success: ${text.length} chars`);
                } else {
                    console.log('[API] Selenium returned no content');
                }
            } catch (e: any) {
                console.log('[API] Selenium failed:', e.message);
            }
        }

        // Strategy 3: Try Firecrawl (if Selenium failed)
        if (!result) {
            console.log('[API] Trying Firecrawl...');
            const fcResult = await scrapeWithFirecrawl(url);
            if (fcResult && fcResult.text && fcResult.text.length > 0) {
                // Firecrawl may return markdown, but apply htmlToText for consistency
                const cleanText = htmlToText(fcResult.text);
                result = { text: cleanText, links: fcResult.links || [], provider: 'Firecrawl' };
                console.log(`[API] Firecrawl success: ${cleanText.length} chars (cleaned from ${fcResult.text.length})`);
            }
        }

        // Strategy 4: Try HTTP Fetch (last resort)
        if (!result) {
            console.log('[API] Trying HTTP Fetch...');
            const fetchResult = await scrapeWithFetch(url);
            if (fetchResult && fetchResult.text && fetchResult.text.length > 0) {
                // HTTP Fetch returns raw HTML - MUST process through Cheerio
                console.log(`[API] HTTP Fetch raw HTML: ${fetchResult.text.length} chars`);
                const cleanText = htmlToText(fetchResult.text);
                result = { text: cleanText, links: fetchResult.links || [], provider: 'HTTP Fetch' };
                console.log(`[API] HTTP Fetch success: ${cleanText.length} chars (cleaned from ${fetchResult.text.length})`);
            }
        }

        if (!result) {
            return res.status(500).json({ success: false, error: 'All scraping methods failed' });
        }

        res.json({
            success: true,
            data: {
                text: result.text,
                url: url,
                links: result.links
            },
            textLength: result.text.length,
            linksCount: result.links.length,
            provider: result.provider
        });
    } catch (error: any) {
        console.error('[API] /scrape error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/deep-scrape', async (req: Request, res: Response) => {
    try {
        const { url, depth = 1, maxPages = 10, expandTabs = true, expandCollapsible = true, handlePagination = true } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        console.log(`[API] /deep-scrape request for: ${url}`);

        let result: any = null;

        // Strategy 1: Try Playwright Deep Scrape
        try {
            console.log('[API] Trying Playwright deep scrape...');
            result = await deepScrape(url, { depth, maxPages, expandTabs, expandCollapsible, handlePagination });
            if (result.success && result.data && result.data.length > 0) {
                console.log(`[API] Playwright deep scrape success: ${result.totalPages} pages`);
            } else {
                console.log('[API] Playwright deep scrape returned no content');
                result = null;
            }
        } catch (e: any) {
            console.log('[API] Playwright deep scrape failed:', e.message);
        }

        // Strategy 2: Fallback to standard scrape with Selenium
        if (!result) {
            try {
                console.log('[API] Trying Selenium fallback for deep scrape...');
                const seResult = await scrapeWithSelenium(url);
                if (seResult && seResult.text && seResult.text.length > 0) {
                    const text = htmlToText(seResult.text);
                    result = {
                        success: true,
                        data: [{ url, text, html: seResult.text, title: 'Selenium Result' }],
                        totalPages: 1,
                        provider: 'Selenium (Fallback)'
                    };
                    console.log(`[API] Selenium fallback success: ${text.length} chars`);
                } else {
                    console.log('[API] Selenium returned no content');
                }
            } catch (e: any) {
                console.log('[API] Selenium failed:', e.message);
            }
        }

        // Strategy 3: Fallback to Firecrawl
        if (!result) {
            try {
                console.log('[API] Trying Firecrawl fallback for deep scrape...');
                const fcResult = await scrapeWithFirecrawl(url);
                if (fcResult && fcResult.text && fcResult.text.length > 0) {
                    const cleanText = htmlToText(fcResult.text);
                    result = {
                        success: true,
                        data: [{ url, text: cleanText, html: fcResult.text, title: 'Firecrawl Result' }],
                        totalPages: 1,
                        provider: 'Firecrawl (Fallback)'
                    };
                    console.log(`[API] Firecrawl fallback success: ${cleanText.length} chars`);
                } else {
                    console.log('[API] Firecrawl returned no content');
                }
            } catch (e: any) {
                console.log('[API] Firecrawl failed:', e.message);
            }
        }

        // Strategy 4: Last resort HTTP Fetch
        if (!result) {
            try {
                console.log('[API] Trying HTTP fetch fallback for deep scrape...');
                const httpResult = await scrapeWithFetch(url);
                if (httpResult && httpResult.text && httpResult.text.length > 0) {
                    const cleanText = htmlToText(httpResult.text);
                    result = {
                        success: true,
                        data: [{ url, text: cleanText, html: httpResult.text, title: 'HTTP Fetch Result' }],
                        totalPages: 1,
                        provider: 'HTTP Fetch (Fallback)'
                    };
                    console.log(`[API] HTTP fetch fallback success: ${cleanText.length} chars`);
                }
            } catch (e: any) {
                console.log('[API] HTTP fetch failed:', e.message);
            }
        }

        if (!result) {
            return res.status(500).json({
                success: false,
                error: 'All scraping methods failed',
                data: [],
                totalPages: 0
            });
        }

        res.json({
            success: result.success,
            data: result.data,
            totalPages: result.totalPages,
            provider: result.provider || 'Deep Scrape'
        });
    } catch (error: any) {
        console.error('[API] /deep-scrape error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /extract-jobs
 * Extract jobs from content using Gemini AI
 */
app.post('/extract-jobs', async (req: Request, res: Response) => {
    try {
        const { pageContent, pageUrl = 'unknown' } = req.body;

        if (!pageContent) {
            return res.status(400).json({ success: false, error: 'pageContent is required' });
        }

        console.log(`[API] /extract-jobs request - ${pageContent.length} chars from ${pageUrl}`);

        const logs: string[] = [];
        const log = (msg: string) => { console.log(msg); logs.push(msg); };

        let jobs: ExtractedJob[] = [];
        let provider = 'None';

        // Strategy 1: Try Gemini (primary extraction method)
        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (geminiKey) {
            log('[Gemini] API key found, starting extraction...');
            const geminiJobs = await extractWithGemini(pageContent, pageUrl, log);
            if (geminiJobs.length > 0) {
                jobs = geminiJobs;
                provider = 'Gemini';
                log(`[Gemini] Extracted ${jobs.length} jobs`);
            } else {
                log('[Gemini] Returned 0 jobs, trying fallbacks...');
            }
        } else {
            log('[Gemini] No API key found (GEMINI_API_KEY or GOOGLE_API_KEY), skipping...');
        }

        // Strategy 2: Try himalayas pattern matching
        if (jobs.length === 0) {
            log('Trying Himalayas pattern extraction...');
            const himalayasJobs = extractFromHimalayas(pageContent, pageUrl);
            if (himalayasJobs.length > 0) {
                jobs = himalayasJobs;
                provider = 'Himalayas';
            }
        }

        // Strategy 3: Try Cheerio
        if (jobs.length === 0) {
            log('Trying Cheerio extraction...');
            const cheerioJobs = extractJobsWithCheerio(pageContent, pageUrl);
            if (cheerioJobs.length > 0) {
                jobs = cheerioJobs.map(j => ({
                    ...j,
                    amount: null,
                    location: null,
                    employment_details: [],
                    requirements: [],
                    skills_needed: [],
                    application_url: null,
                    deadline: null,
                    starting_date: null,
                    payment_method: null
                }));
                provider = 'Cheerio';
            }
        }

        // Dedupe by job name
        const unique = new Map<string, ExtractedJob>();
        for (const job of jobs) {
            const key = job.job_name.toLowerCase();
            if (!unique.has(key)) unique.set(key, job);
        }

        const final = Array.from(unique.values());
        log(`Final: ${final.length} jobs via ${provider}`);

        res.json({
            success: true,
            data: final,
            total: final.length,
            provider,
            logs
        });
    } catch (error: any) {
        console.error('[API] /extract-jobs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /crawl-and-extract
 * Combined: Crawl URL → Extract Jobs → Return results
 */
app.post('/crawl-and-extract', async (req: Request, res: Response) => {
    try {
        const { url, saveToDb = false } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        console.log(`[API] /crawl-and-extract for: ${url}`);

        // Step 1: Scrape
        let scrapeResult: { text: string; links: string[]; provider: string } | null = null;

        if (needsPlaywright(url)) {
            try {
                const pwResult = await scrapeWithPlaywright(url, {});
                scrapeResult = { text: htmlToText(pwResult.html), links: pwResult.links, provider: 'Playwright' };
            } catch (e) {
                console.log('[API] Playwright failed, trying fallbacks...');
            }
        }

        if (!scrapeResult) {
            scrapeResult = await scrapeWithFirecrawl(url);
        }

        if (!scrapeResult) {
            scrapeResult = await scrapeWithFetch(url);
        }

        if (!scrapeResult || !scrapeResult.text) {
            return res.status(500).json({ success: false, error: 'Failed to scrape URL' });
        }

        // Step 2: Extract Jobs
        const logs: string[] = [];
        const log = (msg: string) => { console.log(msg); logs.push(msg); };

        let jobs: ExtractedJob[] = [];
        let extractProvider = 'None';

        if (process.env.GEMINI_API_KEY) {
            const geminiJobs = await extractWithGemini(scrapeResult.text, url, log);
            if (geminiJobs.length > 0) {
                jobs = geminiJobs;
                extractProvider = 'Gemini';
            }
        }

        if (jobs.length === 0) {
            const himalayasJobs = extractFromHimalayas(scrapeResult.text, url);
            if (himalayasJobs.length > 0) {
                jobs = himalayasJobs;
                extractProvider = 'Himalayas';
            }
        }

        // Step 3: Optionally save to DB
        let saveResult = null;
        if (saveToDb && jobs.length > 0) {
            saveResult = await saveJobs(jobs);
        }

        res.json({
            success: true,
            scrape: {
                text_length: scrapeResult.text.length,
                links: scrapeResult.links.length,
                provider: scrapeResult.provider
            },
            extract: {
                jobs: jobs,
                total: jobs.length,
                provider: extractProvider
            },
            saved: saveResult,
            logs
        });
    } catch (error: any) {
        console.error('[API] /crawl-and-extract error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /save-jobs
 * Save extracted jobs to Supabase
 */
app.post('/save-jobs', async (req: Request, res: Response) => {
    try {
        const { jobs } = req.body;

        if (!jobs || !Array.isArray(jobs)) {
            return res.status(400).json({ success: false, error: 'jobs array is required' });
        }

        console.log(`[API] /save-jobs request - ${jobs.length} jobs`);

        const result = await saveJobs(jobs);

        res.json(result);
    } catch (error: any) {
        console.error('[API] /save-jobs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /parse
 * Parses HTML using Cheerio
 */
app.post('/parse', (req: Request, res: Response) => {
    try {
        const { html, pageUrl = 'unknown' } = req.body;

        if (!html) {
            return res.status(400).json({ success: false, error: 'HTML content is required' });
        }

        console.log(`[API] /parse request - ${html.length} chars from ${pageUrl}`);

        const jobs = extractJobsWithCheerio(html, pageUrl);

        res.json({
            success: true,
            data: jobs,
            total: jobs.length,
            provider: 'Cheerio'
        });
    } catch (error: any) {
        console.error('[API] /parse error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /html-to-text
 * Converts HTML to plain text
 */
app.post('/html-to-text', (req: Request, res: Response) => {
    try {
        const { html } = req.body;

        if (!html) {
            return res.status(400).json({ success: false, error: 'HTML content is required' });
        }

        const text = htmlToText(html);

        res.json({
            success: true,
            data: text,
            length: text.length
        });
    } catch (error: any) {
        console.error('[API] /html-to-text error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║        AI Job Scraper - Local First (v3.0.0)              ║
╠═══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                              ║
║                                                           ║
║  Scraping (with fallbacks):                               ║
║  • POST /scrape            - Playwright/Firecrawl/Fetch   ║
║  • POST /deep-scrape       - Multi-page with link follow  ║
║                                                           ║
║  Extraction:                                              ║
║  • POST /extract-jobs      - Gemini AI extraction         ║
║  • POST /parse             - Cheerio parsing              ║
║                                                           ║
║  Combined:                                                ║
║  • POST /crawl-and-extract - Scrape + Extract + Save      ║
║  • POST /save-jobs         - Save to Supabase             ║
║                                                           ║
║  Health: GET /health                                      ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
