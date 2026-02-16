import { describe, it, expect, vi } from "vitest";
import { renderCompetitors } from "./pdf-competitors";
import { PdfContext } from "./pdf-types";
import { AuditResult } from "@/lib/audit-types";

function createMockCtx() {
  const ctx: PdfContext = {
    doc: {
      setFillColor: vi.fn(),
      rect: vi.fn(),
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      setTextColor: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      line: vi.fn(),
      text: vi.fn(),
      splitTextToSize: vi.fn((t: string) => [t]),
      addPage: vi.fn(),
    } as any,
    y: 20,
    writeText: vi.fn(),
    gap: vi.fn(),
    divider: vi.fn(),
    ensureSpace: vi.fn(),
    newPage: vi.fn(),
  };
  return ctx;
}

const primaryResult: AuditResult = {
  url: "https://example.com",
  overall_score: 75,
  working_well: [],
  categories: [
    { category: "Positioning & Messaging", rating: "present_clear", summary: "s", found: [], missing: [], recommendations: [], priority: "Important" },
    { category: "Value Prop & Outcomes", rating: "present_weak", summary: "s", found: [], missing: [], recommendations: [], priority: "Important" },
    { category: "Pricing & Plans", rating: "missing", summary: "s", found: [], missing: [], recommendations: [], priority: "Important" },
  ],
};

const competitorResult: AuditResult = {
  url: "https://competitor.com",
  overall_score: 60,
  working_well: [],
  categories: [
    { category: "Positioning & Messaging", rating: "present_weak", summary: "s", found: [], missing: [], recommendations: [], priority: "Important" },
    { category: "Value Prop & Outcomes", rating: "present_clear", summary: "s", found: [], missing: [], recommendations: [], priority: "Important" },
    { category: "Pricing & Plans", rating: "missing", summary: "s", found: [], missing: [], recommendations: [], priority: "Important" },
  ],
};

describe("renderCompetitors", () => {
  it("starts a new page", () => {
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [competitorResult]);
    expect(ctx.newPage).toHaveBeenCalled();
  });

  it("renders section header", () => {
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [competitorResult]);
    expect(ctx.writeText).toHaveBeenCalledWith("COMPETITOR COMPARISON", 12, "bold", expect.any(Array));
  });

  it("renders YOUR SITE and COMPETITOR labels", () => {
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [competitorResult]);

    const docTexts = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(docTexts).toContain("YOUR SITE");
    expect(docTexts).toContain("COMPETITOR");
  });

  it("renders domain names from URLs", () => {
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [competitorResult]);

    const docTexts = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(docTexts).toContain("example.com");
    expect(docTexts).toContain("competitor.com");
  });

  it("renders overall scores", () => {
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [competitorResult]);

    const docTexts = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(docTexts).toContain("75");
    expect(docTexts).toContain("60");
  });

  it("renders table header with Category and site labels", () => {
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [competitorResult]);

    const docTexts = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(docTexts).toContain("Category");
    expect(docTexts).toContain("You");
  });

  it("renders Overall Score footer row", () => {
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [competitorResult]);

    const docTexts = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(docTexts).toContain("Overall Score");
  });

  it("renders competitive insights - ahead and behind", () => {
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [competitorResult]);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("COMPETITIVE INSIGHTS");
    // Primary has present_clear for Positioning, competitor has present_weak → Ahead
    expect(texts.some((t: string) => t.includes("You're Ahead"))).toBe(true);
    expect(texts).toContain("- Positioning & Messaging");
    // Primary has present_weak for Value Prop, competitor has present_clear → Behind
    expect(texts.some((t: string) => t.includes("They're Ahead"))).toBe(true);
    expect(texts).toContain("- Value Prop & Outcomes");
  });

  it("skips insights when ratings are equal", () => {
    const equalCompetitor: AuditResult = {
      ...competitorResult,
      categories: primaryResult.categories.map(c => ({ ...c })),
    };
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [equalCompetitor]);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).not.toContain("COMPETITIVE INSIGHTS");
  });

  it("renders dash for missing competitor categories", () => {
    const partialCompetitor: AuditResult = {
      ...competitorResult,
      categories: [competitorResult.categories[0]], // only first category
    };
    const ctx = createMockCtx();
    renderCompetitors(ctx, primaryResult, [partialCompetitor]);

    const docTexts = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(docTexts.filter((t: string) => t === "-").length).toBeGreaterThanOrEqual(2);
  });
});
