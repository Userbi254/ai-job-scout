import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Briefcase, Globe, Clock, ArrowRight, Loader2, ExternalLink, CheckCircle, X, ChevronRight, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  url: string;
  title: string;
  status: 'scraped' | 'crawled' | 'pending' | 'failed';
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'scraped':
      return <CheckCircle className="w-3 h-3" />;
    case 'crawled':
      return <Clock className="w-3 h-3" />;
    case 'pending':
      return <Loader2 className="w-3 h-3 animate-spin" />;
    case 'failed':
      return <XCircle className="w-3 h-3" />;
    default:
      return null;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'scraped':
      return 'text-success border-success/30';
    case 'crawled':
      return 'text-warning border-warning/30';
    case 'pending':
      return 'text-muted-foreground';
    case 'failed':
      return 'text-destructive border-destructive/30';
    default:
      return '';
  }
};

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('"AI training" OR "data annotation" jobs Kenya');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(true);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [showRecent, setShowRecent] = useState(true);
  const [apiUsed, setApiUsed] = useState('');

  useEffect(() => {
    fetchRecentSearches();
  }, []);

  const fetchRecentSearches = async () => {
    try {
      const { data } = await supabase
        .from('workflow_runs')
        .select('*')
        .not('search_results', 'is', null)
        .or('is_trashed.is.null,is_trashed.eq.false')
        .order('started_at', { ascending: false })
        .limit(10);

      if (data) {
        setRecentSearches(data);
      }
    } catch (error) {
      console.error('Failed to fetch recent searches:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-jobs', {
        body: { query: query }
      });

      if (error) throw error;

      if (data.success) {
        const mappedResults = data.data.map((item: any) => ({
          url: item.url,
          title: item.title || item.url,
          status: 'pending'
        }));
        setResults(mappedResults);
        setApiUsed(data.apiUsed || 'unknown');

        // Persist search results to database only if we have results
        if (mappedResults.length > 0) {
          try {
            const { data: userData } = await supabase.auth.getUser();
            await (supabase.from('workflow_runs') as any).insert({
              user_id: userData.user?.id,
              query: query,
              status: 'searching',
              search_results: mappedResults
            });
            console.log("Search results persisted to database");
          } catch (dbError) {
            console.warn("Failed to persist search results:", dbError);
          }
        }

        toast.success(`Found ${mappedResults.length} results`);
      } else {
        toast.error("Failed to fetch results");
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback for demo/testing if API fails
      toast.error("Search API failed. Using mock results for demonstration.");
      const mockResults: SearchResult[] = [
        { url: 'https://www.remotasks.com/en', title: 'Remotasks - AI Training', status: 'pending' },
        { url: 'https://www.dataannotation.tech/', title: 'DataAnnotation - Work from Home', status: 'pending' },
        { url: 'https://www.sama.com/careers', title: 'Sama - AI Data Labeling', status: 'pending' },
      ];
      setResults(mockResults);

      // Persist mock results too for demonstration
      try {
        const { data: userData } = await supabase.auth.getUser();
        await (supabase.from('workflow_runs') as any).insert({
          user_id: userData.user?.id,
          query: query,
          status: 'searching',
          search_results: mockResults
        });
      } catch (e) { }
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCrawl = (url: string, index: number) => {
    navigate('/crawl', { state: { url, results, currentIndex: index } });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Find AI training and data annotation opportunities
          </p>
        </div>

        {/* Search Bar */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search keywords..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching} size="lg">
              {isSearching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Collapsible Results Section */}
        {results.length > 0 && (
          <div className="glass-panel overflow-hidden">
            <button
              onClick={() => setShowResults(!showResults)}
              className="w-full p-4 border-b border-border/50 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "transition-transform",
                  showResults ? "rotate-90" : ""
                )}>
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Search Results</h3>
                  <p className="text-sm text-muted-foreground">
                    {results.length} URLs found • Click to {showResults ? 'collapse' : 'expand'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {results.filter(r => r.status === 'scraped').length} scraped
                </Badge>
                <Badge variant="secondary">
                  {results.filter(r => r.status === 'pending').length} pending
                </Badge>
              </div>
            </button>

            {showResults && (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="w-12">#</th>
                      <th>URL</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th className="w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="group">
                        <td className="text-muted-foreground">{index + 1}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[300px]" title={result.url}>
                              {result.url}
                            </code>
                          </div>
                        </td>
                        <td>
                          <span className="truncate max-w-[250px] block" title={result.title}>{result.title}</span>
                        </td>
                        <td>
                          <Badge
                            variant="outline"
                            className={cn("gap-1", getStatusColor(result.status))}
                          >
                            {getStatusIcon(result.status)}
                            {result.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              asChild
                            >
                              <a href={result.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleCrawl(result.url, index)}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Proceed to Crawl Button */}
            <div className="p-4 border-t border-border/50 bg-accent/20">
              <Button
                onClick={() => navigate('/crawl', { state: { searchResults: results, query } })}
                className="w-full"
                size="lg"
              >
                <Globe className="w-5 h-5 mr-2" />
                Proceed to Crawl ({results.length} URLs)
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && (
          <div className="glass-panel p-12 text-center">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
            <p className="text-muted-foreground">
              Enter a search query above to find AI training jobs
            </p>
          </div>
        )}

        {/* Recent Searches */}
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
                <h3 className="text-lg font-semibold">Recent Searches</h3>
                <p className="text-sm text-muted-foreground">
                  {recentSearches.length} search queries
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {apiUsed && (
                <Badge variant="outline" className="text-xs">
                  API: {apiUsed}
                </Badge>
              )}
              <Badge variant="secondary">
                {recentSearches.reduce((acc, s) => acc + (Array.isArray(s.search_results) ? s.search_results.length : 0), 0)} URLs
              </Badge>
            </div>
          </button>
          {showRecent && (
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {recentSearches.map((search) => (
                <div key={search.id} className="p-3 bg-accent/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{search.query || 'Unknown query'}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Array.isArray(search.search_results) ? search.search_results.length : 0} results
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setQuery(search.query || '');
                          setResults(search.search_results || []);
                          setShowResults(true);
                        }}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
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
                                  deleted_from: 'search'
                                })
                                .eq('id', search.id);

                              if (error) {
                                if (error.message?.includes('AbortError') || error.code === 'PGRST116') {
                                  return;
                                }
                                throw error;
                              }

                              toast.success("Search history moved to trash");
                              fetchRecentSearches();
                            } catch (err: unknown) {
                              const error = err as { message?: string };
                              if (error?.message?.includes('AbortError') || error?.message?.includes('aborted')) {
                                fetchRecentSearches();
                                return;
                              }
                              console.error('Failed to move to trash:', error);
                              toast.error("Failed to move to trash");
                            }
                          };
                          deleteItem();
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(search.started_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {recentSearches.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">No recent searches</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
