export type RatingLevel = "present_clear" | "present_weak" | "missing";

export interface CategoryRating {
  category: string;
  rating: RatingLevel;
  summary: string;
  found: string[];
  missing: string[];
  recommendations: string[];
  priority: "Quick Win" | "Important" | "Nice to Have";
}

export interface AuditResult {
  id?: string;
  url: string;
  overall_score: number;
  working_well: string[];
  categories: CategoryRating[];
  rendered_with_firecrawl?: boolean;
  created_at?: string;
}

export const AUDIT_CATEGORIES = [
  "Positioning & Messaging",
  "Value Prop & Outcomes",
  "Target Personas & Use Cases",
  "Product & Feature Clarity",
  "Pricing & Plans",
  "Design Partner / Early Access",
  "Social Proof & Credibility",
  "Conversion Paths & CTAs",
  "Content, SEO & Readability",
  "Trust, Security & Compliance",
] as const;

export const ratingConfig: Record<RatingLevel, { label: string; color: string; bgClass: string; textClass: string }> = {
  present_clear: { label: "Present & Clear", color: "hsl(142 71% 45%)", bgClass: "bg-success/10", textClass: "text-success" },
  present_weak: { label: "Present but Weak", color: "hsl(38 92% 50%)", bgClass: "bg-warning/10", textClass: "text-warning" },
  missing: { label: "Missing", color: "hsl(0 72% 51%)", bgClass: "bg-destructive/10", textClass: "text-destructive" },
};

export function getScoreLabel(score: number): { label: string; colorClass: string } {
  if (score >= 80) return { label: "Launch Ready", colorClass: "text-success" };
  if (score >= 50) return { label: "Strong Foundation, Critical Gaps", colorClass: "text-warning" };
  return { label: "Needs Significant Work", colorClass: "text-destructive" };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "hsl(142 71% 45%)";
  if (score >= 50) return "hsl(38 92% 50%)";
  return "hsl(0 72% 51%)";
}
