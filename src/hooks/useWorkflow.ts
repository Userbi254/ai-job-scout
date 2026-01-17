import { useState, useCallback } from 'react';
import { workflowApi, SearchResult, CrawledPage, Job, WorkflowRun } from '@/lib/api/workflow';
import { useToast } from '@/hooks/use-toast';

export type WorkflowStep = 'idle' | 'searching' | 'crawling' | 'scraping' | 'sorting' | 'completed' | 'failed';

export interface WorkflowState {
  step: WorkflowStep;
  searchResults: SearchResult[];
  crawledPages: CrawledPage[];
  extractedJobs: Job[];
  sortedJobs: Job[];
  currentUrl: string;
  progress: number;
  error: string | null;
  workflowRunId: string | null;
}

const initialState: WorkflowState = {
  step: 'idle',
  searchResults: [],
  crawledPages: [],
  extractedJobs: [],
  sortedJobs: [],
  currentUrl: '',
  progress: 0,
  error: null,
  workflowRunId: null,
};

export function useWorkflow() {
  const { toast } = useToast();
  const [state, setState] = useState<WorkflowState>(initialState);
  const [isRunning, setIsRunning] = useState(false);

  const updateState = (updates: Partial<WorkflowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const runWorkflow = useCallback(async (query: string, location: string, limit = 5) => {
    setIsRunning(true);
    updateState({ ...initialState, step: 'searching' });

    try {
      // Create workflow run
      const runResult = await workflowApi.createWorkflowRun(query, location);
      if (runResult.success && runResult.data) {
        updateState({ workflowRunId: runResult.data.id });
      }

      // Step 1: Search
      toast({ title: 'Searching...', description: 'Finding AI training job listings' });
      const searchResult = await workflowApi.search(query, location, limit);
      
      if (!searchResult.success || !searchResult.data?.length) {
        throw new Error(searchResult.error || 'No search results found');
      }
      
      const searchResults = searchResult.data;
      updateState({ 
        searchResults, 
        step: 'crawling',
        progress: 20 
      });

      // Step 2: Crawl each URL
      toast({ title: 'Crawling...', description: `Processing ${searchResults.length} pages` });
      const crawledPages: CrawledPage[] = [];
      
      for (let i = 0; i < searchResults.length; i++) {
        const url = searchResults[i].url;
        updateState({ currentUrl: url, progress: 20 + (i / searchResults.length) * 30 });
        
        const crawlResult = await workflowApi.crawlPage(url);
        if (crawlResult.success && crawlResult.data) {
          crawledPages.push(crawlResult.data);
        }
        
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      }
      
      updateState({ crawledPages, step: 'scraping', progress: 50 });

      // Step 3: Extract jobs from each page
      toast({ title: 'Extracting...', description: 'Analyzing page content for jobs' });
      const allJobs: Job[] = [];
      
      for (let i = 0; i < crawledPages.length; i++) {
        const page = crawledPages[i];
        updateState({ currentUrl: page.url, progress: 50 + (i / crawledPages.length) * 30 });
        
        const extractResult = await workflowApi.extractJobs(page.text, page.url);
        if (extractResult.success && extractResult.data) {
          allJobs.push(...extractResult.data);
        }
        
        // Delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
      }
      
      updateState({ extractedJobs: allJobs, step: 'sorting', progress: 80 });

      // Step 4: Sort and deduplicate (client-side, no rate limits)
      toast({ title: 'Sorting...', description: 'Ranking jobs by relevance' });
      const sortedJobs = workflowApi.sortJobs(allJobs);
      
      updateState({ sortedJobs, progress: 90 });

      // Step 5: Save to database
      if (sortedJobs.length > 0) {
        await workflowApi.saveJobs(sortedJobs);
      }

      // Update workflow run
      if (state.workflowRunId) {
        await workflowApi.updateWorkflowRun(state.workflowRunId, {
          status: 'completed',
          search_results: searchResults as any,
          crawled_pages: crawledPages as any,
          extracted_jobs: allJobs as any,
          sorted_jobs: sortedJobs as any,
          completed_at: new Date().toISOString(),
        });
      }

      updateState({ step: 'completed', progress: 100 });
      toast({ 
        title: 'Workflow Complete!', 
        description: `Found ${sortedJobs.length} AI training jobs` 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Workflow failed';
      updateState({ step: 'failed', error: errorMessage });
      toast({ 
        title: 'Workflow Failed', 
        description: errorMessage,
        variant: 'destructive' 
      });

      // Update workflow run with error
      if (state.workflowRunId) {
        await workflowApi.updateWorkflowRun(state.workflowRunId, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    } finally {
      setIsRunning(false);
    }
  }, [toast, state.workflowRunId]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    isRunning,
    runWorkflow,
    reset,
  };
}
