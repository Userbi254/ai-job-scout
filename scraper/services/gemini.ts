/**
 * Gemini Extraction Service - AI-powered job extraction
 * Improved with stricter job title recognition and comprehensive field extraction
 */

// Gemini API model list with versions
const GEMINI_MODELS = [
    { name: 'gemini-2.0-flash', version: 'v1beta' },
    { name: 'gemini-flash-latest', version: 'v1beta' },
    { name: 'gemini-pro-latest', version: 'v1beta' },
    { name: 'gemini-2.0-flash-lite-preview-02-05', version: 'v1beta' }
];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export interface ExtractedJob {
    job_name: string;
    company: string | null;
    description: string;
    amount: string | null;
    location: string | null;
    employment_details: string[];
    requirements: string[];
    skills_needed: string[];
    site_url: string;
    application_url: string | null;
    deadline: string | null;
    starting_date: string | null;
    payment_method: string | null;
}

type LogFn = (msg: string) => void;

/**
 * Call Gemini API with model rotation for fallback
 */
async function callGemini(prompt: string, log: LogFn): Promise<string | null> {
    if (!GEMINI_API_KEY) {
        log('[Gemini] No API key configured');
        return null;
    }

    log(`[Gemini] API key present: ${GEMINI_API_KEY.substring(0, 10)}...`);

    for (const modelConfig of GEMINI_MODELS) {
        const { name, version } = modelConfig;
        try {
            log(`[Gemini] Trying ${name} (${version})...`);

            const apiUrl = `https://generativelanguage.googleapis.com/${version}/models/${name}:generateContent?key=${GEMINI_API_KEY}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    log(`[Gemini] ✅ Success with ${name} - got ${text.length} chars`);
                    return text;
                } else {
                    log(`[Gemini] Empty response from ${name}`);
                }
            } else {
                // Log the error response for debugging
                const errorBody = await response.text();
                log(`[Gemini] ❌ Error ${response.status} on ${name}: ${errorBody.substring(0, 200)}`);

                if (response.status === 429) {
                    log(`[Gemini] Rate limited, trying next...`);
                } else if (response.status === 404) {
                    log(`[Gemini] Model not found, trying next...`);
                }
                continue;
            }
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            log(`[Gemini] Exception on ${name}: ${errMsg}`);
            continue;
        }
    }

    log('[Gemini] All models failed');
    return null;
}

/**
 * STRICT filter to reject non-job titles
 * Returns TRUE if the string is NOT a valid job title
 */
function isNotAJob(title: string): boolean {
    const t = title.toLowerCase().trim();

    // Too short or too long
    if (t.length < 8 || t.length > 120) return true;

    // Contains URLs or markdown
    if (/https?:\/\/|\.com|\.org|\.io|\.app|\[.*\]\(.*\)/.test(t)) return true;

    // Single word without job keywords - reject
    if (!/\s/.test(t)) {
        if (!/engineer|developer|analyst|specialist|manager|lead|designer|trainer|evaluator|annotator|writer|coordinator|assistant|associate|intern|consultant|architect|administrator|operator|technician/i.test(t)) {
            return true;
        }
    }

    // STRICTLY REJECT these patterns (common false positives)
    const strictReject = [
        // Navigation and UI elements
        /^(home|about|contact|careers|jobs|login|sign|search|find|discover|explore|view|see|show|read|learn|get|join|apply|subscribe)/i,

        // Marketing phrases
        /^(earn money|make money|be a part|become a|why choose|what we|how to|our |the |a |an )/i,
        /\b(press and media|awards|mission|vision|values|culture|benefits|perks)\b/i,

        // Categories and filters
        /^(remote|full.?time|part.?time|contract|freelance|internship|temporary)$/i,
        /jobs? (in|for|at|near|around)/i,

        // Generic phrases that aren't job titles
        /^(work from|working from|working with|working for|work with|work for)/i,
        /^(trusted|verified|certified|official|original|authentic)/i,
        /^(comprehensive|competitive|generous|flexible|professional|excellent)/i,
        /^(health|retirement|vacation|fitness|salary|insurance|dental|vision)/i,

        // Action words that start phrases
        /^(building|drive|enable|ensure|empower|create|transform|innovate|leading)/i,

        // Things that look like headlines
        /^(featured|popular|trending|new|latest|top|best|hot)/i,

        // Single action verbs
        /^(submit|upload|download|register|continue|next|back|cancel|close)/i,

        // Price/benefit mentions
        /\$\d|usd|salary|benefits package|compensation/i,

        // Social/company info
        /linkedin|twitter|facebook|instagram|youtube|follow us/i,

        // Footer/legal
        /privacy|terms|copyright|all rights|cookie/i,
    ];

    if (strictReject.some(p => p.test(t))) return true;

    // MUST contain at least one job-related keyword
    const jobKeywords = [
        'engineer', 'developer', 'analyst', 'specialist', 'manager', 'lead', 'senior', 'junior',
        'designer', 'trainer', 'evaluator', 'annotator', 'writer', 'editor', 'coordinator',
        'assistant', 'associate', 'intern', 'consultant', 'architect', 'administrator',
        'operator', 'technician', 'scientist', 'researcher', 'director', 'head', 'chief',
        'officer', 'supervisor', 'representative', 'agent', 'executive', 'professional',
        'data', 'software', 'ai', 'ml', 'machine learning', 'annotation', 'labeling',
        'quality', 'assurance', 'qa', 'support', 'customer', 'sales', 'marketing',
        'content', 'product', 'project', 'program', 'operations', 'hr', 'human resources',
        'finance', 'accounting', 'legal', 'compliance', 'security', 'network', 'cloud',
        'devops', 'sre', 'backend', 'frontend', 'fullstack', 'mobile', 'web', 'api',
        'rater', 'reviewer', 'moderator', 'tester', 'translator', 'transcriber'
    ];

    const hasJobKeyword = jobKeywords.some(kw => t.includes(kw));
    if (!hasJobKeyword) return true;

    return false;
}

/**
 * Extract jobs from page content using Gemini
 */
export async function extractWithGemini(content: string, pageUrl: string, log: LogFn = console.log): Promise<ExtractedJob[]> {
    const prompt = `You are an expert job listing parser. Your task is to extract ONLY real, specific job positions from this webpage content.

## CRITICAL RULES:

### WHAT IS A VALID JOB:
- Has a SPECIFIC job title like "Senior Data Annotator", "AI Training Specialist", "Machine Learning Engineer"
- Is an actual position someone can APPLY FOR with a company
- Contains professional role terminology (Developer, Analyst, Manager, Specialist, etc.)

### WHAT IS NOT A JOB (REJECT THESE):
- Generic phrases: "Earn Money", "Be a Part of AI", "Work from Home"  
- Navigation links: "Press and Media", "About Us", "Contact", "Careers"
- Company sections: "Our Values", "Benefits", "Culture", "Mission"
- Categories: "Remote Jobs in Kenya", "Find Your Dream Job"
- Marketing text: "Join Our Team", "Discover Opportunities"
- Generic labels: "Full-time", "Remote", "Contract" (these are job TYPES, not jobs)

## EXTRACTION FORMAT:
For each VALID job position, extract ALL available information:

{
  "title": "EXACT job title as written (e.g., 'Senior Data Annotation Specialist')",
  "company": "Company name hiring for this role (REQUIRED - look for company mentions nearby)",
  "description": "What this job entails - responsibilities and duties",
  "salary": "Pay/compensation (e.g., '$20-25/hour', 'KES 50,000/month', or null)",
  "location": "Where the job is based (city/country) or 'Remote' or 'Hybrid'",
  "employment_type": ["Full-time", "Part-time", "Contract", "Remote", "Freelance"],
  "skills": ["Required technical skills", "e.g., Python", "Data Labeling", "AI/ML knowledge"],
  "requirements": ["Years of experience", "Education requirements", "Certifications"],
  "application_url": "Direct URL to apply if found in the content",
  "deadline": "Application closing date if mentioned",
  "start_date": "When the position starts if mentioned",
  "payment_method": "How workers are paid (hourly, monthly, per task, etc.)"
}

## EXAMPLES OF GOOD EXTRACTIONS:

Input: "Data Annotation Specialist at Sama - Remote, Kenya. We're looking for detail-oriented annotators to label AI training data. Requirements: Fluent English, attention to detail. Pay: $10-15/hour. Apply by Jan 30."

Output:
{
  "title": "Data Annotation Specialist",
  "company": "Sama",
  "description": "Label AI training data with attention to detail",
  "salary": "$10-15/hour",
  "location": "Remote, Kenya",
  "employment_type": ["Remote", "Full-time"],
  "skills": ["Data annotation", "AI training data labeling"],
  "requirements": ["Fluent English", "Attention to detail"],
  "deadline": "January 30",
  "payment_method": "Hourly"
}

## NOW PARSE THIS CONTENT:
URL: ${pageUrl}

---
${content.substring(0, 20000)}
---

Return a JSON array of extracted jobs. If NO valid job positions are found, return exactly: []

IMPORTANT: 
- Only include REAL job titles with professional role terminology
- Include company name for every job (critical for user to know who is hiring)
- Extract ALL fields that are available in the content
- If information is not available, use null (not empty string)

JSON response only:`;

    const response = await callGemini(prompt, log);
    if (!response) return [];

    try {
        let json = response.trim();

        // Extract JSON from markdown code blocks if present
        if (json.includes('```')) {
            const m = json.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (m) json = m[1];
        }
        json = json.trim();

        // Find the JSON array
        const start = json.indexOf('[');
        const end = json.lastIndexOf(']');
        if (start >= 0 && end > start) {
            json = json.substring(start, end + 1);
        }

        const jobs = JSON.parse(json);
        if (!Array.isArray(jobs)) {
            log('[Gemini] Response was not an array');
            return [];
        }

        log(`[Gemini] Parsed ${jobs.length} raw jobs, filtering...`);

        const filtered = jobs
            .filter((j: Record<string, unknown>) => {
                const title = String(j.title || j.job_name || '').trim();
                if (!title || title.length < 8) {
                    log(`[Gemini] Rejected (too short): "${title}"`);
                    return false;
                }
                if (isNotAJob(title)) {
                    log(`[Gemini] Rejected (not a job): "${title}"`);
                    return false;
                }
                return true;
            })
            .map((j: Record<string, unknown>): ExtractedJob => ({
                job_name: String(j.title || j.job_name || ''),
                company: j.company ? String(j.company) : null,
                description: String(j.description || ''),
                amount: j.salary || j.pay || j.compensation ? String(j.salary || j.pay || j.compensation) : null,
                location: j.location ? String(j.location) : null,
                employment_details: Array.isArray(j.employment_type)
                    ? j.employment_type.map(String)
                    : (j.employment_type ? [String(j.employment_type)] : []),
                requirements: Array.isArray(j.requirements) ? j.requirements.map(String) : [],
                skills_needed: Array.isArray(j.skills) ? j.skills.map(String) : [],
                site_url: pageUrl,
                application_url: j.application_url || j.apply_url ? String(j.application_url || j.apply_url) : null,
                deadline: j.deadline || j.closing_date ? String(j.deadline || j.closing_date) : null,
                starting_date: j.start_date || j.starting_date ? String(j.start_date || j.starting_date) : null,
                payment_method: j.payment_method || j.payment_type ? String(j.payment_method || j.payment_type) : null
            }));

        log(`[Gemini] Final: ${filtered.length} valid jobs after filtering`);
        return filtered;
    } catch (e) {
        log(`[Gemini] JSON parse failed: ${e}`);
        return [];
    }
}

/**
 * Extract jobs from himalayas.app markdown links
 */
export function extractFromHimalayas(text: string, pageUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    const seen = new Set<string>();

    // Pattern for himalayas job links
    const pattern = /\[([^\]]+)\]\(https:\/\/himalayas\.app\/companies\/([^/]+)\/jobs\/([^)]+)\)/g;
    let m;

    while ((m = pattern.exec(text)) !== null) {
        const title = m[1].trim();
        const companySlug = m[2];
        const company = companySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const jobSlug = m[3];

        if (seen.has(title.toLowerCase())) continue;
        if (isNotAJob(title)) continue;

        seen.add(title.toLowerCase());

        jobs.push({
            job_name: title,
            company: company,
            description: '',
            amount: null,
            location: 'Remote',
            employment_details: ['Remote'],
            requirements: [],
            skills_needed: [],
            site_url: pageUrl,
            application_url: `https://himalayas.app/companies/${companySlug}/jobs/${jobSlug}`,
            deadline: null,
            starting_date: null,
            payment_method: null
        });
    }

    return jobs;
}
