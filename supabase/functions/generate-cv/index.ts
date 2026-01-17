import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini Model Pool for Rotation
const GEMINI_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
  'gemini-pro'
];

let lastModelIndex = -1;

async function callGeminiAPI(model: string, prompt: string, temperature = 0.7): Promise<string | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY') || "AIzaSyDH_9mThDBEQOcJyHa1wNYQNdXvNNm51zM";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature }
        })
      }
    );

    if (!response.ok) {
      console.error(`${model} error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error(`${model} exception:`, error);
    return null;
  }
}

async function generateWithRetry(prompt: string, temperature = 0.7): Promise<string> {
  for (let attempt = 0; attempt < GEMINI_MODELS.length; attempt++) {
    lastModelIndex = (lastModelIndex + 1) % GEMINI_MODELS.length;
    const model = GEMINI_MODELS[lastModelIndex];

    console.log(`Trying model: ${model}`);
    const result = await callGeminiAPI(model, prompt, temperature);

    if (result) {
      console.log(`Success with ${model}`);
      return result;
    }
  }

  return '{}';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userProfile, job, template } = await req.json();

    if (!userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobContext = job ? `
TARGET JOB:
- Title: ${job.job_name}
- Company: ${job.company || 'Not specified'}
- Required Skills: ${job.skills_needed?.join(', ') || 'Not specified'}
- Requirements: ${job.requirements?.join(', ') || 'Not specified'}
` : '';

    const prompt = `Generate a professional CV/resume content tailored for this candidate.

USER PROFILE:
- Name: ${userProfile.full_name || 'Not provided'}
- Email: ${userProfile.email || 'Not provided'}
- Phone: ${userProfile.phone || 'Not provided'}
- Location: ${userProfile.location || 'Not provided'}
- LinkedIn: ${userProfile.linkedin_url || 'Not provided'}
- Portfolio: ${userProfile.portfolio_url || 'Not provided'}
- Skills: ${userProfile.skills?.join(', ') || 'Not provided'}
- Summary: ${userProfile.summary || 'Not provided'}
- Experience: ${JSON.stringify(userProfile.experience || [])}
- Education: ${JSON.stringify(userProfile.education || [])}
- Certifications: ${userProfile.certifications?.join(', ') || 'Not provided'}

${jobContext}

TEMPLATE STYLE: ${template?.name || 'Professional'}

Generate a JSON object with these sections:
{
  "summary": "A compelling 2-3 sentence professional summary tailored to the job if provided",
  "skills": ["skill1", "skill2", ...], // Prioritized skills relevant to the job
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "period": "Start - End",
      "achievements": ["Achievement 1", "Achievement 2", ...]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name",
      "year": "Year"
    }
  ],
  "certifications": ["Cert 1", "Cert 2", ...],
  "contact": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "Phone",
    "location": "Location",
    "linkedin": "LinkedIn URL",
    "portfolio": "Portfolio URL"
  }
}

Make the content professional, action-oriented, and tailored to the target job if provided.

CRITICAL FIELD PRESERVATION RULES:
1. **PRESERVE ENTRY COUNTS**: Return EXACTLY ${userProfile.experience?.length || 0} experience entries (same number as input). Do NOT add or remove entries.
2. **PRESERVE EDUCATION ENTRIES**: Include ALL existing education entries. You may ADD new relevant certifications/education AFTER existing ones, but NEVER remove or reduce the count.
3. **MODIFY ONLY THESE FIELDS**:
   - Professional Summary (COMPLETELY REWRITE from scratch for job fit)
   - Skills (REORDER and PRIORITIZE for job, add relevant ones)
   - Experience descriptions/achievements (COMPLETELY REWRITE to show impact)
4. **DO NOT MODIFY**:
   - Contact information (name, email, phone, location, URLs)
   - Number of experience entries
   - Core education degrees/institutions/years
   - Job titles or company names in experience

CRITICAL CONTENT REWRITING RULES:
1. **COMPLETE REWRITE**: Do NOT just tweak existing text. COMPLETELY REWRITE the professional summary, skills list, and ALL experience descriptions from scratch.
2. **PROFESSIONAL SUMMARY**: Write a brand new 2-3 sentence summary that positions the candidate perfectly for the target job. Make it compelling and unique.
3. **EXPERIENCE DESCRIPTIONS**: For EACH experience entry, write entirely NEW achievement-focused bullet points that:
   - Show quantifiable impact and results
   - Use strong action verbs (Led, Achieved, Implemented, Optimized, etc.)
   - Highlight skills relevant to the target job
   - Demonstrate value delivered to the company
4. **VARY SENTENCE STRUCTURE**: Do NOT start every bullet point with the same verb or structure. Use diverse action verbs and sentence patterns.
5. **NO EM DASHES**: Avoid using em dashes (—) or excessive punctuation. Use clear, direct sentences.
6. **NO TIMESTAMPS**: Do not add any timestamps, metadata, or extra fields not in the schema.
7. **UNIQUE PHRASING**: Avoid generic phrases like "responsible for" or "worked on". Be specific and impactful.
8. **ATS OPTIMIZED**: Naturally incorporate keywords from the job description throughout the content.
9. **CHRONOLOGICAL CONSISTENCY**: If adding NEW education or certifications relevant to the target job, ensure their dates are AFTER the candidate's latest existing education. For example, if they graduated in 2024, new certs should be late 2024 or 2025.
`;

    console.log('Generating CV for:', userProfile.full_name);

    const content = await generateWithRetry(prompt, 0.7);

    // Parse JSON from response
    let cvContent: Record<string, unknown> = {};
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();

      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}') + 1;

      if (startIdx !== -1 && endIdx > 0) {
        cvContent = JSON.parse(jsonStr.substring(startIdx, endIdx));
      }
    } catch (e) {
      console.error('JSON parsing error:', e);
      cvContent = { error: 'Failed to parse generated content' };
    }

    console.log('CV generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: cvContent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating CV:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to generate CV' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
