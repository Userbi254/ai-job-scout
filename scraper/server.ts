import express, { Request, Response } from 'express';
import cors from 'cors';
import { scrapeWithPlaywright } from './services/playwright.js';
import { extractJobsWithCheerio, extractLinks, htmlToText } from './services/cheerio.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Scraping Worker is running',
        services: ['playwright', 'cheerio'],
        version: '2.0.0'
    });
});

/**
 * POST /scrape
 * Scrapes a URL using Playwright (JavaScript execution)
 */
app.post('/scrape', async (req: Request, res: Response) => {
    try {
        const { url, options = {} } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        console.log(`[API] /scrape request for: ${url}`);

        const result = await scrapeWithPlaywright(url, options);

        // Convert HTML to clean text
        const text = htmlToText(result.html);

        res.json({
            success: true,
            html: result.html,
            text: text,
            text_length: text.length,
            title: result.title,
            links: result.links
        });
    } catch (error: any) {
        console.error('[API] /scrape error:', error);
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
║           AI Job Scraper Worker - Running                 ║
╠═══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                              ║
║                                                           ║
║  Endpoints:                                               ║
║  • GET  /health          - Health check                   ║
║  • POST /scrape          - Playwright scraping            ║
║  • POST /parse           - Cheerio parsing                ║
║  • POST /html-to-text    - HTML to text                   ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
