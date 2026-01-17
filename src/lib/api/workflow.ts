import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface SearchResult {
  url: string;
  title: string;
  description?: string;
}

export interface CrawledPage {
  url: string;
  text: string;
  textLength: number;
  links: string[];
  metadata?: Record<string, unknown>;
}

export interface Job {
  id?: string;
  job_name: string;
  company: string | null;
  employment_details: string[];
  payment_method: string | null;
  amount: string | null;
  starting_date: string | null;
  skills_needed: string[];
  requirements: string[];
  deadline: string | null;
  application_url: string | null;
  site_url: string;
  relevance_score?: number;
}

export interface WorkflowRun {
  id: string;
  status: 'pending' | 'searching' | 'crawling' | 'scraping' | 'sorting' | 'completed' | 'failed';
  query: string;
  location: string;
  search_results: SearchResult[];
  crawled_pages: CrawledPage[];
  extracted_jobs: Job[];
  sorted_jobs: Job[];
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

// Relevance scoring (moved from Python to TypeScript)
const AI_TRAINING_KEYWORDS = [
  'ai training', 'ai trainer', 'data annotation', 'data labeling', 'data labelling',
  'ai tutor', 'ai evaluator', 'ml training', 'machine learning training',
  'prompt engineering', 'rlhf', 'reinforcement learning', 'human feedback',
  'annotation specialist', 'labeling specialist', 'ai data', 'training data',
  'ai rater', 'search evaluator', 'chatbot trainer', 'content moderator',
  'ai writing', 'content quality', 'language model'
];

const KNOWN_COMPANIES = [
  'scale ai', 'appen', 'remotasks', 'telus', 'lionbridge', 'dataannotation',
  'outlier', 'invisible technologies', 'sama', 'hive', 'labelbox'
];

function calculateRelevanceScore(job: Job): number {
  let score = 0;
  const combinedText = `${job.job_name} ${job.company || ''} ${job.skills_needed?.join(' ') || ''} ${job.requirements?.join(' ') || ''}`.toLowerCase();
  
  // Keyword matching (up to 60 points)
  for (const keyword of AI_TRAINING_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      score += 10;
    }
  }
  score = Math.min(score, 60);
  
  // Field completeness (up to 25 points)
  if (job.company) score += 5;
  if (job.amount) score += 5;
  if (job.skills_needed?.length > 0) score += 5;
  if (job.requirements?.length > 0) score += 5;
  if (job.application_url) score += 5;
  
  // Known company bonus (up to 10 points)
  const companyLower = (job.company || '').toLowerCase();
  if (KNOWN_COMPANIES.some(c => companyLower.includes(c))) {
    score += 10;
  }
  
  // Salary transparency bonus (5 points)
  if (job.amount && job.amount !== 'null') {
    score += 5;
  }
  
  return score;
}

function sortJobsByRelevance(jobs: Job[]): Job[] {
  return jobs
    .map(job => ({ ...job, relevance_score: calculateRelevanceScore(job) }))
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
}

// Deduplication
function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const norm1 = normalize(text1);
  const norm2 = normalize(text2);
  
  if (!norm1 || !norm2) return 0;
  
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return union > 0 ? intersection / union : 0;
}

function deduplicateJobs(jobs: Job[]): Job[] {
  const unique: Job[] = [];
  
  for (const job of jobs) {
    const isDuplicate = unique.some(existing => {
      const nameSimilarity = calculateSimilarity(job.job_name, existing.job_name);
      if (nameSimilarity >= 0.8) {
        if (job.company && existing.company) {
          return calculateSimilarity(job.company, existing.company) >= 0.7;
        }
        return true;
      }
      return false;
    });
    
    if (!isDuplicate) {
      unique.push(job);
    }
  }
  
  return unique;
}

export const workflowApi = {
  // Search for jobs
  async search(query: string, location: string, limit = 10): Promise<{ success: boolean; data?: SearchResult[]; error?: string }> {
    const { data, error } = await supabase.functions.invoke('search-jobs', {
      body: { query, location, limit },
    });
    
    if (error) {
      console.error('Search error:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  },
  
  // Crawl a single page
  async crawlPage(url: string): Promise<{ success: boolean; data?: CrawledPage; error?: string }> {
    const { data, error } = await supabase.functions.invoke('crawl-page', {
      body: { url },
    });
    
    if (error) {
      console.error('Crawl error:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  },
  
  // Extract jobs from page content
  async extractJobs(pageContent: string, pageUrl: string): Promise<{ success: boolean; data?: Job[]; error?: string }> {
    const { data, error } = await supabase.functions.invoke('extract-jobs', {
      body: { pageContent, pageUrl },
    });
    
    if (error) {
      console.error('Extract error:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  },
  
  // Sort jobs by relevance (client-side, no rate limits)
  sortJobs(jobs: Job[]): Job[] {
    const deduplicated = deduplicateJobs(jobs);
    return sortJobsByRelevance(deduplicated);
  },
  
  // Save jobs to database
  async saveJobs(jobs: Job[]): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('jobs').upsert(
      jobs.map(job => ({
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
        site_url: job.site_url,
        relevance_score: job.relevance_score || 0,
      })),
      { onConflict: 'id' }
    );
    
    if (error) {
      console.error('Save error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  },
  
  // Get all jobs from database
  async getJobs(): Promise<{ success: boolean; data?: Job[]; error?: string }> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .order('relevance_score', { ascending: false });
    
    if (error) {
      console.error('Fetch error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data as unknown as Job[] };
  },
  
  // Create workflow run
  async createWorkflowRun(query: string, location: string): Promise<{ success: boolean; data?: WorkflowRun; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('workflow_runs')
      .insert({
        user_id: user?.id || null,
        query,
        location,
        status: 'pending',
      })
      .select()
      .single();
    
    if (error) {
      console.error('Create run error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data as unknown as WorkflowRun };
  },
  
  // Update workflow run
  async updateWorkflowRun(id: string, updates: Partial<WorkflowRun>): Promise<{ success: boolean; error?: string }> {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.error_message) dbUpdates.error_message = updates.error_message;
    if (updates.completed_at) dbUpdates.completed_at = updates.completed_at;
    if (updates.search_results) dbUpdates.search_results = updates.search_results as unknown as Json;
    if (updates.crawled_pages) dbUpdates.crawled_pages = updates.crawled_pages as unknown as Json;
    if (updates.extracted_jobs) dbUpdates.extracted_jobs = updates.extracted_jobs as unknown as Json;
    if (updates.sorted_jobs) dbUpdates.sorted_jobs = updates.sorted_jobs as unknown as Json;
    
    const { error } = await supabase
      .from('workflow_runs')
      .update(dbUpdates)
      .eq('id', id);
    
    if (error) {
      console.error('Update run error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  },
  
  // Get latest workflow run
  async getLatestWorkflowRun(): Promise<{ success: boolean; data?: WorkflowRun; error?: string }> {
    const { data, error } = await supabase
      .from('workflow_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Fetch run error:', error);
      return { success: false, error: error.message };
    }
    
    if (!data) {
      return { success: true, data: undefined };
    }
    
    return { 
      success: true, 
      data: {
        ...data,
        search_results: (data.search_results || []) as unknown as SearchResult[],
        crawled_pages: (data.crawled_pages || []) as unknown as CrawledPage[],
        extracted_jobs: (data.extracted_jobs || []) as unknown as Job[],
        sorted_jobs: (data.sorted_jobs || []) as unknown as Job[],
      } as WorkflowRun
    };
  },
};
