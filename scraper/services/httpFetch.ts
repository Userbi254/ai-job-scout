/**
 * HTTP Fetch Service - Simple fallback for static pages
 */

interface FetchResult {
    text: string;
    links: string[];
    provider: string;
}

/**
 * Scrape using basic HTTP fetch (last resort fallback)
 */
export async function scrapeWithFetch(url: string): Promise<FetchResult | null> {
    try {
        console.log('[Fetch] Scraping:', url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
        });

        if (!response.ok) {
            console.error('[Fetch] Error:', response.status);
            return null;
        }

        const html = await response.text();

        // Extract links from HTML
        const links: string[] = [];
        const linkMatches = html.matchAll(/href=["']([^"']+)["']/gi);
        for (const match of linkMatches) {
            if (match[1].startsWith('http')) {
                links.push(match[1]);
            }
        }

        return {
            text: html,
            links: links.slice(0, 100),
            provider: 'HTTP Fetch'
        };
    } catch (error) {
        console.error('[Fetch] Exception:', error);
        return null;
    }
}
