import { Job } from '@/types/job';

// Keywords with weights for scoring
const KEYWORD_WEIGHTS: Record<string, number> = {
  'ai training': 15,
  'data annotation': 15,
  'data labeling': 15,
  'rlhf': 12,
  'prompt engineering': 12,
  'ai evaluator': 10,
  'ai tutor': 10,
  'machine learning': 8,
  'content moderation': 8,
  'annotation specialist': 10,
  'labeling specialist': 10,
  'search evaluator': 8,
  'chatbot trainer': 10,
  'ai rater': 10,
  'human feedback': 10,
  'training data': 8,
  'remote': 5,
  'flexible': 3,
  'immediate': 3,
};

// Field completeness weights
const FIELD_WEIGHTS: Record<string, number> = {
  job_name: 10,
  company: 8,
  amount: 12,
  payment_method: 5,
  application_url: 10,
  deadline: 5,
  skills_needed: 8,
  requirements: 6,
  employment_details: 5,
  starting_date: 3,
};

// Known reputable companies
const REPUTABLE_COMPANIES = [
  'sama', 'scale ai', 'appen', 'remotasks', 'clickworker',
  'toloka', 'outlier', 'dataloop', 'labelbox', 'hive',
  'anthropic', 'openai', 'google', 'meta', 'microsoft'
];

/**
 * Calculate relevance score for a job without using AI
 * This is a deterministic scoring algorithm that replaces Gemini sorting
 */
export function calculateRelevanceScore(job: Job): number {
  let score = 0;

  // 1. Keyword matching (0-60 points)
  const searchText = [
    job.job_name,
    ...(job.skills_needed || []),
    ...(job.requirements || []),
    ...(job.employment_details || [])
  ].join(' ').toLowerCase();

  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (searchText.includes(keyword)) {
      score += weight;
    }
  }

  // Cap keyword score at 60
  const keywordScore = Math.min(score, 60);
  score = keywordScore;

  // 2. Field completeness (0-25 points)
  let fieldScore = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const value = job[field as keyof Job];
    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      fieldScore += weight;
    }
  }
  // Normalize to 25 points max
  fieldScore = (fieldScore / Object.values(FIELD_WEIGHTS).reduce((a, b) => a + b, 0)) * 25;
  score += fieldScore;

  // 3. Company reputation (0-10 points)
  if (job.company) {
    const companyLower = job.company.toLowerCase();
    if (REPUTABLE_COMPANIES.some(c => companyLower.includes(c))) {
      score += 10;
    }
  }

  // 4. Salary transparency bonus (0-5 points)
  if (job.amount) {
    const amountLower = job.amount.toLowerCase();
    // Higher bonus for higher pay ranges
    if (amountLower.includes('20') || amountLower.includes('25') || amountLower.includes('30')) {
      score += 5;
    } else if (amountLower.includes('15') || amountLower.includes('18')) {
      score += 4;
    } else if (amountLower.includes('10') || amountLower.includes('12')) {
      score += 3;
    } else {
      score += 2;
    }
  }

  // Normalize to 0-100
  return Math.min(Math.round(score), 100);
}

/**
 * Sort jobs by relevance score (no AI required)
 */
export function sortJobsByRelevance(jobs: Job[]): Job[] {
  // Calculate scores for all jobs
  const scoredJobs = jobs.map(job => ({
    ...job,
    relevance_score: calculateRelevanceScore(job)
  }));

  // Sort by score descending
  return scoredJobs.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
}

/**
 * Filter jobs by minimum relevance score
 */
export function filterByRelevance(jobs: Job[], minScore: number = 50): Job[] {
  return jobs.filter(job => (job.relevance_score || 0) >= minScore);
}

/**
 * Get relevance breakdown for a job (for UI display)
 */
export function getRelevanceBreakdown(job: Job): {
  keywords: number;
  completeness: number;
  reputation: number;
  salary: number;
  total: number;
} {
  let keywords = 0;
  let completeness = 0;
  let reputation = 0;
  let salary = 0;

  const searchText = [
    job.job_name,
    ...(job.skills_needed || []),
    ...(job.requirements || []),
    ...(job.employment_details || [])
  ].join(' ').toLowerCase();

  // Keywords
  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (searchText.includes(keyword)) {
      keywords += weight;
    }
  }
  keywords = Math.min(keywords, 60);

  // Completeness
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const value = job[field as keyof Job];
    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      completeness += weight;
    }
  }
  completeness = Math.round((completeness / Object.values(FIELD_WEIGHTS).reduce((a, b) => a + b, 0)) * 25);

  // Reputation
  if (job.company) {
    const companyLower = job.company.toLowerCase();
    if (REPUTABLE_COMPANIES.some(c => companyLower.includes(c))) {
      reputation = 10;
    }
  }

  // Salary
  if (job.amount) {
    const amountLower = job.amount.toLowerCase();
    if (amountLower.includes('20') || amountLower.includes('25') || amountLower.includes('30')) {
      salary = 5;
    } else if (amountLower.includes('15') || amountLower.includes('18')) {
      salary = 4;
    } else if (amountLower.includes('10') || amountLower.includes('12')) {
      salary = 3;
    } else {
      salary = 2;
    }
  }

  return {
    keywords,
    completeness,
    reputation,
    salary,
    total: Math.min(keywords + completeness + reputation + salary, 100)
  };
}
