const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching URL:', url);

    // Fetch the site HTML
    const siteResp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShipReady/1.0; +https://shipready.dev)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!siteResp.ok) {
      return new Response(JSON.stringify({ error: `Could not fetch site: ${siteResp.status}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await siteResp.text();
    
    // Truncate HTML for the LLM (keep first ~60k chars)
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
}`;

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

    // Parse the JSON response (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Content:', content.slice(0, 500));
      throw new Error('Failed to parse AI response');
    }

    // Return the result with the URL
    const result = {
      url,
      overall_score: parsed.overall_score,
      working_well: parsed.working_well || [],
      categories: parsed.categories || [],
    };

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
