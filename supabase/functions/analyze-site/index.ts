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

CRITICAL SCORING PRINCIPLES — apply these across ALL categories:

PROBLEM-LED MESSAGING: The homepage must lead with the developer's pain, NOT the product. The goal is a "head-nodding" reaction — "they get it." Look for three pressing pain points front and center. Penalize sites that lead with "How It Works" or a product demo instead of articulating the problem.

SPECIFIC PROOF: Every claim needs a named user, a real number, and a company. Example of excellence: "8x faster builds from 2 hrs to 15 mins" with attribution to a specific person at a specific company. Assertions alone are worth zero. A demo is the weakest proof; a specific attributed testimonial is the strongest. Penalize vague claims.

THREE-PART STORY STRUCTURE: Check if the homepage follows: (1) the inciting event — what change is making developers' lives worse (the villain), (2) obstacles the hero (developer, not the product) overcomes with help from the wise advisor (the product), (3) results achieved as customer testimonials showing transformation.

INTEGRATION LOGOS: Developers assume their environment is unique. They need to see at once that the product plays nicely with whatever they already use. Look for a visible grid of integration/partner logos.

NO PUFFERY: Flag any use of "better," "best-in-class," or unsubstantiated claims. If the site says "faster," it must say HOW MUCH faster and back it with a user quote. Vague language = lost credibility. Confusion robs trust.

SOCIAL PROOF FROM RECOGNIZABLE COMPANIES: Look for testimonials from developers at companies people have heard of (Uber, Airbnb, Meta, Cisco, etc). All quotes from one unknown company = weak. Anonymous case studies are fine but the ratio should be 2 attributed for every 1 anonymous.

WEEKEND EVALUATION PATH: An alpha dev will try the product on a Saturday with a burner email. By Sunday night it either works or it doesn't. Check for a clear, frictionless path from landing page to working product without needing to talk to anyone.

SELL THE CATEGORY, NOT THE PRODUCT: The site should talk about the pain the category solves, share results, discuss market context. Let users sell the product through their own words. Penalize heavy product-first selling that triggers developer defenses.

DEVELOPER LANGUAGE: The words on the site should sound like what developers actually say when describing their problems — not marketing-speak, not MBA vocabulary. Look for authentic, specific, technical language.

For each category, assign a rating:
- "present_clear" = Present & Clear (the site does this well)
- "present_weak" = Present but Weak (attempted but insufficient)  
- "missing" = Missing (not found)

Score: Each "present_clear" = 10 points, "present_weak" = 5 points, "missing" = 0 points. Sum all 10 categories for overall_score (0-100).

The 10 categories are:
1. Positioning & Messaging - Does the homepage lead with the developer's pain (not the product)? Is there a clear one-line product description within 5 seconds? Is the target persona explicit? Is the problem specific (not vague)? Is there urgency (why now)? Is there a clear differentiator? Does it follow the three-part story structure (villain → hero's journey → transformation)? Are the words in developer language, not marketing-speak?
2. Value Prop & Outcomes - Are there concrete outcome statements with SPECIFIC metrics and attribution (named person, company, number)? Not just features but real-world scenarios showing transformation? Does it show pain (without product) vs. gain (with product)? Are claims backed by attributed testimonials, not just assertions? Is there zero puffery ("better," "best-in-class," etc.)?
3. Target Personas & Use Cases - Is there content for developers/ICs (SDK docs, code snippets, quickstart)? Content for CTOs/engineering leaders (architecture, ROI)? Content for compliance/security (certifications, data handling)? Use case pages? Role-based navigation?
4. Product & Feature Clarity - How the product works (architecture diagram, flow, visual)? Where it fits in the stack (integration points)? Integration logos visible ("fruit salad" of partner logos showing compatibility)? Key features in scannable categories? Code snippet or integration example? Product screenshots/visuals?
5. Pricing & Plans - Visible (not hidden behind "Contact Sales" only)? Simple (3 tiers max)? Developer-friendly (free tier, no credit card)? Clear units? Easy trial with upgrade path? Does it enable the "weekend evaluation" — can a dev go from landing to working product by Sunday night without talking to anyone?
6. Design Partner / Early Access - Beta/early access CTA? Clear partner benefits and expectations? Urgency/scarcity signals? Advisory board or community invitation?
7. Social Proof & Credibility - Testimonials from NAMED developers at RECOGNIZABLE companies (Uber, Airbnb, Meta, Cisco level)? Specific metrics in testimonials (not vague praise)? Ratio of attributed vs anonymous quotes (aim for 2:1)? Customer logos from known companies? Founder credentials? Investor mentions? Open source signals? Does the site sell the category (not just the product) and let users do the selling through their own words?
8. Conversion Paths & CTAs - Clear primary CTA? Secondary CTA? Visible above fold and in nav? Specific about what happens next (not just "Learn More")? Max 2 CTAs visible at once? No dead ends? Does the CTA enable frictionless self-serve trial (weekend evaluation test)?
9. Content, SEO & Readability - Meta tags present and well-written? Proper heading hierarchy? Relevant keywords? Blog/resources section? Short paragraphs, clear headings, minimal jargon? Any obvious performance issues?
10. Trust, Security & Compliance - Security page? Compliance certifications (SOC2, GDPR, HIPAA, ISO 27001)? Privacy policy and ToS? Data residency/on-prem/VPC? Status page? Responsible disclosure?

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

Be thorough, specific, and constructive. Reference actual content you find on the page. Call out puffery and vague claims specifically. Highlight excellent examples of specific proof with attribution.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
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
