import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const auditId = url.searchParams.get("id");

  if (!auditId) {
    return new Response("Missing audit id", { status: 400, headers: corsHeaders });
  }

  // Determine the app origin for redirects
  const appOrigin = Deno.env.get("APP_ORIGIN") || "https://ship-readyxyz.lovable.app";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("audits")
    .select("id, url, overall_score")
    .eq("id", auditId)
    .maybeSingle();

  if (error || !data) {
    // Redirect to homepage if audit not found
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: appOrigin },
    });
  }

  const title = `ShipReady Audit: ${data.url} — ${data.overall_score}/100`;
  const description = `GTM readiness score: ${data.overall_score}/100 for ${data.url}. See the full 10-point audit breakdown.`;
  const canonicalUrl = `${appOrigin}/?audit=${data.id}`;
  const ogImage =
    "https://storage.googleapis.com/gpt-engineer-file-uploads/6q1YoLA1lVUeLTGQfbB3TSFLmso1/social-images/social-1770828482859-Screenshot_2026-02-11_at_16.47.53.png";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:site_name" content="ShipReady" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${ogImage}" />

  <!-- Redirect humans to the SPA -->
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
  <link rel="canonical" href="${canonicalUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${canonicalUrl}">audit results</a>…</p>
  <script>window.location.replace("${canonicalUrl}");</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
