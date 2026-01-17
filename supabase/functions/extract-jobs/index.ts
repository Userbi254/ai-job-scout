import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini model variants for rotation
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro'
];

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');

interface ExtractedJob {
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

// Call Gemini with model rotation
async function callGemini(prompt: string, log: (msg: string) => void): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    log('No Gemini API key');
    return null;
  }

  for (const model of GEMINI_MODELS) {
    try {
      log(`Trying ${model}...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 8192 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          log(`Success: ${model}`);
          return text;
        }
      } else if (response.status === 429) {
        log(`Rate limited: ${model}`);
        continue;
      } else {
        log(`Error ${response.status}: ${model}`);
        continue;
      }
    } catch (e) {
      log(`Exception: ${model}`);
      continue;
    }
  }
  return null;
}

// Comprehensive Gemini extraction
async function extractWithGemini(content: string, pageUrl: string, log: (msg: string) => void): Promise<ExtractedJob[]> {

  const prompt = `You are an intelligent job-posting extractor. Your role is to identify and extract only genuine, actionable job openings by interpreting intent and context, not by relying on fixed keywords alone.

CRITICAL RULE: Only extract actual job positions that someone can APPLY for. A valid job has a specific title (e.g., "Senior Software Engineer", "Data Analyst").

REJECT these (they are NOT jobs):
- Page sections: "What We Do", "Our Values", "Careers", "About Us"
- Benefits/perks: "Health insurance", "Competitive salary", "Paid vacation"
- Navigation: "Find jobs", "DISCOVER MORE", "Apply now" (alone)
- Marketing: "Find your dream job", "Sign up", "Get started"
- Categories: "Remote jobs in Kenya", "AI Training jobs"
- Questions, FAQ items, company slogans

INTERPRETATION GUIDELINES:
- Derive skills and requirements from responsibilities, expectations, or qualifications sections - not labels alone
- Sections like "What You'll Need", "What We're Looking For", "Must Have", "Nice to Have" contain requirements
- Sections like "Responsibilities", "What You'll Do", "Your Role" describe the job
- Treat bullet points, paragraphs, and tables equally as sources of information
- If multiple jobs are present on the same page, evaluate and extract each independently
- Do not guess or fabricate missing details - use null if truly not found

For EACH valid job, extract ALL available fields:

{
  "title": "Exact job title",
  "company": "Company name (or null)",
  "description": "What the role does - summarize responsibilities",
  "salary": "Compensation (look for: $XX,XXX, $XX-$XX/hour, Ksh XXX, XXX USD/month/year)",
  "location": "Work location or 'Remote'",
  "employment_type": ["Full-time", "Part-time", "Contract", "Remote", "Freelance"],
  "deadline": "Application deadline (look for: 'Apply by', 'Closes on', 'Deadline')",
  "start_date": "When job starts",
  "payment_method": "How pay works (hourly, monthly, per task, project-based)",
  "skills": ["Extract from requirements, qualifications, or 'nice to have' sections"],
  "requirements": ["Extract from 'What You'll Need', 'Requirements', 'Qualifications', 'Must have'"],
  "experience": "Years of experience if mentioned",
  "education": "Degree requirements if mentioned",
  "application_url": "URL to apply if found"
}

EXTRACTION HINTS:
- Salary patterns: $50,000, $50,000-$80,000, $20-30/hr, $5k/month, Ksh 100,000, 50k-80k USD
- Requirements often appear after: "Requirements:", "What you'll need:", "Qualifications:", "Must have:", "What You'll Need:"
- Skills appear in: technical stacks, tools, languages, frameworks, software mentioned
- Location: city names, "Remote", "Hybrid", country codes, "Based in [location]"
- Deadline: dates near "apply by", "closing date", "deadline", "applications close"
- Experience: "X+ years", "X-Y years experience", "Entry level", "Senior level"
- Education: "Bachelor's", "Master's", "Degree in", "Diploma"

Return a JSON array. If NO valid jobs, return [].

Content from ${pageUrl}:
${content.substring(0, 15000)}

JSON response only:`;

  const response = await callGemini(prompt, log);
  if (!response) return [];

  try {
    let json = response.trim();
    if (json.includes('```')) {
      const m = json.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) json = m[1];
    }
    json = json.trim();

    const start = json.indexOf('[');
    const end = json.lastIndexOf(']');
    if (start >= 0 && end > start) {
      json = json.substring(start, end + 1);
    }

    const jobs = JSON.parse(json);
    if (!Array.isArray(jobs)) return [];

    return jobs
      .filter((j: any) => {
        const title = (j.title || j.job_name || '').trim();
        if (!title || title.length < 5) return false;
        if (isNotAJob(title)) return false;
        return true;
      })
      .map((j: any) => ({
        job_name: j.title || j.job_name,
        company: j.company || null,
        description: j.description || '',
        amount: j.salary || j.pay || j.compensation || null,
        location: j.location || null,
        employment_details: Array.isArray(j.employment_type) ? j.employment_type :
          (j.employment_type ? [j.employment_type] : []),
        requirements: Array.isArray(j.requirements) ? j.requirements : [],
        skills_needed: Array.isArray(j.skills) ? j.skills : [],
        site_url: pageUrl,
        application_url: j.application_url || j.apply_url || null,
        deadline: j.deadline || j.closing_date || null,
        starting_date: j.start_date || j.starting_date || null,
        payment_method: j.payment_method || j.payment_type || null
      }));
  } catch (e) {
    log(`JSON parse failed: ${e}`);
    return [];
  }
}

// Strict filter for non-job titles
function isNotAJob(title: string): boolean {
  const t = title.toLowerCase().trim();

  if (t.length < 5 || t.length > 100) return true;
  if (/https?:\/\/|\.com|\.org|\[.*\]\(.*\)/.test(t)) return true;
  if (!/\s/.test(t) && !/engineer|developer|analyst|specialist|manager|lead|designer|trainer|evaluator/i.test(t)) return true;

  const exclude = [
    /^find (your |the |a )?dream/,
    /^search (remote |for )?jobs/,
    /^(remote|full.?time|part.?time|contract)$/,
    /^discover more/,
    /^(what|how|why|who|where|when|can i|do i)/,
    /^(our |the |a )?(values|mission|team|culture|awards|locations|impact|commitment)/,
    /^(about|contact|careers|general|home|info|tags|login|sign)/,
    /^(comprehensive|competitive|generous|flexible|professional)/,
    /^(join|made|with|we are|building|drive|enable|ensure|empower)/,
    /^(health|retirement|vacation|fitness|salary|benefits)/,
    /job(s)? in (kenya|india|usa)/,
    /jobs? on naukri/,
    /profile views/,
    /get \d+x/,
    /apply to \d+/,
    /remote.*workers/,
    /find.*talent/,
    /hire.*employees/,
    /freelanc/,
    /autonomous driving/,
    /agricultural tech/,
    /computer vision.*natural language/,
    /retail.*ecommerce/,
    /defense tech/,
    /precision agriculture/,
    /cultural heritage/,
    /\*\*.*\*\*/,
    /^\*\*\d+[mk]?\+?\*\*$/,
    /internet explorer/,
    /sorry,/,
    /no longer active/,
    /→$/,
    /trusted services/,
    /made on fiverr/,
    /high.?quality/,
    /data labeling teams/,
    /worldwide job seekers/,
  ];

  return exclude.some(p => p.test(t));
}

// Extract from himalayas.app links with context parsing
function extractFromHimalayas(text: string, pageUrl: string, log: (msg: string) => void): ExtractedJob[] {
  log('Extracting from himalayas.app links...');

  const jobs: ExtractedJob[] = [];
  const seen = new Set<string>();

  const pattern = /\[([^\]]+)\]\(https:\/\/himalayas\.app\/companies\/([^/]+)\/jobs\/([^)]+)\)/g;
  let m;

  while ((m = pattern.exec(text)) !== null) {
    const title = m[1].trim();
    const company = m[2].replace(/-/g, ' ');
    const jobSlug = m[3];

    if (seen.has(title.toLowerCase())) continue;
    if (isNotAJob(title)) continue;

    seen.add(title.toLowerCase());

    // Get more context - look for salary, employment type, etc.
    const ctxStart = Math.max(0, m.index - 300);
    const ctxEnd = Math.min(text.length, m.index + 800);
    const ctx = text.substring(ctxStart, ctxEnd);

    // Extract employment details
    const emp: string[] = [];
    if (/full.?time/i.test(ctx)) emp.push('Full-time');
    if (/part.?time/i.test(ctx)) emp.push('Part-time');
    if (/contract/i.test(ctx)) emp.push('Contract');
    if (/remote/i.test(ctx)) emp.push('Remote');
    if (/freelance/i.test(ctx)) emp.push('Freelance');

    // Extract salary
    let salary: string | null = null;
    const salaryMatch = ctx.match(/Salary:?\s*([\d,]+[k]?(?:\s*[-–]\s*[\d,]+[k]?)?)\s*USD/i) ||
      ctx.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\s*\/\s*(?:hr|hour|mo|month|yr|year))?/i) ||
      ctx.match(/(?:Ksh|KES)\s*[\d,]+/i);
    if (salaryMatch) salary = salaryMatch[0];

    // Extract location
    let location: string | null = null;
    const locMatch = ctx.match(/(?:Location|Based in|only)[:.]?\s*([A-Z][a-z]+(?:[,\s]+[A-Z][a-z]+)?)/i);
    if (locMatch) location = locMatch[1];

    // Extract skills from context
    const skills: string[] = [];
    const skillsSection = ctx.match(/(?:Skills|Requirements|Qualifications)[:\s]*([\s\S]*?)(?:\n\n|$)/i);
    if (skillsSection) {
      const bullets = skillsSection[1].match(/[-•]\s*([^\n]+)/g);
      if (bullets) {
        bullets.slice(0, 5).forEach(b => {
          const skill = b.replace(/^[-•]\s*/, '').trim();
          if (skill.length > 3 && skill.length < 100) skills.push(skill);
        });
      }
    }

    jobs.push({
      job_name: title,
      company: company,
      description: '',
      amount: salary,
      location: location,
      employment_details: emp,
      requirements: [],
      skills_needed: skills,
      site_url: pageUrl,
      application_url: `https://himalayas.app/companies/${m[2]}/jobs/${jobSlug}`,
      deadline: null,
      starting_date: null,
      payment_method: null
    });
  }

  log(`Found ${jobs.length} himalayas jobs`);
  return jobs;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ success: true, message: 'Extract Jobs v4 (Full Details)' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const logs: string[] = [];
    const log = (msg: string) => { console.log(msg); logs.push(msg); };

    const bodyText = await req.text();
    let pageContent: string, pageUrl: string;

    try {
      const body = JSON.parse(bodyText);
      pageContent = body.pageContent;
      pageUrl = body.pageUrl || 'unknown';
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pageContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log(`URL: ${pageUrl}, Length: ${pageContent.length}`);

    let jobs: ExtractedJob[] = [];
    let provider = 'None';

    // Strategy 1: Try Gemini first for full details
    if (GEMINI_API_KEY) {
      log('Trying Gemini for full extraction...');
      const geminiJobs = await extractWithGemini(pageContent, pageUrl, log);
      if (geminiJobs.length > 0) {
        jobs = geminiJobs;
        provider = 'Gemini';
      }
    }

    // Strategy 2: Extract from himalayas.app links as fallback
    if (jobs.length === 0) {
      const himalayasJobs = extractFromHimalayas(pageContent, pageUrl, log);
      if (himalayasJobs.length > 0) {
        jobs = himalayasJobs;
        provider = 'Himalayas';
      }
    }

    // Dedupe by job name
    const unique = new Map<string, ExtractedJob>();
    for (const job of jobs) {
      const key = job.job_name.toLowerCase();
      if (!unique.has(key)) unique.set(key, job);
    }

    const final = Array.from(unique.values());
    log(`Final: ${final.length} jobs via ${provider}`);

    return new Response(
      JSON.stringify({ success: true, data: final, total: final.length, provider, logs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
