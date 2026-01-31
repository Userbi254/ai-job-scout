import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function callOpenRouter(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');

  console.log('OpenRouter API Key present:', !!apiKey);
  console.log('OpenRouter API Key length:', apiKey?.length || 0);

  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not configured');
    return null;
  }

  try {
    console.log('Calling OpenRouter API for CV generation...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'CV Generator',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('OpenRouter returned empty content');
      return null;
    }

    console.log('OpenRouter response received, length:', content.length);
    return content;
  } catch (error) {
    console.error('OpenRouter exception:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userProfile, job, template } = await req.json();

    console.log('Received Request:');
    console.log('- User Profile Name:', userProfile?.full_name);
    console.log('- Job Object:', JSON.stringify(job, null, 2));
    console.log('- Template:', template?.name);

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
  },
  "optimization_report": [
    {
      "field": "Field Name",
      "change": "Description of change",
      "reason": "Reason for change"
    }
  ]
}

Make the content professional, action-oriented, and tailored to the target job if provided.

CRITICAL FIELD PRESERVATION RULES:
1. **PRESERVE ENTRY COUNTS**: Return EXACTLY ${userProfile.experience?.length || 0} experience entries (same number as input). Do NOT add or remove entries.
2. **PRESERVE ALL EXISTING EDUCATION**: The following education entries MUST be included EXACTLY as provided:
   ${JSON.stringify(userProfile.education || [], null, 2)}
   - Keep degree names, institution names, and years EXACTLY as shown
   - DO NOT modify, remove, or reorder these existing entries
   - You may ADD new courses/certifications with dates AFTER 2024 at the END of the education array
3. **MODIFY ONLY THESE FIELDS**:
   - Professional Summary (COMPLETELY REWRITE from scratch for THIS specific job)
   - Skills (REORDER to prioritize job-relevant skills, add new relevant ones)
   - Experience descriptions/achievements (COMPLETELY REWRITE to emphasize job-relevant impact)
4. **DO NOT MODIFY**:
   - Contact information (name, email, phone, location, URLs)
   - Number of experience entries
   - **EXISTING EDUCATION ENTRIES**: Keep Degree, Institution, and Year EXACTLY as provided. Do NOT change them.
   - Job titles or company names in experience

CRITICAL CONTENT REWRITING RULES:
1. **AGGRESSIVE REWRITE**: Do NOT just tweak existing text. FORGET the original phrasing. Write entirely NEW content from scratch that fits the target job.
2. **PROFESSIONAL SUMMARY**: Write a brand new 2-3 sentence summary that positions the candidate perfectly for THIS specific target job. Make it compelling and unique. Tailor it to highlight relevant experience and skills for THIS role.
3. **SKILLS**: Reorder skills to prioritize those matching the job requirements. Add relevant skills from the job description that the candidate can reasonably claim based on their experience. Remove generic or irrelevant skills.
4. **EXPERIENCE DESCRIPTIONS**: For EACH experience entry, write entirely NEW achievement-focused bullet points that:
   - Show quantifiable impact and results (infer reasonable metrics if needed based on the role)
   - Use strong action verbs (Led, Achieved, Implemented, Optimized, Supervised, Developed, etc.)
   - Highlight skills and responsibilities relevant to THIS target job
   - Demonstrate value delivered to the company
   - Are tailored to emphasize the most relevant aspects for THIS role
5. **VARY SENTENCE STRUCTURE**: Do NOT start every bullet point with the same verb or structure. Use diverse action verbs and sentence patterns.
6. **NO EM DASHES**: Avoid using em dashes (—) or excessive punctuation. Use clear, direct sentences.
7. **NO TIMESTAMPS**: Do not add any timestamps, metadata, or extra fields not in the schema.
8. **UNIQUE PHRASING**: Avoid generic phrases like "responsible for" or "worked on". Be specific and impactful.
9. **ATS OPTIMIZED**: Naturally incorporate keywords from the job description throughout the content.
10. **OPTIMIZATION REPORT**: You MUST include an "optimization_report" array in the JSON response. For each significant change (e.g., rewriting summary, adding a skill, rewriting an experience bullet), add an object: { "field": "Field Name", "change": "Brief description of change", "reason": "Why this improves fit for the target job" }.
11. **NEW EDUCATION ONLY AFTER 2024**: If adding NEW courses or certifications relevant to the target job, ensure their dates are AFTER 2024 (the candidate's latest degree year). Place them at the END of the education array, AFTER the three existing entries.

IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON object.
`;

    console.log('Generating CV for:', userProfile.full_name);

    const content = await callOpenRouter(prompt);

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned empty response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('RAW OPENROUTER RESPONSE:', content.substring(0, 500));

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
        version: "2.0-openrouter",
        data: cvContent,
        raw_content: content
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
