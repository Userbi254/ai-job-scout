import { Job, SearchResult, CrawlResult, WorkflowStep, ScraperStats } from '@/types/job';

export const mockJobs: Job[] = [
  {
    id: '1',
    job_name: 'AI Data Annotation Specialist',
    company: 'Sama',
    employment_details: ['Remote', 'Full-time'],
    payment_method: 'Monthly Bank Transfer',
    amount: '$800-1200/month',
    starting_date: 'Immediate',
    skills_needed: ['English Fluency', 'Attention to Detail', 'Basic Computer Skills', 'Data Entry'],
    requirements: ['High school diploma', '1+ year experience in data entry', 'Reliable internet connection'],
    deadline: '2026-02-15',
    application_url: 'https://sama.com/careers/annotation-specialist',
    site_url: 'https://sama.com/careers',
    relevance_score: 95,
    scraped_at: '2026-01-12T10:30:00Z'
  },
  {
    id: '2',
    job_name: 'RLHF Training Data Evaluator',
    company: 'Scale AI',
    employment_details: ['Remote', 'Contract'],
    payment_method: 'Per Task',
    amount: '$15-25/hour',
    starting_date: '2026-02-01',
    skills_needed: ['Critical Thinking', 'Writing Skills', 'Research Ability', 'AI/ML Knowledge'],
    requirements: ["Bachelor's degree preferred", 'Experience with AI systems', 'Strong analytical skills'],
    deadline: '2026-01-31',
    application_url: 'https://scale.com/careers/rlhf-evaluator',
    site_url: 'https://scale.com/careers',
    relevance_score: 92,
    scraped_at: '2026-01-12T10:35:00Z'
  },
  {
    id: '3',
    job_name: 'AI Content Moderator',
    company: 'Appen',
    employment_details: ['Hybrid', 'Part-time'],
    payment_method: 'Weekly PayPal',
    amount: '$10-18/hour',
    starting_date: 'Flexible',
    skills_needed: ['Content Review', 'Language Skills', 'Cultural Awareness', 'Quick Decision Making'],
    requirements: ['18+ years old', 'Ability to handle sensitive content', 'Consistent availability'],
    deadline: '2026-02-28',
    application_url: 'https://appen.com/jobs/moderator-kenya',
    site_url: 'https://appen.com/jobs',
    relevance_score: 88,
    scraped_at: '2026-01-12T10:40:00Z'
  },
  {
    id: '4',
    job_name: 'Prompt Engineering Trainer',
    company: 'Outlier AI',
    employment_details: ['Remote', 'Freelance'],
    payment_method: 'Per Project',
    amount: '$20-40/hour',
    starting_date: 'Immediate',
    skills_needed: ['Prompt Engineering', 'LLM Understanding', 'Technical Writing', 'Python Basics'],
    requirements: ['Experience with ChatGPT/Claude', 'Portfolio of prompts', 'Strong communication'],
    deadline: null,
    application_url: 'https://outlier.ai/apply',
    site_url: 'https://outlier.ai',
    relevance_score: 90,
    scraped_at: '2026-01-12T10:45:00Z'
  },
  {
    id: '5',
    job_name: 'Machine Learning Data Labeler',
    company: 'Remotasks',
    employment_details: ['Remote', 'Flexible Hours'],
    payment_method: 'Weekly',
    amount: '$5-15/hour',
    starting_date: 'Immediate',
    skills_needed: ['Image Annotation', 'Video Labeling', 'Text Classification', 'Bounding Box Drawing'],
    requirements: ['No experience required', 'Training provided', 'Computer with internet'],
    deadline: 'Open',
    application_url: 'https://remotasks.com/signup',
    site_url: 'https://remotasks.com',
    relevance_score: 85,
    scraped_at: '2026-01-12T10:50:00Z'
  }
];

export const mockSearchResults: SearchResult[] = [
  { url: 'https://sama.com/careers', title: 'Sama Careers - AI Training Jobs Kenya', status: 'scraped' },
  { url: 'https://scale.com/careers', title: 'Scale AI - RLHF Positions', status: 'scraped' },
  { url: 'https://appen.com/jobs', title: 'Appen Job Opportunities Africa', status: 'scraped' },
  { url: 'https://outlier.ai', title: 'Outlier AI - Remote AI Training', status: 'scraped' },
  { url: 'https://remotasks.com', title: 'Remotasks - Data Labeling Jobs', status: 'scraped' },
  { url: 'https://clickworker.com/kenya', title: 'Clickworker Kenya Opportunities', status: 'crawled' },
  { url: 'https://toloka.ai/jobs', title: 'Toloka Crowdsourcing Platform', status: 'pending' },
  { url: 'https://dataloop.ai/careers', title: 'Dataloop AI Annotation Jobs', status: 'failed' },
];

export const mockCrawlResults: CrawlResult[] = [
  { url: 'https://sama.com/careers', text_length: 15420, num_links: 34, method: 'beautifulsoup', status: 'success' },
  { url: 'https://scale.com/careers', text_length: 22150, num_links: 56, method: 'selenium', status: 'success' },
  { url: 'https://appen.com/jobs', text_length: 18900, num_links: 42, method: 'firecrawl', status: 'success' },
  { url: 'https://outlier.ai', text_length: 12300, num_links: 28, method: 'beautifulsoup', status: 'success' },
  { url: 'https://remotasks.com', text_length: 9800, num_links: 21, method: 'firecrawl', status: 'success' },
  { url: 'https://clickworker.com/kenya', text_length: 8500, num_links: 19, method: 'selenium', status: 'success' },
];

export const mockWorkflowSteps: WorkflowStep[] = [
  { id: 'search', name: 'Search', description: 'Finding AI training job URLs', status: 'completed', progress: 100, count: 8 },
  { id: 'crawl', name: 'Crawl & Scrape', description: 'Deep content collection', status: 'completed', progress: 100, count: 6 },
  { id: 'extract', name: 'Extract', description: 'Parsing job details with AI', status: 'completed', progress: 100, count: 5 },
  { id: 'sort', name: 'Sort', description: 'Ranking by relevance', status: 'completed', progress: 100, count: 5 },
  { id: 'cv', name: 'Generate CV', description: 'Create tailored resume', status: 'pending', progress: 0 },
];

export const mockStats: ScraperStats = {
  totalSearchResults: 10,
  pagesCrawled: 6,
  jobsExtracted: 8,
  duplicatesRemoved: 3,
  finalJobs: 5,
  crawlMethods: {
    beautifulsoup: 2,
    firecrawl: 2,
    selenium: 2
  }
};

export const aiTrainingKeywords = [
  'ai training', 'ai trainer', 'data annotation', 'data labeling',
  'ai tutor', 'ai evaluator', 'ml training', 'prompt engineering',
  'rlhf', 'annotation specialist', 'ai rater', 'search evaluator'
];
