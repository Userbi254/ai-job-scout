import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Job-related keywords for relevance scoring
const JOB_KEYWORDS = [
    'engineer', 'developer', 'manager', 'analyst', 'specialist', 'coordinator',
    'assistant', 'director', 'lead', 'senior', 'junior', 'intern', 'trainer',
    'annotator', 'labeler', 'moderator', 'evaluator', 'data', 'ai', 'ml',
    'annotation', 'labeling', 'training', 'content', 'remote', 'full-time'
];

const PREMIUM_COMPANIES = [
    'sama', 'scale ai', 'appen', 'outlier', 'remotasks', 'lionbridge',
    'telus', 'welocalize', 'transperfect', 'pactera', 'labeled', 'dataloop',
    'google', 'microsoft', 'amazon', 'meta', 'openai', 'anthropic'
];

function calculateRelevanceScore(job: Record<string, unknown>): number {
    let score = 0;
    const jobName = (job.job_name as string || '').toLowerCase();
    const description = (job.description as string || '').toLowerCase();
    const skills = (job.skills_needed as string[] || []).join(' ').toLowerCase();
    const reqs = (job.requirements as string[] || []).join(' ').toLowerCase();
    const company = (job.company as string || '').toLowerCase();
    const combinedText = `${jobName} ${description} ${skills} ${reqs}`;

    // Job keyword matches (40 points max)
    const keywordMatches = JOB_KEYWORDS.filter(kw => combinedText.includes(kw)).length;
    score += Math.min(keywordMatches * 4, 40);

    // Completeness (35 points max)
    if (job.job_name) score += 5;
    if (job.company && job.company !== 'Unknown' && job.company !== 'Unknown (Heuristic)') score += 5;
    if (job.amount) score += 5;
    if (job.description && (job.description as string).length > 50) score += 5;
    if (job.location) score += 5;
    if ((job.skills_needed as string[] || []).length > 0) score += 5;
    if ((job.requirements as string[] || []).length > 0) score += 5;

    // Company Reputation (15 points max)
    const isPremiumCompany = PREMIUM_COMPANIES.some(pc => company.includes(pc));
    if (isPremiumCompany) score += 15;

    // Employment details (10 points max)
    const empDetails = (job.employment_details as string[] || []);
    if (empDetails.length > 0) score += 5;
    if (empDetails.some(d => d.toLowerCase().includes('remote'))) score += 5;

    return Math.min(score, 100);
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (req.method === 'GET') {
        return new Response(
            JSON.stringify({ success: true, message: 'Sort Jobs Function is running' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        const { jobs, sortBy = 'relevance' } = await req.json();

        if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
            return new Response(
                JSON.stringify({ success: false, error: 'Jobs array is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Sorting ${jobs.length} jobs by ${sortBy}...`);

        // Calculate relevance score for each job
        const jobsWithScores = jobs.map((job: Record<string, unknown>) => ({
            ...job,
            relevance_score: calculateRelevanceScore(job)
        }));

        // Sort based on criteria
        let sortedJobs;
        if (sortBy === 'relevance') {
            sortedJobs = jobsWithScores.sort((a, b) =>
                (b.relevance_score as number) - (a.relevance_score as number)
            );
        } else if (sortBy === 'company') {
            sortedJobs = jobsWithScores.sort((a, b) =>
                ((a.company as string) || '').localeCompare((b.company as string) || '')
            );
        } else if (sortBy === 'title') {
            sortedJobs = jobsWithScores.sort((a, b) =>
                ((a.job_name as string) || '').localeCompare((b.job_name as string) || '')
            );
        } else {
            sortedJobs = jobsWithScores;
        }

        console.log(`Sorted ${sortedJobs.length} jobs successfully`);
        console.log(`Top job score: ${sortedJobs[0]?.relevance_score || 0}%`);

        return new Response(
            JSON.stringify({
                success: true,
                data: sortedJobs,
                provider: 'Algorithmic Scoring',
                sortedBy: sortBy
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error sorting jobs:', error);
        return new Response(
            JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to sort jobs' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
