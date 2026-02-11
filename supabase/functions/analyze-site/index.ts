import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShipReady/1.0; +https://shipready.dev)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    // Validate URL
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (url.length > 2048) {
      return new Response(JSON.stringify({ error: 'URL is too long' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidUrl(url)) {
      return new Response(JSON.stringify({ error: 'Invalid URL. Please provide a valid http or https URL.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Block private/internal IPs
    const hostname = new URL(url).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      return new Response(JSON.stringify({ error: 'Cannot audit internal/private URLs' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching URL:', url);

    // Fetch the site HTML with timeout
    let siteResp: Response;
    try {
      siteResp = await fetchWithTimeout(url, 15000);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return new Response(JSON.stringify({ error: 'The site took too long to respond. Please try again.' }), {
          status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: `Could not reach the site: ${e instanceof Error ? e.message : 'Unknown error'}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!siteResp.ok) {
      return new Response(JSON.stringify({ error: `Site returned HTTP ${siteResp.status}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await siteResp.text();
    const truncatedHtml = html.slice(0, 60000);

    console.log('HTML fetched, length:', html.length, 'truncated to:', truncatedHtml.length);

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a GTM (Go-To-Market) readiness auditor for developer tool companies. You will analyze the HTML content of a website and produce a structured audit across 10 dimensions.

For each category, assign a rating:
- "present_clear" = Present & Clear (the site does this well)
- "present_weak" = Present but Weak (attempted but insufficient)  
- "missing" = Missing (not found)

Score: Each "present_clear" = 10 points, "present_weak" = 5 points, "missing" = 0 points. Sum all 10 categories for overall_score (0-100).

The 10 categories are:
1. Positioning & Messaging - Clear product description, target persona, problem solved, urgency, differentiator
2. Value Prop & Outcomes - Concrete outcome statements with metrics, scenarios, pain vs gain
3. Target Personas & Use Cases - Content for developers, CTOs, compliance; use case pages; persona navigation
4. Product & Feature Clarity - Architecture explanation, stack fit, features, code snippets, product visuals
5. Pricing & Plans - Visible, simple, developer-friendly, free tier, clear upgrade path
6. Design Partner / Early Access - Beta program CTA, partner benefits, expectations, urgency/scarcity
7. Social Proof & Credibility - Founder credentials, customer logos, testimonials, investors, open source
8. Conversion Paths & CTAs - Clear primary CTA, secondary CTA, placement, specificity, no dead ends
9. Content, SEO & Readability - Meta tags, heading structure, keywords, blog, readability, performance
10. Trust, Security & Compliance - Security page, certifications, privacy policy, data residency, status page

You MUST respond with valid JSON only (no markdown, no code fences). The JSON must match this schema:
{
  "overall_score": number,
  "working_well": ["string", ...], // 3-5 things the site does well
  "categories": [
    {
      "category": "Category Name",
      "rating": "present_clear" | "present_weak" | "missing",
      "summary": "One-line summary",
      "found": ["what was found..."],
      "missing": ["what's missing..."],
      "recommendations": ["actionable suggestions..."],
      "priority": "Quick Win" | "Important" | "Nice to Have"
    }
  ]
}

Be thorough, specific, and constructive. Reference actual content you find on the page.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze the following website HTML for the URL: ${url}\n\n${truncatedHtml}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    // Parse the JSON response
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Content:', content.slice(0, 500));
      throw new Error('Failed to parse AI response');
    }

    const result = {
      url,
      overall_score: parsed.overall_score || 0,
      working_well: parsed.working_well || [],
      categories: parsed.categories || [],
    };

    // Save to database using service role
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { data: insertedAudit, error: dbError } = await supabase
        .from('audits')
        .insert({
          url: result.url,
          overall_score: result.overall_score,
          working_well: result.working_well,
          categories: result.categories,
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('DB insert error:', dbError);
      } else {
        (result as any).id = insertedAudit.id;
        console.log('Audit saved with ID:', insertedAudit.id);
      }
    } catch (dbErr) {
      console.error('DB save failed:', dbErr);
      // Don't fail the request if DB save fails
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('analyze-site error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
