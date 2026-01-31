import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function callOpenRouter(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('CV_OPENROUTER_API_KEY');

  if (!apiKey) {
    console.error('CV_OPENROUTER_API_KEY not configured');
    return null;
  }

  try {
    console.log('Calling OpenRouter API...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'CV Parser'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log('OpenRouter response received');
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('OpenRouter exception:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let cvText: string;
    try {
      const body = await req.json();
      cvText = body.cvText;
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body. Expected { "cvText": "..." }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cvText || typeof cvText !== 'string' || cvText.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'CV text is required and must be at least 50 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are an expert CV/Resume parser. Your task is to:
1. DETERMINE if the provided text is a valid CV/Resume.
2. EXTRACT structured data if it is a CV.

CV TEXT:
${cvText.substring(0, 15000)}

STRICT OUTPUT FORMAT (JSON ONLY):
{
  "is_cv": boolean,
  "confidence_score": number,
  "validation_message": "Valid CV" or "Reason why it is not a CV",
  "full_name": "Inferred Full Name",
  "email": "email@example.com",
  "phone": "Phone number (if multiple, list primary)",
  "location": "City, Country",
  "linkedin_url": "URL",
  "portfolio_url": "URL",
  "summary": "Professional summary",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "period": "Start - End",
      "description": "Key achievements"
    }
  ],
  "education": [
    {
      "degree": "Degree",
      "institution": "University",
      "year": "Year (e.g., 2024)"
    }
  ]
}

CRITICAL EXTRACTION RULES:
1. **FULL NAME**: The full name is almost ALWAYS the very first line of the text. Extract it even if it's not labeled "Name".
2. **CONTACT INFO**: Look for "Tel:", "Phone:", "Email:", "LinkedIn:". If multiple phone numbers exist (e.g., "+254... / +254..."), extract the first one.
3. **EDUCATION**: Scan the ENTIRE text for keywords like "Bachelor", "Master", "Diploma", "Certificate", "KCSE", "KCPE". Extract the Degree, Institution, and Year.
   - **Dates**: Extract the END year (e.g., "Sept 2020 – Oct 2024" -> "2024").
4. **SKILLS**: If a "Technical Competencies" or "Skills" section exists, extract them. If not, infer from experience.
5. **CHRONOLOGY**: Ensure education and experience are listed.
6. **NO MARKDOWN**: Return raw JSON only.
`;

    console.log('Parsing CV text of length:', cvText.length);

    const content = await callOpenRouter(prompt);

    if (!content) {
      console.error('Empty response from OpenRouter');
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned empty response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reliable JSON extraction using regex
    let parsedData: Record<string, unknown> = {};
    try {
      // Match the first complete JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try parsing the whole content
        const cleaned = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        parsedData = JSON.parse(cleaned);
      }
    } catch (e) {
      console.error('JSON parsing error:', e, 'Content:', content.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response as JSON' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('CV parsed successfully, is_cv:', parsedData.is_cv);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error parsing CV:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unexpected error parsing CV' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
