import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Play, FileText, Link as LinkIcon, AlertCircle, CheckCircle, ArrowRight, Loader2, ChevronRight, Download, Eye, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from '@/lib/utils';

// Local scraper URL
const SCRAPER_URL = 'http://localhost:3001';

interface CrawlResult {
  url: string;
  method: string;
  text_length: number;
  num_links: number;
  status: 'success' | 'failed';
  text?: string;
  tool?: string;
}

export default function CrawlScrapePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [results, setResults] = useState<CrawlResult[]>([]);

  const [searchState, setSearchState] = useState<{ results: any[], currentIndex: number } | null>(null);
  const [autoCrawlComplete, setAutoCrawlComplete] = useState(false);
  const [recentCrawls, setRecentCrawls] = useState<any[]>([]);
  const [showRecent, setShowRecent] = useState(true);
  const [previewContent, setPreviewContent] = useState<{ url: string; text: string } | null>(null);

  // Deep scraping options
  const [useDeepScrape, setUseDeepScrape] = useState(true);
  const [depth, setDepth] = useState(1);
  const [maxPages, setMaxPages] = useState(10);
  const [expandTabs, setExpandTabs] = useState(true);
  const [expandCollapsible, setExpandCollapsible] = useState(true);
  const [handlePagination, setHandlePagination] = useState(true);

  // Refs for real-time access during crawling loop
  const useDeepScrapeRef = useRef(useDeepScrape);
  const depthRef = useRef(depth);
  const maxPagesRef = useRef(maxPages);
  const expandTabsRef = useRef(expandTabs);
  const expandCollapsibleRef = useRef(expandCollapsible);
  const handlePaginationRef = useRef(handlePagination);

  // Sync refs with state
  useEffect(() => {
    useDeepScrapeRef.current = useDeepScrape;
    depthRef.current = depth;
    maxPagesRef.current = maxPages;
    expandTabsRef.current = expandTabs;
    expandCollapsibleRef.current = expandCollapsible;
    handlePaginationRef.current = handlePagination;
  }, [useDeepScrape, depth, maxPages, expandTabs, expandCollapsible, handlePagination]);

  // Download content as text file
  const handleDownload = (result: CrawlResult) => {
    if (!result.text) {
      toast.error("No content to download");
      return;
    }
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crawled-${new URL(result.url).hostname}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Content downloaded");
  };

  // Preview content in modal
  const handlePreview = (result: CrawlResult) => {
    if (!result.text) {
      toast.error("No content to preview");
      return;
    }
    setPreviewContent({ url: result.url, text: result.text });
  };

  // Fetch recent crawls
  useEffect(() => {
    fetchRecentCrawls();
  }, []);

  const fetchRecentCrawls = async () => {
    try {
      const { data } = await supabase
        .from('workflow_runs')
        .select('*')
        .not('crawled_pages', 'is', null)
        .or('is_trashed.is.null,is_trashed.eq.false')
        .is('query', null) // Only show manual crawls (no search query)
        .order('started_at', { ascending: false })
        .limit(10);

      if (data) {
        // Filter out records with empty arrays
        const validCrawls = data.filter(run => 
          Array.isArray(run.crawled_pages) && run.crawled_pages.length > 0
        );
        setRecentCrawls(validCrawls);
      }
    } catch (error) {
      console.error('Failed to fetch recent crawls:', error);
    }
  };

  // Handle incoming search results from SearchPage
  useEffect(() => {
    // Save state immediately then clear it to prevent re-triggers
    const savedState = location.state ? { ...location.state } : null;
    if (location.state) {
      window.history.replaceState({}, document.title);
    }

    if (savedState?.searchResults && Array.isArray(savedState.searchResults)) {
      const searchResults = savedState.searchResults;
      setSearchState({
        results: searchResults,
        currentIndex: 0
      });

      // Auto-crawl all URLs when forwarded from SearchPage
      if (!autoCrawlComplete) {
        toast.info(`Auto-crawling ${searchResults.length} URLs...`);
        crawlAllUrls(searchResults);
      }
    } else if (savedState?.url) {
      setUrl(savedState.url);
    }
    if (savedState?.results && typeof savedState?.currentIndex === 'number') {
      setSearchState({
        results: savedState.results,
        currentIndex: savedState.currentIndex
      });
    }
  }, [location.state]);

  const crawlAllUrls = async (urls: any[]) => {
    setIsCrawling(true);
    const crawlResults: CrawlResult[] = [];

    for (let i = 0; i < urls.length; i++) {
      const urlData = urls[i];
      const targetUrl = urlData.url || urlData;

      console.log(`[Scraper] Starting crawl ${i + 1}/${urls.length}: ${targetUrl}`);
      toast.loading(`Crawling ${i + 1}/${urls.length}: ${targetUrl.substring(0, 30)}...`);

      try {
        const currentUseDeepScrape = useDeepScrapeRef.current;
        const endpoint = currentUseDeepScrape ? `${SCRAPER_URL}/deep-scrape` : `${SCRAPER_URL}/scrape`;
        const body = currentUseDeepScrape ? {
          url: targetUrl,
          depth: depthRef.current,
          maxPages: maxPagesRef.current,
          expandTabs: expandTabsRef.current,
          expandCollapsible: expandCollapsibleRef.current,
          handlePagination: handlePaginationRef.current
        } : { url: targetUrl };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        const error = !response.ok ? data.error : null;

        console.log(`[Scraper] Response for ${targetUrl}:`, {
          success: data.success,
          provider: data.provider,
          textLength: Array.isArray(data.data)
            ? data.data.reduce((acc: number, p: any) => acc + (p.text?.length || 0), 0)
            : (data.text?.length || data.data?.text?.length || 0),
          linksCount: data.links?.length || 0,
          error: error
        });

        if (error) throw new Error(error);

        if (data.success) {
          if (Array.isArray(data.data)) {
            // Handle Deep Scrape results (multiple pages)
            data.data.forEach((page: any) => {
              if (page.text && page.text.length > 0) {
                crawlResults.push({
                  url: page.url || targetUrl,
                  method: currentUseDeepScrape ? 'Deep Scrape' : 'Standard',
                  tool: data.provider || 'Playwright',
                  text_length: page.text.length,
                  num_links: 0,
                  status: 'success',
                  text: page.text
                });
              }
            });
            console.log(`[Scraper] ✅ SUCCESS: ${targetUrl} - ${data.data.length} pages via ${data.provider}`);
          } else if (data.text && data.text.length > 0) {
            // Handle Standard Scrape results
            console.log(`[Scraper] ✅ SUCCESS: ${targetUrl} - ${data.text.length} chars via ${data.provider}`);
            crawlResults.push({
              url: targetUrl,
              method: currentUseDeepScrape ? 'Deep Scrape' : 'Standard',
              tool: data.provider || 'Playwright',
              text_length: data.text.length,
              num_links: data.links?.length || 0,
              status: 'success',
              text: data.text
            });
          } else if (data.data?.text && data.data.text.length > 0) {
            // Handle Firecrawl/Other results wrapped in data object
            console.log(`[Scraper] ✅ SUCCESS: ${targetUrl} - ${data.data.text.length} chars via ${data.provider}`);
            crawlResults.push({
              url: targetUrl,
              method: currentUseDeepScrape ? 'Deep Scrape' : 'Standard',
              tool: data.provider || 'Firecrawl',
              text_length: data.data.text.length,
              num_links: data.data.links?.length || 0,
              status: 'success',
              text: data.data.text
            });
          } else {
            console.log(`[Scraper] ❌ FAILED: ${targetUrl} - no content`);
            crawlResults.push({
              url: targetUrl,
              method: data.provider || 'Failed',
              text_length: 0,
              num_links: 0,
              status: 'failed'
            });
          }
        } else {
          console.log(`[Scraper] ❌ FAILED: ${targetUrl} - no content`);
          crawlResults.push({
            url: targetUrl,
            method: data.provider || 'Failed',
            text_length: 0,
            num_links: 0,
            status: 'failed'
          });
        }
      } catch (err) {
        console.error(`Failed to crawl ${targetUrl}:`, err);
        crawlResults.push({
          url: targetUrl,
          method: 'failed',
          text_length: 0,
          num_links: 0,
          status: 'failed'
        });
      }
    }

    setResults(crawlResults);
    setIsCrawling(false);
    setAutoCrawlComplete(true);

    // Save crawl results to database only if we have valid results
    const successfulResults = crawlResults.filter(r => r.status === 'success' && r.text && r.text.trim().length > 0);
    if (successfulResults.length > 0) {
      try {
        await (supabase.from('workflow_runs') as any).insert({
          status: 'completed',
          started_at: new Date().toISOString(),
          crawled_pages: successfulResults.map(r => ({
            url: r.url,
            method: r.method,
            text_length: r.text_length,
            num_links: r.num_links,
            text: r.text
          })),
          // Set other arrays to null to prevent empty array records
          search_results: null,
          extracted_jobs: null,
          sorted_jobs: null
        });
        fetchRecentCrawls(); // Refresh the list
      } catch (err) {
        console.error('Failed to save crawl results:', err);
      }
    }

    toast.success(`Crawled ${successfulResults.length}/${urls.length} URLs successfully`);
  };

  const handleNextResult = () => {
    if (searchState && searchState.currentIndex < searchState.results.length - 1) {
      const nextIndex = searchState.currentIndex + 1;
      const nextUrl = searchState.results[nextIndex].url;
      setSearchState({ ...searchState, currentIndex: nextIndex });
      setUrl(nextUrl);
      // Don't auto-trigger crawl - user should manually click Scrape button
      // This prevents auto-crawl from interfering with manual URL entry
    } else {
      toast.info("No more results in the list");
    }
  };

  const handleCrawl = async (crawlUrl: string = url) => {
    if (!crawlUrl.trim()) {
      toast.error("Please enter a URL to crawl");
      return;
    }

    console.log(`[Scraper] 🚀 Starting crawl: ${crawlUrl}`);
    console.log(`[Scraper] Mode: ${useDeepScrape ? 'Deep Scrape' : 'Standard Scrape'}`);

    setIsCrawling(true);
    try {
      // Use deep scrape or regular scrape endpoint
      const endpoint = useDeepScrape ? `${SCRAPER_URL}/deep-scrape` : `${SCRAPER_URL}/scrape`;
      console.log(`[Scraper] Endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(useDeepScrape ? {
          url: crawlUrl,
          depth,
          maxPages,
          expandTabs,
          expandCollapsible,
          handlePagination
        } : { url: crawlUrl })
      });
      const data = await response.json();
      const error = !response.ok ? data.error : null;

      console.log(`[Scraper] Response:`, {
        success: data.success,
        provider: data.provider,
        textLength: Array.isArray(data.data)
          ? data.data.reduce((acc: number, p: any) => acc + (p.text?.length || 0), 0)
          : (data.text?.length || data.data?.text?.length || 0),
        linksCount: data.links?.length || 0,
        error: error
      });

      if (error) throw new Error(error);

      if (data.success) {
        // Handle multiple pages from deep scrape
        if (Array.isArray(data.data)) {
          const newResults: CrawlResult[] = data.data.map((page: any) => ({
            url: page.url || crawlUrl,
            method: useDeepScrape ? 'Deep Scrape' : 'Standard',
            tool: data.provider || 'Playwright',
            text_length: page.text?.length || 0,
            num_links: 0,
            status: (page.text && page.text.length > 0) ? 'success' : 'failed',
            text: page.text
          }));
          setResults([...newResults, ...results]);

          const validPages = newResults.filter(r => r.status === 'success');
          if (validPages.length > 0) {
            toast.success(`Successfully scraped ${validPages.length} pages`);
          } else {
            toast.warning("Scraped pages contained no content");
          }
        } else {
          // Single page result
          const hasContent = data.data.text && data.data.text.length > 0;
          const newResult: CrawlResult = {
            url: data.data.url || crawlUrl,
            method: useDeepScrape ? 'Deep Scrape' : 'Standard',
            tool: data.provider || 'Firecrawl',
            text_length: data.data.text?.length || 0,
            num_links: data.data.links?.length || 0,
            status: hasContent ? 'success' : 'failed',
            text: data.data.text
          };
          setResults([newResult, ...results]);

          if (hasContent) {
            toast.success("Crawl successful");
          } else {
            toast.error("Crawl returned empty content");
          }
        }
      } else {
        toast.error(data.error || "Crawl failed");
        setResults([{
          url: crawlUrl,
          method: 'Failed',
          text_length: 0,
          num_links: 0,
          status: 'failed'
        }, ...results]);

        // Auto-skip on failure if traversing search results
        if (searchState && searchState.currentIndex < searchState.results.length - 1) {
          toast.info("Crawl failed. Auto-skipping to next result in 2s...", { duration: 2000 });
          setTimeout(() => {
            handleNextResult();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Crawl error:', error);
      toast.error("An error occurred while crawling");
      setResults([{
        url: crawlUrl,
        method: 'Failed',
        text_length: 0,
        num_links: 0,
        status: 'failed'
      }, ...results]);

      // Auto-skip on error if traversing search results
      if (searchState && searchState.currentIndex < searchState.results.length - 1) {
        toast.info("Error encountered. Auto-skipping to next result in 2s...", { duration: 2000 });
        setTimeout(() => {
          handleNextResult();
        }, 2000);
      }
    } finally {
      setIsCrawling(false);
    }
  };

  const handleExtract = (result: CrawlResult) => {
    if (result.text) {
      navigate('/extract', { state: { content: result.text, url: result.url } });
    } else {
      toast.error("No content to extract");
    }
  };

  return (
    <DashboardLayout>
      {/* Preview Modal */}
      {previewContent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewContent(null)}>
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-semibold">Crawled Content Preview</h3>
                <p className="text-sm text-muted-foreground truncate max-w-[500px]">{previewContent.url}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([previewContent.text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `crawled-${Date.now()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPreviewContent(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-lg">{previewContent.text}</pre>
            </div>
            <div className="p-4 border-t border-border text-sm text-muted-foreground">
              {previewContent.text.length.toLocaleString()} characters
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crawl & Scrape</h1>
          <p className="text-muted-foreground mt-1">
            Deep scrape job boards with link following, tab expansion, and pagination
          </p>
        </div>

        {/* Deep Scraping Options */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Deep Scrape Mode</h3>
              <p className="text-sm text-muted-foreground">Enable advanced scraping with link following and content expansion</p>
            </div>
            <Switch checked={useDeepScrape} onCheckedChange={setUseDeepScrape} />
          </div>

          {useDeepScrape && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Depth Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Link Following Depth</label>
                    <Badge variant="outline">{depth} level{depth > 1 ? 's' : ''}</Badge>
                  </div>
                  <Slider
                    value={[depth]}
                    onValueChange={(value) => setDepth(value[0])}
                    min={0}
                    max={3}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">How many levels of job-related links to follow</p>
                </div>

                {/* Max Pages */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Pages</label>
                  <Input
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(Math.max(1, parseInt(e.target.value) || 10))}
                    min={1}
                    max={50}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Maximum total pages to scrape</p>
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Expand Tabs</label>
                    <p className="text-xs text-muted-foreground">Click through tabs</p>
                  </div>
                  <Switch checked={expandTabs} onCheckedChange={setExpandTabs} />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Expand Content</label>
                    <p className="text-xs text-muted-foreground">"Show more" buttons</p>
                  </div>
                  <Switch checked={expandCollapsible} onCheckedChange={setExpandCollapsible} />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Pagination</label>
                    <p className="text-xs text-muted-foreground">Follow "Next" links</p>
                  </div>
                  <Switch checked={handlePagination} onCheckedChange={setHandlePagination} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Enter URL to crawl..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
              />
            </div>
            <Button onClick={() => handleCrawl()} disabled={isCrawling} size="lg">
              {isCrawling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isCrawling ? 'Crawling...' : 'Crawl'}
            </Button>
            {searchState && (
              <Button
                variant="outline"
                onClick={handleNextResult}
                disabled={searchState.currentIndex >= searchState.results.length - 1}
              >
                Next Result ({searchState.currentIndex + 1}/{searchState.results.length})
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground glass-panel">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No crawl results yet. Enter a URL above to start.</p>
            </div>
          ) : (
            results.map((result, index) => (
              <div key={index} className="glass-panel p-6 transition-all hover:border-primary/50 group">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-lg truncate max-w-[500px] text-primary hover:underline cursor-pointer"
                        title={result.url}
                      >
                        {result.url}
                      </a>
                      <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                        {result.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {result.method}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {result.tool || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>{result.text_length.toLocaleString()} chars</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        <span>{result.num_links} links</span>
                      </div>
                    </div>
                  </div>
                  {result.status === 'success' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreview(result)}
                        title="Preview content"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(result)}
                        title="Download content"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={() => handleExtract(result)}
                      >
                        Extract Jobs
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Proceed to Extract Button */}
        {results.length > 0 && results.some(r => r.status === 'success') && (
          <div className="glass-panel p-4 bg-accent/20">
            <Button
              onClick={() => {
                const successfulResults = results.filter(r => r.status === 'success');
                navigate('/extract', { state: { crawlResults: successfulResults } });
              }}
              className="w-full"
              size="lg"
            >
              <FileText className="w-5 h-5 mr-2" />
              Proceed to Extract ({results.filter(r => r.status === 'success').length} pages)
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* Recent Crawls */}
        <div className="glass-panel overflow-hidden">
          <button
            onClick={() => setShowRecent(!showRecent)}
            className="w-full p-4 border-b border-border/50 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={cn("transition-transform", showRecent ? "rotate-90" : "")}>
                <ChevronRight className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold">Recent Crawls</h3>
                <p className="text-sm text-muted-foreground">
                  {recentCrawls.length} crawl sessions
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              {recentCrawls.reduce((acc, c) => acc + (Array.isArray(c.crawled_pages) ? c.crawled_pages.length : 0), 0)} pages
            </Badge>
          </button>
          {showRecent && (
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {recentCrawls.map((crawl) => (
                <div key={crawl.id} className="p-3 bg-accent/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm">Crawl Session</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(crawl.started_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Array.isArray(crawl.crawled_pages) ? crawl.crawled_pages.filter((p: any) => (p.text || p.content) && (p.text || p.content).trim().length > 0).length : 0} pages
                      </Badge>
                      {Array.isArray(crawl.crawled_pages) && crawl.crawled_pages.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Load crawled pages into results
                            const loadedResults: CrawlResult[] = crawl.crawled_pages
                              .filter((page: any) => (page.text || page.content) && (page.text || page.content).trim().length > 0)
                              .map((page: any) => ({
                                url: page.url || 'Unknown URL',
                                method: page.method || 'Cached',
                                text_length: page.text?.length || page.text_length || 0,
                                num_links: page.num_links || 0,
                                status: 'success' as const,
                                text: page.text || page.content || ''
                              }));

                            if (loadedResults.length === 0) {
                              toast.error("This crawl session contains no valid data");
                              return;
                            }

                            setResults(loadedResults);
                            toast.success(`Loaded ${loadedResults.length} pages from crawl session`);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          const deleteItem = async () => {
                            try {
                              const { error } = await supabase
                                .from('workflow_runs')
                                .update({
                                  is_trashed: true,
                                  deleted_at: new Date().toISOString(),
                                  deleted_from: 'crawl'
                                })
                                .eq('id', crawl.id);

                              if (error) {
                                // Ignore AbortError as it's usually from StrictMode
                                if (error.message?.includes('AbortError') || error.code === 'PGRST116') {
                                  console.log('Delete aborted (likely StrictMode), ignoring...');
                                  return;
                                }
                                throw error;
                              }

                              toast.success("Crawl session moved to trash");
                              fetchRecentCrawls();
                            } catch (err: unknown) {
                              const error = err as { message?: string };
                              // Check if it's an abort error and ignore it
                              if (error?.message?.includes('AbortError') || error?.message?.includes('aborted')) {
                                console.log('Delete request was aborted, refreshing list...');
                                fetchRecentCrawls();
                                return;
                              }
                              console.error('Failed to move to trash:', error);
                              toast.error("Failed to move to trash");
                            }
                          };
                          deleteItem();
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {recentCrawls.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">No recent crawls</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
