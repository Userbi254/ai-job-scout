res.json({
    success: true,
    message: 'Scraping Worker is running',
    services: ['playwright', 'cheerio', 'deep-scrape'],
    version: '2.0.0'
});
});

/**
 * POST /scrape
 * Scrapes a URL using Playwright (JavaScript execution)
 * Body: { url, options?: { waitUntil, timeout, waitForSelector } }
 */
app.post('/scrape', async (req, res) => {
    try {
        const { url, options = {} } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        console.log(`[API] /scrape request for: ${url}`);

        const result = await scrapeWithPlaywright(url, options);

        // Convert HTML to clean text
        if (result.success && result.html) {
            result.text = htmlToText(result.html);
            result.text_length = result.text.length;
        }

        res.json(result);
    } catch (error) {
        console.error('[API] /scrape error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /deep-scrape
 * Deep scrape with tab expansion, collapsible expansion, pagination, and link following
 * Body: { url, depth?, maxPages?, expandTabs?, expandCollapsible?, handlePagination?, waitTime? }
 */
app.post('/deep-scrape', async (req, res) => {
    try {
        const { url, ...options } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        console.log(`[API] /deep-scrape request for: ${url}`, options);

        const result = await deepScrape(url, options);

        // Convert HTML to clean text for each page
        if (result.success && result.data) {
            result.data = result.data.map(page => ({
                ...page,
                text: htmlToText(page.html),
                html: page.html // Keep original HTML too
            }));
        }

        res.json(result);
    } catch (error) {
        console.error('[API] /deep-scrape error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /scrape-paginated
 * Scrapes multiple pages using Playwright pagination
 * Body: { url, nextSelector?, maxPages? }
 */
app.post('/scrape-paginated', async (req, res) => {
    try {
        const { url, nextSelector = 'a.next', maxPages = 5 } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        console.log(`[API] /scrape-paginated request for: ${url} (max ${maxPages} pages)`);

        const result = await scrapeWithPagination(url, nextSelector, maxPages);

        res.json(result);
    } catch (error) {
        console.error('[API] /scrape-paginated error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /parse
 * Parses HTML using Cheerio (BeautifulSoup-like)
 * Body: { html, pageUrl }
 */
app.post('/parse', (req, res) => {
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
            provider: 'Cheerio (BeautifulSoup-like)'
        });
    } catch (error) {
        console.error('[API] /parse error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /extract-links
 * Extracts all links from HTML
 * Body: { html, baseUrl }
 */
app.post('/extract-links', (req, res) => {
    try {
        const { html, baseUrl = '' } = req.body;

        if (!html) {
            return res.status(400).json({ success: false, error: 'HTML content is required' });
        }

        const links = extractLinks(html, baseUrl);

        res.json({
            success: true,
            data: links,
            total: links.length,
            provider: 'Cheerio'
        });
    } catch (error) {
        console.error('[API] /extract-links error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /html-to-text
 * Converts HTML to plain text
 * Body: { html }
 */
app.post('/html-to-text', (req, res) => {
    try {
        const { html } = req.body;

        if (!html) {
            return res.status(400).json({ success: false, error: 'HTML content is required' });
        }

        const text = htmlToText(html);

        res.json({
            success: true,
            data: text,
            length: text.length,
            provider: 'Cheerio'
        });
    } catch (error) {
        console.error('[API] /html-to-text error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /full-extract
 * Full pipeline: Scrape with Playwright → Parse with Cheerio
 * Body: { url, options? }
 */
app.post('/full-extract', async (req, res) => {
    try {
        const { url, options = {} } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        console.log(`[API] /full-extract request for: ${url}`);

        // Step 1: Scrape with Playwright
        const scrapeResult = await scrapeWithPlaywright(url, options);

        if (!scrapeResult.success) {
            return res.json({
                success: false,
                error: scrapeResult.error,
                provider: 'Playwright → Cheerio'
            });
        }

        // Step 2: Parse with Cheerio
        const jobs = extractJobsWithCheerio(scrapeResult.html, url);

        res.json({
            success: true,
            data: jobs,
            total: jobs.length,
            pageTitle: scrapeResult.title,
            linksFound: scrapeResult.links?.length || 0,
            provider: 'Playwright → Cheerio'
        });
    } catch (error) {
        console.error('[API] /full-extract error:', error);
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
║  • POST /deep-scrape     - Deep scrape (tabs+pagination)  ║
║  • POST /scrape-paginated - Pagination scraping           ║
║  • POST /parse           - Cheerio parsing                ║
║  • POST /extract-links   - Link extraction                ║
║  • POST /html-to-text    - HTML to text                   ║
║  • POST /full-extract    - Playwright + Cheerio           ║
║                                                           ║
║  Deep Scrape Features:                                    ║
║  • Tab expansion & clicking                               ║
║  • Collapsible element expansion                          ║
║  • Pagination handling                                    ║
║  • Link following (configurable depth)                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
