/**
 * Firecrawl API Service - Cloud fallback for scraping
 */

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-ceef58d4550f449086c5e6ad49ae2dd6';

interface FirecrawlResult {
    text: string;
    links: string[];
    provider: string;
}

/**
 * Scrape using Firecrawl API (cloud fallback)
 */
export async function scrapeWithFirecrawl(url: string): Promise<FirecrawlResult | null> {
    try {
        console.log('[Firecrawl] Scraping:', url);

        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                formats: ['markdown', 'links'],
                onlyMainContent: true,
                waitFor: 2000,
            }),
        });

        if (!response.ok) {
            console.error('[Firecrawl] Error:', response.status);
            return null;
        }

        const data = await response.json();
        const result = data.data || data;

        return {
            text: result.markdown || '',
            links: result.links || [],
            provider: 'Firecrawl'
        };
    } catch (error) {
        console.error('[Firecrawl] Exception:', error);
        return null;
    }
}
