import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Worker URL - set this to your deployed scraper worker
const SCRAPER_WORKER_URL = Deno.env.get('SCRAPER_WORKER_URL') || 'http://localhost:3001';

// Sites that need JavaScript execution (Playwright)
const JS_REQUIRED_SITES = [
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com',
  'himalayas.app', 'remoteok.com', 'weworkremotely.com',
  'angel.co', 'wellfound.com', 'flexjobs.com'
];

// API Keys for fallback
const API_KEYS = {
  FIRECRAWL: Deno.env.get('FIRECRAWL_API_KEY') || "fc-13f002e987bd41d4947c2b279632722c",
};

function needsPlaywright(url: string): boolean {
  const urlLower = url.toLowerCase();
  return JS_REQUIRED_SITES.some(site => urlLower.includes(site));
}

// NEW: Deep scrape with advanced options
async function deepScrapeWithWorker(
  url: string,
  options: {
    depth?: number;
    maxPages?: number;
    expandTabs?: boolean;
    expandCollapsible?: boolean;
    handlePagination?: boolean;
  } = {}
): Promise<{ pages: any[]; provider: string } | null> {
  try {
    console.log(`[Deep Scrape] Calling worker for: ${url}`, options);

    const response = await fetch(`${SCRAPER_WORKER_URL}/deep-scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true'
      },
      body: JSON.stringify({ url, ...options })
    });

    if (!response.ok) {
      console.error(`[Deep Scrape] Error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.success) {
      return {
        pages: data.data || [],
        provider: 'Deep Scrape'
      };
    }

    return null;
    return null;
  } catch (error) {
    console.error('[Deep Scrape] Exception (Worker likely missing/offline):', error);
    return null;
  }
}

// Scrape using the Node.js Playwright worker  
async function scrapeWithWorker(url: string): Promise<{ text: string; links: string[]; provider: string } | null> {
  try {
    console.log(`[Worker] Calling Playwright worker for: ${url}`);

    const response = await fetch(`${SCRAPER_WORKER_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true'
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      console.error(`[Worker] Error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.success) {
      return {
        text: data.text || data.html || '',  // Use clean text first, fallback to HTML
        links: data.links || [],
        provider: 'Playwright Worker'
      };
    }

    return null;
  } catch (error) {
    console.error('[Worker] Exception (Worker likely missing/offline):', error);
    return null;
  }
}

// Scrape using Firecrawl API
async function scrapeWithFirecrawl(url: string): Promise<{ text: string; links: string[]; provider: string } | null> {
  try {
    console.log('[Firecrawl] Scraping:', url);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.FIRECRAWL}`,
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

// Standard HTTP fetch fallback
async function scrapeWithFetch(url: string): Promise<{ text: string; links: string[]; provider: string } | null> {
  try {
    console.log('[Fetch] Scraping:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ success: true, message: 'Crawl Page Function (v2.0 - Deep Scrape)' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { url, useDeepScrape = false, deepScrapeOptions = {} } = body;

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Crawl] Request for: ${url} (deep=${useDeepScrape})`);

    // NEW: Use deep scrape if requested
    if (useDeepScrape) {
      const result = await deepScrapeWithWorker(url, deepScrapeOptions);

      if (result && result.pages.length > 0) {
        // Convert pages array to crawl results format
        const crawlResults = result.pages.map((page: any) => ({
          url: page.url,
          text: page.html,
          provider: result.provider,
          success: true
        }));

        return new Response(
          JSON.stringify({
            success: true,
            data: crawlResults,
            total: crawlResults.length,
            provider: result.provider
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Standard single-page crawl
    let result = null;

    if (needsPlaywright(url)) {
      result = await scrapeWithWorker(url);
    }

    if (!result) {
      result = await scrapeWithFirecrawl(url);
    }

    if (!result) {
      result = await scrapeWithFetch(url);
    }

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'All scraping methods failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: [{
          url,
          text: result.text,
          provider: result.provider,
          success: true
        }],
        total: 1,
        provider: result.provider
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Crawl] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
