/**
 * Comprehensive Application Testing Script
 * Tests all pages and functionalities of AI Job Scout
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const TEST_URL = 'http://localhost:8080';
const RESULTS_FILE = 'test-results.json';

const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    errors: [],
    warnings: []
};

async function captureConsoleLogs(page) {
    const logs = { errors: [], warnings: [], logs: [] };

    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') logs.errors.push(text);
        else if (type === 'warning') logs.warnings.push(text);
        else logs.logs.push(text);
    });

    page.on('pageerror', error => {
        logs.errors.push(`Page Error: ${error.message}`);
    });

    return logs;
}

async function testDashboard(page) {
    console.log('\n=== Testing Dashboard ===');
    const test = { name: 'Dashboard', passed: false, issues: [] };

    try {
        await page.goto(`${TEST_URL}/`, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForSelector('body', { timeout: 5000 });

        // Take screenshot
        await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });

        // Check for stat cards
        const statCards = await page.$$('[class*="stat"]');
        console.log(`✓ Found ${statCards.length} stat cards`);

        // Check for activity logs
        const logsExist = await page.$('[class*="log"], [class*="activity"]');
        if (logsExist) console.log('✓ Activity logs section found');
        else test.issues.push('Activity logs section not found');

        // Check navigation
        const navItems = await page.$$('nav a, [role="navigation"] a');
        console.log(`✓ Found ${navItems.length} navigation items`);

        test.passed = test.issues.length === 0;
    } catch (error) {
        test.issues.push(error.message);
    }

    testResults.tests.push(test);
}

async function testSearchPage(page) {
    console.log('\n=== Testing Search Page ===');
    const test = { name: 'Search Page', passed: false, issues: [] };

    try {
        await page.goto(`${TEST_URL}/search`, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.screenshot({ path: 'screenshots/search.png', fullPage: true });

        // Check for search form
        const searchForm = await page.$('form, [role="search"]');
        if (searchForm) console.log('✓ Search form found');
        else test.issues.push('Search form not found');

        // Check for input fields
        const inputs = await page.$$('input');
        console.log(`✓ Found ${inputs.length} input fields`);

        // Try to fill search form
        const jobTitleInput = await page.$('input[name*="title"], input[placeholder*="title"]');
        if (jobTitleInput) {
            await jobTitleInput.type('Software Engineer');
            console.log('✓ Filled job title input');
        }

        const locationInput = await page.$('input[name*="location"], input[placeholder*="location"]');
        if (locationInput) {
            await locationInput.type('Kenya');
            console.log('✓ Filled location input');
        }

        // Check for search button
        const searchButton = await page.$('button[type="submit"], button:has-text("Search")');
        if (searchButton) console.log('✓ Search button found');
        else test.issues.push('Search button not found');

        test.passed = test.issues.length === 0;
    } catch (error) {
        test.issues.push(error.message);
    }

    testResults.tests.push(test);
}

async function testCrawlScrapePage(page) {
    console.log('\n=== Testing Crawl & Scrape Page ===');
    const test = { name: 'Crawl & Scrape Page', passed: false, issues: [] };

    try {
        await page.goto(`${TEST_URL}/crawl`, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.screenshot({ path: 'screenshots/crawl.png', fullPage: true });

        // Check for URL input
        const urlInput = await page.$('input[type="url"], input[placeholder*="URL"]');
        if (urlInput) console.log('✓ URL input found');
        else test.issues.push('URL input not found');

        // Check for deep scraping controls
        const depthControl = await page.$('input[name*="depth"], [aria-label*="depth"]');
        if (depthControl) console.log('✓ Depth control found');

        const maxPagesControl = await page.$('input[name*="max"], input[name*="pages"]');
        if (maxPagesControl) console.log('✓ Max pages control found');

        // Check for scrape button
        const scrapeButton = await page.$('button:has-text("Scrape"), button:has-text("Crawl")');
        if (scrapeButton) console.log('✓ Scrape button found');
        else test.issues.push('Scrape button not found');

        test.passed = test.issues.length === 0;
    } catch (error) {
        test.issues.push(error.message);
    }

    testResults.tests.push(test);
}

async function testExtractPage(page) {
    console.log('\n=== Testing Extract Page ===');
    const test = { name: 'Extract Page', passed: false, issues: [] };

    try {
        await page.goto(`${TEST_URL}/extract`, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.screenshot({ path: 'screenshots/extract.png', fullPage: true });

        // Check for extract button
        const extractButton = await page.$('button:has-text("Extract")');
        if (extractButton) console.log('✓ Extract button found');

        // Check for job listings
        const jobCards = await page.$$('[class*="job"], [data-job]');
        console.log(`✓ Found ${jobCards.length} job cards`);

        test.passed = test.issues.length === 0;
    } catch (error) {
        test.issues.push(error.message);
    }

    testResults.tests.push(test);
}

async function testSortPage(page) {
    console.log('\n=== Testing Sort Page ===');
    const test = { name: 'Sort Page', passed: false, issues: [] };

    try {
        await page.goto(`${TEST_URL}/sort`, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.screenshot({ path: 'screenshots/sort.png', fullPage: true });

        // Check for sort controls
        const sortSelect = await page.$('select, [role="combobox"]');
        if (sortSelect) console.log('✓ Sort control found');

        // Check for filter options
        const filterButtons = await page.$$('button[class*="filter"]');
        console.log(`✓ Found ${filterButtons.length} filter buttons`);

        test.passed = test.issues.length === 0;
    } catch (error) {
        test.issues.push(error.message);
    }

    testResults.tests.push(test);
}

async function testCVPage(page) {
    console.log('\n=== Testing CV Generation Page ===');
    const test = { name: 'CV Generation Page', passed: false, issues: [] };

    try {
        await page.goto(`${TEST_URL}/cv`, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.screenshot({ path: 'screenshots/cv.png', fullPage: true });

        // Check for CV form
        const cvForm = await page.$('form');
        if (cvForm) console.log('✓ CV form found');
        else test.issues.push('CV form not found');

        // Check for template selection
        const templateSelect = await page.$('select[name*="template"], [aria-label*="template"]');
        if (templateSelect) console.log('✓ Template selector found');

        // Check for generate button
        const generateButton = await page.$('button:has-text("Generate")');
        if (generateButton) console.log('✓ Generate button found');
        else test.issues.push('Generate button not found');

        test.passed = test.issues.length === 0;
    } catch (error) {
        test.issues.push(error.message);
    }

    testResults.tests.push(test);
}

async function testTrashPage(page) {
    console.log('\n=== Testing Trash Page ===');
    const test = { name: 'Trash Page', passed: false, issues: [] };

    try {
        await page.goto(`${TEST_URL}/trash`, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.screenshot({ path: 'screenshots/trash.png', fullPage: true });

        // Check for restore/delete buttons
        const actionButtons = await page.$$('button');
        console.log(`✓ Found ${actionButtons.length} action buttons`);

        test.passed = test.issues.length === 0;
    } catch (error) {
        test.issues.push(error.message);
    }

    testResults.tests.push(test);
}

async function runTests() {
    console.log('Starting comprehensive application tests...\n');

    // Create screenshots directory
    if (!fs.existsSync('screenshots')) {
        fs.mkdirSync('screenshots');
    }

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    const consoleLogs = await captureConsoleLogs(page);

    try {
        // Run all tests
        await testDashboard(page);
        await testSearchPage(page);
        await testCrawlScrapePage(page);
        await testExtractPage(page);
        await testSortPage(page);
        await testCVPage(page);
        await testTrashPage(page);

        // Collect console logs
        testResults.errors = consoleLogs.errors;
        testResults.warnings = consoleLogs.warnings;

        // Save results
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2));

        console.log('\n=== Test Summary ===');
        console.log(`Total Tests: ${testResults.tests.length}`);
        console.log(`Passed: ${testResults.tests.filter(t => t.passed).length}`);
        console.log(`Failed: ${testResults.tests.filter(t => !t.passed).length}`);
        console.log(`Console Errors: ${testResults.errors.length}`);
        console.log(`Console Warnings: ${testResults.warnings.length}`);
        console.log(`\nResults saved to ${RESULTS_FILE}`);

    } catch (error) {
        console.error('Test execution error:', error);
    } finally {
        await browser.close();
    }
}

runTests().catch(console.error);
