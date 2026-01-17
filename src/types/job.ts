export interface Job {
  id: string;
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
  scraped_at?: string;
}

export interface SearchResult {
  url: string;
  title: string;
  status: 'pending' | 'crawled' | 'scraped' | 'failed';
}

export interface CrawlResult {
  url: string;
  text_length: number;
  num_links: number;
  method: 'beautifulsoup' | 'firecrawl' | 'selenium';
  status: 'success' | 'failed';
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress: number;
  count?: number;
}

export interface CVData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
    description: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  selectedJob?: Job;
}

export interface ScraperStats {
  totalSearchResults: number;
  pagesCrawled: number;
  jobsExtracted: number;
  duplicatesRemoved: number;
  finalJobs: number;
  crawlMethods: {
    beautifulsoup: number;
    firecrawl: number;
    selenium: number;
  };
}
