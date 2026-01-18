/**
 * Selenium Service - Alternative browser automation fallback
 * Uses selenium-webdriver for sites that block Playwright
 */

// Note: selenium-webdriver requires ChromeDriver to be installed
// Install with: npm install selenium-webdriver
// ChromeDriver must be in PATH or specified via service

import { Builder, Browser, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

interface SeleniumResult {
    text: string;
    links: string[];
    provider: string;
}

/**
 * Scrape using Selenium WebDriver (fallback for sites blocking Playwright)
 */
export async function scrapeWithSelenium(url: string): Promise<SeleniumResult | null> {
    let driver = null;

    try {
        console.log('[Selenium] Starting Chrome WebDriver for:', url);

        // Configure Chrome options for headless mode
        const options = new chrome.Options();
        options.addArguments('--headless=new');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        options.addArguments('--disable-gpu');
        options.addArguments('--window-size=1920,1080');
        options.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Build the driver
        driver = await new Builder()
            .forBrowser(Browser.CHROME)
            .setChromeOptions(options)
            .build();

        // Set timeouts
        await driver.manage().setTimeouts({
            implicit: 10000,
            pageLoad: 60000,
            script: 30000
        });

        // Navigate to URL
        console.log('[Selenium] Navigating to:', url);
        await driver.get(url);

        // Wait for body to be present
        await driver.wait(until.elementLocated(By.css('body')), 10000);

        // Wait additional time for JS to render
        await driver.sleep(2000);

        // Get page source
        const html = await driver.getPageSource();
        console.log('[Selenium] Got page source:', html.length, 'chars');

        // Extract links
        const linkElements = await driver.findElements(By.css('a[href]'));
        const links: string[] = [];
        for (const el of linkElements.slice(0, 100)) {
            try {
                const href = await el.getAttribute('href');
                if (href && href.startsWith('http')) {
                    links.push(href);
                }
            } catch (e) {
                // Element might be stale
            }
        }

        console.log('[Selenium] Successfully scraped:', url, '-', html.length, 'chars,', links.length, 'links');

        return {
            text: html,
            links,
            provider: 'Selenium'
        };

    } catch (error: any) {
        console.error('[Selenium] Error:', error.message);
        return null;
    } finally {
        if (driver) {
            try {
                await driver.quit();
            } catch (e) {
                // Ignore quit errors
            }
        }
    }
}
