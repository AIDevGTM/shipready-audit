import { AuditResult, ratingConfig } from "./audit-types";

export type SkillMode = "generic" | "personalized";
export type SkillFormat = "claude_skill" | "system_prompt" | "cursor_rules";

const FRAMEWORK_BODY = `## Scoring System

Rate each of the 10 categories as:
- **Present & Clear** (10 points) — the element exists, is well-executed, and is easy to find
- **Present but Weak** (5 points) — the element exists but is incomplete, unclear, or poorly positioned
- **Missing** (0 points) — the element does not exist on the site

Overall score = sum of all 10 categories (0–100).

## The 10-Point Audit Framework

### 1. Positioning & Messaging (10 pts)
Check whether the homepage clearly answers within 5 seconds:
- **What is it?** — A one-line product description is visible above the fold
- **Who is it for?** — Target persona is explicitly named
- **What problem does it solve?** — A specific pain point is articulated
- **Why now?** — Urgency drivers are present
- **How is it different?** — A clear differentiator vs. alternatives is stated

### 2. Value Prop & Outcomes (10 pts)
Check whether the site shows outcomes, not just features:
- Concrete outcome statements with metrics or specifics
- Real-world scenarios or mini-stories that illustrate value
- A clear before/after contrast
- At least 3 distinct value propositions

### 3. Target Personas & Use Cases (10 pts)
Check for explicit persona-targeted content:
- Content for **developers** (SDK docs, code snippets, quickstart)
- Content for **engineering leaders** (architecture, team controls, ROI)
- Content for **compliance/security** (audit trails, certifications)
- **Use case pages** showing real-world scenarios
- Role-based navigation or persona-specific entry points

### 4. Product & Feature Clarity (10 pts)
Check whether the site clearly explains:
- **How the product works** — architecture diagram or visual flow
- **Where it fits in the stack** — integration points, compatible tools
- **Key features** organized in scannable categories
- **A code snippet or integration example**
- **Product screenshots** showing the real product

### 5. Pricing & Plans (10 pts)
Check whether pricing is:
- **Visible** — not hidden behind "Contact Sales"
- **Simple** — 3 tiers max with clear differentiation
- **Developer-friendly** — free tier, no credit card required
- **Clear units** — obvious cost structure
- **Trial-friendly** — risk-free starting

### 6. Design Partner / Early Access Motion (10 pts)
Look for:
- A "Design Partner," "Early Access," or "Beta" program CTA
- Clear explanation of what partners get
- Clear explanation of what is expected
- Urgency or scarcity signals
- An advisory board or community invitation

### 7. Social Proof & Credibility (10 pts)
Check for:
- **Founder credentials** (background, recognizable companies)
- **Customer logos** (even anonymized)
- **Testimonials or quotes** from users or advisors
- **Investor or accelerator mentions**
- **Open source signals** (GitHub stars, npm downloads)

### 8. CTAs & Conversion Paths (10 pts)
Evaluate:
- A **clear primary CTA** visible above the fold
- A **secondary CTA** for different intent
- CTAs appear in nav, hero, and throughout the page
- CTA copy is **specific** about what happens next
- Every page has a clear next step — no dead ends

### 9. Content, SEO & Readability (10 pts)
Assess:
- **Meta tags** — title, description, Open Graph tags
- **Heading structure** — proper H1/H2/H3 hierarchy
- **Keyword targeting** — relevant search terms present
- **Blog or resources section** with substantive content
- **Readability** — short paragraphs, clear headings

### 10. Trust, Security & Compliance (10 pts)
Look for:
- A **Security page** explaining data handling
- **Compliance certifications** (SOC2, GDPR, HIPAA, ISO 27001)
- **Privacy policy** and **Terms of Service**
- **Data residency** or self-hosted options
- **Status page** link or uptime commitment

## Output Format

Return the audit as a structured report:

1. **Overall Score**: X/100 with rating label (0–49: "Needs Significant Work", 50–79: "Strong Foundation, Critical Gaps", 80–100: "Launch Ready")
2. **What's Working Well**: 3–5 specific strengths
3. **Scorecard Table**: All 10 categories with rating and one-line finding
4. **Detailed Findings**: For each category — Rating, What was found, What's missing, Recommendations
5. **Prioritized Action Plan**: Top 5 changes ordered by impact`;

function getPersonalizedSection(result: AuditResult): string {
  const date = result.created_at
    ? new Date(result.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Unknown date";

  const domain = new URL(result.url).hostname;

  const tableRows = result.categories
    .map((c, i) => `| ${i + 1}. ${c.category} | ${ratingConfig[c.rating].label} | ${c.summary} |`)
    .join("\n");

  const strengths = result.working_well.map((w) => `- ${w}`).join("\n");

  const gaps = result.categories
    .filter((c) => c.rating === "missing" || c.rating === "present_weak")
    .slice(0, 3)
    .map((c) => `- ${c.category}: ${c.missing[0] || c.summary}`)
    .join("\n");

  return `## Previous Audit Results for ${domain}

Audited on: ${date}
Overall Score: ${result.overall_score}/100

| Category | Rating | Finding |
|----------|--------|---------|
${tableRows}

### Key Strengths Identified
${strengths}

### Critical Gaps Identified
${gaps}

## Instructions

Re-audit ${domain} and compare against the previous results above.
Highlight what has improved, what has regressed, and what remains unchanged.
Provide an updated score and a revised action plan focused on remaining gaps.

---

*Audit framework by [ShipReady](https://ship-ready.xyz) — Track your progress at ship-ready.xyz*

`;
}

export function generateSkillContent(
  mode: SkillMode,
  format: SkillFormat,
  result: AuditResult,
): string {
  const personalizedBlock = mode === "personalized" ? getPersonalizedSection(result) : "";

  if (format === "claude_skill") {
    return `# ShipReady: Dev Tool Website GTM Audit

> Generated by [ShipReady](https://ship-ready.xyz) — the free GTM audit tool for developer tool companies.

## Purpose

You are a developer tooling GTM expert. When given a dev tool company's website URL (or its content), you perform a comprehensive website audit across 10 dimensions and return a scored report with actionable recommendations.

## How to Use

Provide a URL or paste the website content, then say:
"Run a ShipReady audit on this site."

${personalizedBlock}${FRAMEWORK_BODY}

---

*Audit framework by [ShipReady](https://ship-ready.xyz) — Run this audit automatically at ship-ready.xyz*`;
  }

  if (format === "system_prompt") {
    return `You are ShipReady, a developer tooling GTM audit expert. You analyze websites for developer tool companies and score them across 10 dimensions using the ShipReady framework.

When the user provides a URL or website content, run the full audit and return the structured report.

${personalizedBlock}${FRAMEWORK_BODY}

---
Audit framework by ShipReady (ship-ready.xyz)`;
  }

  // cursor_rules
  return `# ShipReady GTM Audit Framework
# Add this to your .cursorrules or .windsurfrules file to audit dev tool websites
# Framework by ShipReady (ship-ready.xyz)

# When asked to audit a dev tool website, follow this 10-point framework.

${personalizedBlock}${FRAMEWORK_BODY}

# ---
# Audit framework by ShipReady (ship-ready.xyz)`;
}

export function getFileExtension(format: SkillFormat): string {
  switch (format) {
    case "claude_skill": return ".md";
    case "system_prompt": return ".txt";
    case "cursor_rules": return ".cursorrules";
  }
}

export function getFileName(format: SkillFormat): string {
  switch (format) {
    case "claude_skill": return "shipready-skill.md";
    case "system_prompt": return "shipready-prompt.txt";
    case "cursor_rules": return ".cursorrules";
  }
}
