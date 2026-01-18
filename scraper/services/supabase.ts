/**
 * Supabase Service - Database integration for saving jobs
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ExtractedJob } from './gemini.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 */
export function getSupabaseClient(): SupabaseClient | null {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
        return null;
    }

    if (!supabase) {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    return supabase;
}

/**
 * Save extracted jobs to Supabase
 */
export async function saveJobs(jobs: ExtractedJob[]): Promise<{ success: boolean; inserted: number; error?: string }> {
    const client = getSupabaseClient();

    if (!client) {
        return { success: false, inserted: 0, error: 'Supabase client not configured' };
    }

    if (jobs.length === 0) {
        return { success: true, inserted: 0 };
    }

    try {
        console.log(`[Supabase] Saving ${jobs.length} jobs...`);

        // Transform jobs to match database schema
        const jobsToInsert = jobs.map(job => ({
            job_name: job.job_name,
            company: job.company,
            description: job.description,
            amount: job.amount,
            location: job.location,
            employment_details: job.employment_details,
            requirements: job.requirements,
            skills_needed: job.skills_needed,
            site_url: job.site_url,
            application_url: job.application_url,
            deadline: job.deadline,
            starting_date: job.starting_date,
            payment_method: job.payment_method,
            created_at: new Date().toISOString()
        }));

        const { data, error } = await client
            .from('extracted_jobs')
            .insert(jobsToInsert)
            .select();

        if (error) {
            console.error('[Supabase] Insert error:', error);
            return { success: false, inserted: 0, error: error.message };
        }

        console.log(`[Supabase] Successfully saved ${data?.length || 0} jobs`);
        return { success: true, inserted: data?.length || 0 };
    } catch (error: any) {
        console.error('[Supabase] Exception:', error);
        return { success: false, inserted: 0, error: error.message };
    }
}

/**
 * Save a workflow run to track crawl/extract history
 */
export async function saveWorkflowRun(data: {
    status: string;
    crawled_pages?: any[];
    extracted_jobs?: any[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
    const client = getSupabaseClient();

    if (!client) {
        return { success: false, error: 'Supabase client not configured' };
    }

    try {
        const { data: result, error } = await client
            .from('workflow_runs')
            .insert({
                status: data.status,
                started_at: new Date().toISOString(),
                crawled_pages: data.crawled_pages || null,
                extracted_jobs: data.extracted_jobs || null
            })
            .select('id')
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, id: result?.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
