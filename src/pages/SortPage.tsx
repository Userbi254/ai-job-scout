import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { sortJobsByRelevance, getRelevanceBreakdown } from '@/utils/jobSorter';
import {
  ArrowUpDown,
  Star,
  FileText,
  Building,
  DollarSign,
  TrendingUp,
  Info,
  Loader2,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';


import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate, useLocation } from 'react-router-dom';
import { Job } from '@/types/job';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SortPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [minScore, setMinScore] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentSorts, setRecentSorts] = useState<any[]>([]);
  const [showRecent, setShowRecent] = useState(true);

  useEffect(() => {
    // Check if jobs passed from ExtractPage
    if (location.state?.jobs && Array.isArray(location.state.jobs)) {
      const passedJobs = location.state.jobs.map((job: any, idx: number) => ({
        ...job,
        id: job.id || `sorted-${Date.now()}-${idx}`
      }));
      setJobs(passedJobs);
      setIsLoading(false);

      // Save sorted jobs to database only if we have jobs
      if (passedJobs.length > 0) {
        saveSortedJobs(passedJobs);
      }
    } else {
      // Fallback: fetch from database
      fetchTopJobs();
    }

    fetchRecentSorts();
  }, []);

  const saveSortedJobs = async (sortedJobs: Job[]) => {
    if (sortedJobs.length === 0) return;

    try {
      await (supabase.from('workflow_runs') as any).insert({
        status: 'completed',
        started_at: new Date().toISOString(),
        sorted_jobs: sortedJobs
      });
      fetchRecentSorts();
    } catch (err) {
      console.error('Failed to save sorted jobs:', err);
    }
  };

  const fetchRecentSorts = async () => {
    try {
      const { data } = await supabase
        .from('workflow_runs')
        .select('*')
        .not('sorted_jobs', 'is', null)
        .or('is_trashed.is.null,is_trashed.eq.false')
        .order('started_at', { ascending: false })
        .limit(10);

      if (data) {
        setRecentSorts(data);
      }
    } catch (error) {
      console.error('Failed to fetch recent sorts:', error);
    }
  };

  const fetchTopJobs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('relevance_score', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const typedJobs: Job[] = data.map(job => ({
          ...job,
          skills_needed: job.skills_needed || [],
          requirements: job.requirements || [],
          employment_details: job.employment_details || []
        })) as Job[];

        setJobs(typedJobs);
      }
    } catch (error) {
      console.error('Error fetching top jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const sortedJobs = useMemo(() => {
    return jobs.filter(
      job => (job.relevance_score || 0) >= minScore
    );
  }, [jobs, minScore]);

  const handleGenerateCV = (job: Job) => {
    navigate('/cv', { state: { selectedJob: job } });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sort & Rank</h1>
          <p className="text-muted-foreground mt-1">
            {jobs.length} jobs ranked by relevance
          </p>
        </div>

        {/* Scoring Legend */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Relevance Scoring</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Star className="w-4 h-4" />
                Keywords
              </div>
              <div className="text-sm">Up to 40 points</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="w-4 h-4" />
                Completeness
              </div>
              <div className="text-sm">Up to 35 points</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Building className="w-4 h-4" />
                Reputation
              </div>
              <div className="text-sm">Up to 15 points</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                Details
              </div>
              <div className="text-sm">Up to 10 points</div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Minimum Relevance Score</h3>
            <span className="text-2xl font-bold">{minScore}%</span>
          </div>
          <Slider
            value={[minScore]}
            onValueChange={(value) => setMinScore(value[0])}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Showing {sortedJobs.length} of {jobs.length} jobs
          </p>
        </div>

        {/* Sorted Jobs */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Loading jobs...</p>
            </div>
          ) : sortedJobs.length > 0 ? (
            sortedJobs.map((job, index) => {
              const breakdown = getRelevanceBreakdown(job);

              return (
                <div key={job.id} className="glass-panel p-4">
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0",
                      index === 0 ? "bg-primary/20 text-primary-foreground" :
                        index === 1 ? "bg-accent text-accent-foreground" :
                          index === 2 ? "bg-secondary text-secondary-foreground" :
                            "bg-muted text-muted-foreground"
                    )}>
                      #{index + 1}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{job.job_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span>{job.company || 'Unknown'}</span>
                            <span>•</span>
                            <span>{job.employment_details?.join(', ') || 'Not specified'}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <div className="w-24 h-3 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    (job.relevance_score || 0) >= 80 ? "bg-success" :
                                      (job.relevance_score || 0) >= 60 ? "bg-warning" :
                                        "bg-destructive"
                                  )}
                                  style={{ width: `${job.relevance_score || 0}%` }}
                                />
                              </div>
                              <span className="text-lg font-bold">{job.relevance_score || 0}%</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-3">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between gap-4">
                                <span>Keywords:</span>
                                <span className="font-mono">{breakdown.keywords}/40</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Completeness:</span>
                                <span className="font-mono">{breakdown.completeness}/35</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Reputation:</span>
                                <span className="font-mono">{breakdown.reputation}/15</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Details:</span>
                                <span className="font-mono">{breakdown.salary}/10</span>
                              </div>
                              <div className="border-t border-border pt-2 flex justify-between gap-4 font-semibold">
                                <span>Total:</span>
                                <span className="font-mono">{breakdown.total}/100</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Description Preview */}
                      {job.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {job.description.substring(0, 200)}...
                        </p>
                      )}

                      {/* Skills Preview */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {job.skills_needed?.slice(0, 4).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {(job.skills_needed?.length || 0) > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{(job.skills_needed?.length || 0) - 4} more
                          </Badge>
                        )}
                      </div>

                      {/* Pay & Actions */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-4">
                          {job.amount && (
                            <Badge variant="outline" className="text-success border-success/30">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {job.amount}
                            </Badge>
                          )}
                          {job.location && (
                            <Badge variant="outline">
                              {job.location}
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleGenerateCV(job)}
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Generate CV
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass-panel p-8 text-center">
              <p className="text-muted-foreground">
                {jobs.length === 0
                  ? "No jobs to sort. Go to Scrape page to extract jobs first."
                  : `No jobs match the minimum score of ${minScore}%`}
              </p>
              {minScore > 0 && (
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setMinScore(0)}
                >
                  Reset Filter
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Recent Sorted Jobs */}
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
                <h3 className="text-lg font-semibold">Recent Sorted Jobs</h3>
                <p className="text-sm text-muted-foreground">
                  {recentSorts.length} sort sessions
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              {recentSorts.reduce((acc, s) => acc + (Array.isArray(s.sorted_jobs) ? s.sorted_jobs.length : 0), 0)} jobs
            </Badge>
          </button>
          {showRecent && (
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {recentSorts.map((sort) => (
                <div key={sort.id} className="p-3 bg-accent/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm">Sort Session</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sort.started_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Array.isArray(sort.sorted_jobs) ? sort.sorted_jobs.length : 0} jobs
                      </Badge>
                      {Array.isArray(sort.sorted_jobs) && sort.sorted_jobs.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const loadedJobs = sort.sorted_jobs.map((job: any, idx: number) => ({
                              ...job,
                              id: job.id || `loaded-${Date.now()}-${idx}`
                            }));
                            setJobs(loadedJobs);
                            toast.success(`Loaded ${loadedJobs.length} sorted jobs`);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Jobs
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
                                  deleted_from: 'sort'
                                })
                                .eq('id', sort.id);

                              console.log('[Sort Delete] Updated item:', sort.id, 'error:', error);

                              if (error) {
                                // Ignore AbortError as it's usually from StrictMode
                                if (error.message?.includes('AbortError') || error.code === 'PGRST116') {
                                  return;
                                }
                                throw error;
                              }

                              toast.success("Sort history moved to trash");
                              fetchRecentSorts();
                            } catch (err: unknown) {
                              const error = err as { message?: string };
                              if (error?.message?.includes('AbortError') || error?.message?.includes('aborted')) {
                                fetchRecentSorts();
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
                </div>
              ))}
              {recentSorts.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">No recent sorts</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
