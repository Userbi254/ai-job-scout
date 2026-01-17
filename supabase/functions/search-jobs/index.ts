import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys - All providers
const API_KEYS = {
  FIRECRAWL: Deno.env.get('FIRECRAWL_API_KEY') || "fc-13f002e987bd41d4947c2b279632722c",
  SERPER: Deno.env.get('SERPER_API_KEY') || "4f86f0c3b712ffd768ff65e7a441d7ea32650fd43",
  BRAVE: Deno.env.get('BRAVE_SEARCH_API_KEY') || "R6_2d3f4e9b1c2446f8e8e7f4a9b5c6d7e",
  GOOGLE: Deno.env.get('GOOGLE_API_KEY') || "AIzaSyCb-cCC4Ev0cyEpLpaSJl2ebNmq0KqZQk0",
  SEARCH_ENGINE_ID: Deno.env.get('SEARCH_ENGINE_ID') || "261b4d09ac5db4ddb",
  SERP_API: Deno.env.get('SERP_API_KEY') || "44f6ff6a9ed65997f2ae327b9789f582b54adca0c4354883d99de3312fee1797",
  TAVILY: Deno.env.get('TAVIL_API_KEY') || "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",
};

// URL Filtering Patterns
const IRRELEVANT_PATTERNS = [
  'blog', 'news', 'article', 'post', '/20', 'techcrunch.com', 'medium.com',
  'forbes.com', 'wired.com', 'theverge.com', 'twitter.com', 'facebook.com',
  'linkedin.com/pulse', 'linkedin.com/feed', 'youtube.com', 'instagram.com',
  'reddit.com', '/author/', '/tag/', '/category/', 'press-release'
];

const JOB_BOARD_PATTERNS = [
  'careers', 'jobs', 'apply', 'hiring', 'vacancies', 'opportunities',
  'recruitment', 'work-with-us', 'join-us', 'openings', 'positions'
];

interface SearchResult {
  url: string;
  title: string;
  source: string;
}

function isJobBoardUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return JOB_BOARD_PATTERNS.some(pattern => urlLower.includes(pattern));
}

function isIrrelevantUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return IRRELEVANT_PATTERNS.some(pattern => urlLower.includes(pattern));
}

// Provider rotation state
let lastProviderIndex = -1;

// Individual provider search functions
async function searchFirecrawl(query: string): Promise<SearchResult[]> {
  try {
    console.log('[Firecrawl] Searching...');
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEYS.FIRECRAWL}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        limit: 100, // Get maximum results
        lang: "en",
        country: "ke"
      })
    });

    if (!response.ok) {
      console.log(`[Firecrawl] Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      console.log(`[Firecrawl] Found ${data.data.length} results`);
      return data.data.map((item: { url: string; title: string }) => ({
        url: item.url,
        title: item.title || '',
        source: 'Firecrawl'
      }));
    }
    return [];
  } catch (error) {
    console.error('[Firecrawl] Exception:', error);
    return [];
  }
}

async function searchSerper(query: string): Promise<SearchResult[]> {
  try {
    console.log('[Serper] Searching...');
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEYS.SERPER,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query, gl: "ke", num: 100 })
    });

    if (!response.ok) {
      console.log(`[Serper] Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (data.organic && data.organic.length > 0) {
      console.log(`[Serper] Found ${data.organic.length} results`);
      return data.organic.map((item: { link: string; title: string }) => ({
        url: item.link,
        title: item.title || '',
        source: 'Serper'
      }));
    }
    return [];
  } catch (error) {
    console.error('[Serper] Exception:', error);
    return [];
  }
}

async function searchBrave(query: string): Promise<SearchResult[]> {
  try {
    console.log('[Brave] Searching...');
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&country=ke&count=100`,
      { headers: { "X-Subscription-Token": API_KEYS.BRAVE } }
    );

    if (!response.ok) {
      console.log(`[Brave] Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (data.web && data.web.results) {
      console.log(`[Brave] Found ${data.web.results.length} results`);
      return data.web.results.map((item: { url: string; title: string }) => ({
        url: item.url,
        title: item.title || '',
        source: 'Brave'
      }));
    }
    return [];
  } catch (error) {
    console.error('[Brave] Exception:', error);
    return [];
  }
}

async function searchGoogle(query: string): Promise<SearchResult[]> {
  try {
    console.log('[Google] Searching...');
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${API_KEYS.GOOGLE}&cx=${API_KEYS.SEARCH_ENGINE_ID}&num=10&gl=ke`
    );

    if (!response.ok) {
      console.log(`[Google] Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      console.log(`[Google] Found ${data.items.length} results`);
      return data.items.map((item: { link: string; title: string }) => ({
        url: item.link,
        title: item.title || '',
        source: 'Google'
      }));
    }
    return [];
  } catch (error) {
    console.error('[Google] Exception:', error);
    return [];
  }
}

async function searchSerpAPI(query: string): Promise<SearchResult[]> {
  try {
    console.log('[SerpAPI] Searching...');
    const response = await fetch(
      `https://serpapi.com/search?q=${encodeURIComponent(query)}&location=Kenya&api_key=${API_KEYS.SERP_API}&num=100`
    );

    if (!response.ok) {
      console.log(`[SerpAPI] Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (data.organic_results && data.organic_results.length > 0) {
      console.log(`[SerpAPI] Found ${data.organic_results.length} results`);
      return data.organic_results.map((item: { link: string; title: string }) => ({
        url: item.link,
        title: item.title || '',
        source: 'SerpAPI'
      }));
    }
    return [];
  } catch (error) {
    console.error('[SerpAPI] Exception:', error);
    return [];
  }
}

async function searchTavily(query: string): Promise<SearchResult[]> {
  try {
    console.log('[Tavily] Searching...');
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: API_KEYS.TAVILY,
        query,
        max_results: 100,
        include_domains: [],
        search_depth: "advanced"
      })
    });

    if (!response.ok) {
      console.log(`[Tavily] Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      console.log(`[Tavily] Found ${data.results.length} results`);
      return data.results.map((item: { url: string; title: string }) => ({
        url: item.url,
        title: item.title || '',
        source: 'Tavily'
      }));
    }
    return [];
  } catch (error) {
    console.error('[Tavily] Exception:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ success: true, message: 'Search Jobs Function is running', providers: ['Firecrawl', 'Serper', 'Brave', 'Google', 'SerpAPI', 'Tavily'] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for: ${query}`);

    // Provider list for rotation
    const providers = [
      { name: 'Firecrawl', fn: searchFirecrawl },
      { name: 'Serper', fn: searchSerper },
      { name: 'Brave', fn: searchBrave },
      { name: 'Google', fn: searchGoogle },
      { name: 'SerpAPI', fn: searchSerpAPI },
      { name: 'Tavily', fn: searchTavily }
    ];

    // Rotate starting provider
    lastProviderIndex = (lastProviderIndex + 1) % providers.length;

    let allResults: SearchResult[] = [];
    const apisUsed: string[] = [];

    // Try providers in rotation order, collect ALL results from ALL providers
    for (let i = 0; i < providers.length; i++) {
      const providerIndex = (lastProviderIndex + i) % providers.length;
      const provider = providers[providerIndex];

      const results = await provider.fn(query);

      if (results.length > 0) {
        allResults.push(...results);
        apisUsed.push(`${provider.name}(${results.length})`);
        console.log(`${provider.name}: ${results.length} results`);
      }

      // Stop if we have enough results (but still use at least 2 providers for diversity)
      if (allResults.length >= 50 && apisUsed.length >= 2) {
        break;
      }
    }

    if (allResults.length === 0) {
      console.log('All providers failed to return results');
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          apisUsed: 'none',
          totalFound: 0,
          filtered: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueResults: SearchResult[] = [];
    for (const result of allResults) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        uniqueResults.push(result);
      }
    }

    // URL Classification and Filtering
    const jobBoards: SearchResult[] = [];
    const otherRelevant: SearchResult[] = [];

    for (const result of uniqueResults) {
      if (isIrrelevantUrl(result.url)) {
        console.log(`Filtered out (irrelevant): ${result.url}`);
        continue;
      }

      if (isJobBoardUrl(result.url)) {
        jobBoards.push(result);
      } else {
        otherRelevant.push(result);
      }
    }

    // Prioritize job boards, then other relevant URLs - NO LIMIT
    const filteredResults = [...jobBoards, ...otherRelevant];

    console.log(`Total: ${allResults.length} -> Unique: ${uniqueResults.length} -> Filtered: ${filteredResults.length} (${jobBoards.length} job boards)`);

    return new Response(
      JSON.stringify({
        success: true,
        data: filteredResults, // ALL results, no limit
        apisUsed: apisUsed.join(', '),
        totalFound: allResults.length,
        unique: uniqueResults.length,
        filtered: filteredResults.length,
        jobBoards: jobBoards.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
