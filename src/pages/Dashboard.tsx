import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { WorkflowProgress } from '@/components/dashboard/WorkflowProgress';
import { StepSummaryCard } from '@/components/dashboard/StepSummaryCard';
import { RecentJobsTable } from '@/components/dashboard/RecentJobsTable';
import { mockJobs, mockWorkflowSteps, mockStats } from '@/data/mockData';
import { Search, Globe, FileText, Briefcase, Play, Loader2, ChevronRight } from 'lucide-react';
import { Job } from '@/types/job';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isAutomating, setIsAutomating] = useState(false);

  const handleStepClick = (stepId: string) => {
    const routes: Record<string, string> = {
      search: '/search',
      crawl: '/crawl',
      extract: '/extract',
      sort: '/sort',
      cv: '/cv'
    };
    if (routes[stepId]) {
      navigate(routes[stepId]);
    }
  };

  const handleSelectJob = (job: Job) => {
    navigate('/cv', { state: { selectedJob: job } });
  };

  const handleAutomate = async () => {
    setIsAutomating(true);
    toast.info("Starting automation sequence...");

    try {
      const { data: userData } = await supabase.auth.getUser();

      // 1. Create Workflow Run
      const { data: runData, error: runError } = await supabase.from('workflow_runs').insert({
        user_id: userData.user?.id,
        query: '"AI training" jobs Kenya',
        status: 'searching'
      }).select().single();

      if (runError) throw runError;

      // 2. Search
      toast.loading("Searching for jobs...");
      const { data: searchData, error: searchError } = await supabase.functions.invoke('search-jobs', {
        body: { query: '"AI training" jobs Kenya', limit: 5 }
      });

      if (searchError || !searchData.success || searchData.data.length === 0) {
        await supabase.from('workflow_runs').update({ status: 'failed', error_message: 'Search failed' }).eq('id', runData.id);
        throw new Error("Search failed or returned no results");
      }

      await supabase.from('workflow_runs').update({
        status: 'crawling',
        search_results: searchData.data
      }).eq('id', runData.id);

      toast.success("Search complete. Crawling...");

      // 3. Crawl & Extract Loop (Top 3 results)
      const topResults = searchData.data.slice(0, 3);
      const allExtractedJobs: Job[] = [];

      for (const result of topResults) {
        toast.loading(`Crawling: ${result.title.substring(0, 20)}...`);

        try {
          const { data: crawlData, error: crawlError } = await supabase.functions.invoke('crawl-page', {
            body: { url: result.url }
          });

          if (!crawlError && crawlData.success) {
            const pageContent = crawlData.data.text;

            const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-jobs', {
              body: { pageContent, pageUrl: result.url }
            });

            if (!extractError && extractData.success && extractData.data.length > 0) {
              allExtractedJobs.push(...extractData.data);

              // Save jobs to database
              for (const job of extractData.data) {
                await supabase.from('jobs').insert({
                  job_name: job.job_name,
                  company: job.company,
                  employment_details: job.employment_details,
                  payment_method: job.payment_method,
                  amount: job.amount,
                  starting_date: job.starting_date,
                  skills_needed: job.skills_needed,
                  requirements: job.requirements,
                  deadline: job.deadline,
                  application_url: job.application_url,
                  site_url: job.site_url
                });
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to process ${result.url}`, e);
        }
      }

      if (allExtractedJobs.length === 0) {
        await supabase.from('workflow_runs').update({ status: 'failed', error_message: 'No jobs extracted' }).eq('id', runData.id);
        throw new Error("No jobs extracted from any results");
      }

      // 4. Sort jobs by relevance
      toast.loading("Sorting jobs by relevance...");
      let sortedJobs = allExtractedJobs;

      try {
        const { data: sortData, error: sortError } = await supabase.functions.invoke('sort-jobs', {
          body: { jobs: allExtractedJobs }
        });

        if (!sortError && sortData.success && sortData.data) {
          sortedJobs = sortData.data;
          toast.success(`Sorted ${sortedJobs.length} jobs by relevance`);

          // Update jobs in database with relevance scores
          for (const job of sortedJobs) {
            if (job.relevance_score !== undefined) {
              await supabase
                .from('jobs')
                .update({ relevance_score: job.relevance_score })
                .eq('job_name', job.job_name)
                .eq('company', job.company);
            }
          }
        }
      } catch (e) {
        console.warn("Sorting failed, using unsorted jobs:", e);
      }

      await supabase.from('workflow_runs').update({
        status: 'completed',
        extracted_jobs: sortedJobs as unknown as Record<string, unknown>[],
        completed_at: new Date().toISOString()
      }).eq('id', runData.id);

      const firstJob = sortedJobs[0];
      toast.success(`Found ${sortedJobs.length} jobs. Generating CV...`);

      // 5. Navigate to CV
      navigate('/cv', { state: { selectedJob: firstJob } });
      toast.success("Automation complete! Review your CV.");

    } catch (error) {
      console.error("Automation error:", error);
      toast.error(error instanceof Error ? error.message : "Automation failed");
    } finally {
      setIsAutomating(false);
      toast.dismiss();
    }
  };

  // Real stats fetching (simplified for now)
  const [stats, setStats] = useState(mockStats);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [showRecent, setShowRecent] = useState(true);

  // Historical data state
  const [workflowHistory, setWorkflowHistory] = useState<any[]>([]);
  const [showSearches, setShowSearches] = useState(true);
  const [showCrawls, setShowCrawls] = useState(true);
  const [showExtractions, setShowExtractions] = useState(true);
  const [showSorted, setShowSorted] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: runsData } = await supabase.from('workflow_runs').select('*').order('started_at', { ascending: false }).limit(20);

        let totalSearch = 0;
        let totalCrawled = 0;
        const allJobs: Job[] = [];

        if (runsData) {
          setWorkflowHistory(runsData);

          runsData.forEach(run => {
            if (Array.isArray(run.search_results)) totalSearch += run.search_results.length;
            if (Array.isArray(run.crawled_pages)) totalCrawled += run.crawled_pages.length;

            // Collect jobs from sorted_jobs (prioritized) or extracted_jobs
            if (run.sorted_jobs && Array.isArray(run.sorted_jobs)) {
              allJobs.push(...run.sorted_jobs);
            } else if (run.extracted_jobs && Array.isArray(run.extracted_jobs)) {
              allJobs.push(...run.extracted_jobs);
            }
          });
        }

        setStats(prev => ({
          ...prev,
          totalSearchResults: totalSearch || prev.totalSearchResults,
          pagesCrawled: totalCrawled || prev.pagesCrawled,
          jobsExtracted: allJobs.length || prev.jobsExtracted,
          finalJobs: allJobs.length || prev.finalJobs,
          duplicatesRemoved: prev.duplicatesRemoved,
          crawlMethods: prev.crawlMethods
        }));

        // Set real recent jobs from workflow runs
        if (allJobs.length > 0) {
          setRecentJobs(allJobs);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsLoadingJobs(false);
      }
    };
    fetchData();
  }, []);

  // Step details for summary cards
  const stepDetails: Record<string, string> = {
    search: 'URLs found via APIs',
    crawl: 'Pages processed',
    scrape: 'Jobs extracted',
    sort: 'Ranked by relevance',
    cv: 'Tailored resumes'
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              AI Training Jobs Scraper — Kenya Focus
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder='Search query (e.g., "AI training" jobs Kenya)'
              className="w-80"
              defaultValue='"AI training" jobs Kenya'
              id="dashboard-search-input"
            />
            <Button
              onClick={() => {
                const input = document.getElementById('dashboard-search-input') as HTMLInputElement;
                const searchQuery = input?.value || '"AI training" jobs Kenya';
                navigate('/search', { state: { query: searchQuery } });
              }}
              variant="outline"
              size="lg"
            >
              <Search className="w-5 h-5 mr-2" />
              Search
            </Button>
            <Button onClick={handleAutomate} disabled={isAutomating} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isAutomating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {isAutomating ? 'Running...' : 'Automate'}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Search Results"
            value={stats.totalSearchResults}
            icon={Search}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            label="Pages Crawled"
            value={stats.pagesCrawled}
            icon={Globe}
          />
          <StatCard
            label="Jobs Extracted"
            value={stats.jobsExtracted}
            icon={FileText}
          />
          <StatCard
            label="Final Jobs"
            value={stats.finalJobs}
            icon={Briefcase}
            trend={{ value: 25, isPositive: true }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflow Flowchart */}
          <div className="lg:col-span-1">
            <WorkflowProgress
              steps={mockWorkflowSteps}
              onStepClick={handleStepClick}
            />
          </div>

          {/* Step Summaries */}
          <div className="lg:col-span-2">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold mb-4">Step Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {mockWorkflowSteps.map((step) => (
                  <StepSummaryCard
                    key={step.id}
                    step={step}
                    detail={stepDetails[step.id]}
                    onClick={() => handleStepClick(step.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Jobs Table */}
        <div className="glass-panel overflow-hidden">
          <div
            className="p-4 border-b border-border/50 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => setShowRecent(!showRecent)}
          >
            <div>
              <h3 className="text-lg font-semibold">Recent Jobs Found</h3>
              <p className="text-sm text-muted-foreground">
                {recentJobs.length || mockJobs.length} AI training positions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {recentJobs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/sort', { state: { jobs: recentJobs } });
                    toast.success(`Loading ${recentJobs.length} jobs to sort`);
                  }}
                >
                  <Briefcase className="w-3 h-3 mr-1" />
                  View & Sort
                </Button>
              )}
              <ChevronRight className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                showRecent && "rotate-90"
              )} />
            </div>
          </div>

          {showRecent && (
            <div className="animate-fade-in">
              {isLoadingJobs ? (
                <div className="p-12 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-muted-foreground">Loading recent jobs...</p>
                </div>
              ) : (
                <RecentJobsTable
                  jobs={recentJobs.length > 0 ? recentJobs : mockJobs}
                  onSelectJob={handleSelectJob}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
