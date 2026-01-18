import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { htmlToText } from './cheerio';

chromium.use(stealthPlugin());

interface ScrapeOptions {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
    timeout?: number;
    waitForSelector?: string | null;
}

interface ScrapeResult {
    html: string;
    title: string;
    links: string[];
}

/**
 * Scrapes a URL using Playwright for JavaScript-rendered content
 */
export async function scrapeWithPlaywright(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const {
        waitUntil = 'networkidle',
        timeout = 60000, // Increased to 60s for stealth mode
        waitForSelector = null
    } = options;

    let browser = null;

    try {
        console.log(`[Playwright] Launching stealth browser for: ${url}`);
        const startTime = Date.now();

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        // Navigate to URL
        console.log(`[Playwright] Navigating to ${url} (timeout: ${timeout}ms)...`);
        await page.goto(url, { waitUntil, timeout });
        console.log(`[Playwright] Navigation complete in ${Date.now() - startTime}ms`);

        // Wait for specific selector if provided
        if (waitForSelector) {
            console.log(`[Playwright] Waiting for selector: ${waitForSelector}`);
            await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {
                console.log(`[Playwright] Selector ${waitForSelector} not found, continuing...`);
            });
        }

        // Get page content
        console.log(`[Playwright] Extracting content...`);
        const html = await page.content();
        const title = await page.title();
        console.log(`[Playwright] Content extracted. Title: ${title}, Length: ${html.length}`);

        // Extract all links
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.href)
                .filter(href => href.startsWith('http'));
        });

        console.log(`[Playwright] Successfully scraped ${url} - ${html.length} chars, ${links.length} links`);

        return {
            success: true,
            html,
            title,
            links: links.slice(0, 100), // Limit to 100 links
            provider: 'Playwright'
        };

    } catch (error) {
        console.error(`[Playwright] Error scraping ${url}:`, error.message);
        return {
            success: false,
            error: error.message,
            provider: 'Playwright'
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Handles pagination and collects content from multiple pages
 * @param {string} url - Starting URL
 * @param {string} nextSelector - CSS selector for "next" button
 * @param {number} maxPages - Maximum pages to scrape  
 * @returns {Promise<{pages: string[], totalLinks: string[]}>}
 */
export async function scrapeWithPagination(url, nextSelector = 'a.next', maxPages = 5) {
    let browser = null;
    const pages = [];
    const allLinks = [];

    try {
        console.log(`[Playwright] Starting pagination scrape for: ${url}`);

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });

        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });

        let pageCount = 0;

        while (pageCount < maxPages) {
            // Collect current page content
            const html = await page.content();
            pages.push(html);

            // Collect links
            const links = await page.evaluate(() =>
                Array.from(document.querySelectorAll('a[href]')).map(a => a.href)
            );
            allLinks.push(...links);

            pageCount++;

            // Check if next button exists and click it
            const nextButton = await page.locator(nextSelector).first();
            if (await nextButton.isVisible()) {
                console.log(`[Playwright] Going to page ${pageCount + 1}...`);
                await nextButton.click();
                await page.waitForLoadState('networkidle');
            } else {
                console.log(`[Playwright] No more pages found after ${pageCount} pages`);
                break;
            }
        }

        return {
            success: true,
            pages,
            totalLinks: [...new Set(allLinks)].slice(0, 200),
            pageCount,
            provider: 'Playwright'
        };

    } catch (error) {
        console.error(`[Playwright] Pagination error:`, error.message);
        return {
            success: false,
            error: error.message,
            pages,
            provider: 'Playwright'
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Deep scrape with tab expansion, collapsible expansion, pagination, and link following
 * @param {string} url - Starting URL
 * @param {object} options - Deep scraping options
 * @returns {Promise<{success: boolean, data: Array, totalPages: number}>}
 */
export async function deepScrape(url, options = {}) {
    const {
        depth = 1,              // How many link levels to follow (0 = current page only)
        maxPages = 10,          // Maximum total pages to scrape
        expandTabs = true,      // Click through tabs
        expandCollapsible = true, // Click "Show more", "Expand all", etc.
        handlePagination = true,  // Follow "Next" buttons
        waitTime = 2000         // Wait time after interactions (ms)
    } = options;

    let browser = null;
    const allContent = [];
    const visitedUrls = new Set();
    const urlQueue = [{ url, depth: 0 }];

    try {
        console.log(`[Deep Scrape] Starting deep scrape: ${url} (depth: ${depth}, maxPages: ${maxPages})`);

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        while (urlQueue.length > 0 && allContent.length < maxPages) {
            const { url: currentUrl, depth: currentDepth } = urlQueue.shift();

            // Skip if already visited
            if (visitedUrls.has(currentUrl)) continue;
            visitedUrls.add(currentUrl);

            console.log(`[Deep Scrape] Processing: ${currentUrl} (depth ${currentDepth}/${depth})`);

            const page = await context.newPage();

            try {
                await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 30000 });
                await page.waitForTimeout(1000); // Let JS render

                // EXPAND TABS
                if (expandTabs) {
                    const tabElements = await page.locator('button[role="tab"], a[role="tab"], .tab, [class*="tab"]').all();
                    console.log(`[Deep Scrape] Found ${tabElements.length} tab elements`);

                    for (const tab of tabElements.slice(0, 5)) { // Max 5 tabs
                        try {
                            if (await tab.isVisible()) {
                                await tab.click();
                                await page.waitForTimeout(waitTime);
                                console.log(`[Deep Scrape] Clicked tab`);
                            }
                        } catch (e) {
                            // Tab might not be clickable, skip
                        }
                    }
                }

                // EXPAND COLLAPSIBLE ELEMENTS
                if (expandCollapsible) {
                    const expandButtons = await page.locator(
                        'button:has-text("Show more"), button:has-text("Expand"), button:has-text("Load more"), ' +
                        '[class*="show-more"], [class*="expand"], [aria-expanded="false"]'
                    ).all();

                    console.log(`[Deep Scrape] Found ${expandButtons.length} expandable elements`);

                    for (const btn of expandButtons.slice(0, 10)) { // Max 10 expansions
                        try {
                            if (await btn.isVisible()) {
                                await btn.click();
                                await page.waitForTimeout(waitTime);
                                console.log(`[Deep Scrape] Expanded element`);
                            }
                        } catch (e) {
                            // Element might not be clickable
                        }
                    }
                }

                // HANDLE PAGINATION
                if (handlePagination) {
                    let paginationCount = 0;
                    const maxPaginationClicks = 3;

                    while (paginationCount < maxPaginationClicks && allContent.length < maxPages) {
                        const nextButton = await page.locator(
                            'a:has-text("Next"), button:has-text("Next"), ' +
                            '[aria-label*="next" i], [class*="next"], ' +
                            'a[rel="next"], .pagination a:last-child'
                        ).first();

                        if (await nextButton.isVisible().catch(() => false)) {
                            // Collect current page before clicking
                            const html = await page.content();
                            const title = await page.title();
                            allContent.push({ url: currentUrl, html, title });

                            console.log(`[Deep Scrape] Clicking pagination Next...`);
                            await nextButton.click();
                            await page.waitForLoadState('networkidle');
                            await page.waitForTimeout(waitTime);
                            paginationCount++;
                        } else {
                            break;
                        }
                    }
                }

                // Collect final page content
                const html = await page.content();
                const title = await page.title();
                allContent.push({ url: currentUrl, html, title });

                // EXTRACT LINKS FOR NEXT DEPTH LEVEL
                if (currentDepth < depth) {
                    const links = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('a[href]'))
                            .map(a => a.href)
                            .filter(href => href.startsWith('http'));
                    });

                    // Filter job-related links and add to queue
                    const jobRelatedLinks = links.filter(link =>
                        /job|career|position|opening|vacancy|hiring|apply/i.test(link)
                    );

                    for (const link of jobRelatedLinks.slice(0, 5)) { // Max 5 links per page
                        if (!visitedUrls.has(link)) {
                            urlQueue.push({ url: link, depth: currentDepth + 1 });
                        }
                    }

                    console.log(`[Deep Scrape] Added ${jobRelatedLinks.slice(0, 5).length} job-related links to queue`);
                }

            } catch (pageError) {
                console.error(`[Deep Scrape] Error processing ${currentUrl}:`, pageError.message);
            } finally {
                await page.close();
            }
        }

        console.log(`[Deep Scrape] Complete! Scraped ${allContent.length} pages from ${visitedUrls.size} URLs`);

        // Convert HTML to Text
        const processedData = allContent.map(page => {
            const text = htmlToText(page.html);
            console.log(`[Deep Scrape] Converted ${page.url} -> ${text.length} chars`);
            return { ...page, text };
        });

        return {
            success: true,
            data: processedData,
            totalPages: allContent.length,
            totalUrls: visitedUrls.size,
            provider: 'Playwright Deep Scrape'
        };

    } catch (error) {
        console.error(`[Deep Scrape] Fatal error:`, error.message);
        return {
            success: false,
            error: error.message,
            data: allContent,
            provider: 'Playwright Deep Scrape'
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
