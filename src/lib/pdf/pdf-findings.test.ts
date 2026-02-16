import { describe, it, expect, vi } from "vitest";
import { renderFindings } from "./pdf-findings";
import { PdfContext } from "./pdf-types";
import type { CategoryRating } from "@/lib/audit-types";

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

const fullCategory: CategoryRating = {
  category: "Positioning & Messaging",
  rating: "present_clear",
  summary: "Clear positioning",
  found: ["Good headline", "Strong tagline"],
  missing: ["No urgency"],
  recommendations: ["Add urgency drivers"],
  priority: "Important",
};

const emptyCategory: CategoryRating = {
  category: "Pricing & Plans",
  rating: "missing",
  summary: "No pricing",
  found: [],
  missing: [],
  recommendations: [],
  priority: "Quick Win",
};

describe("renderFindings", () => {
  it("renders section header", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory]);

    expect(ctx.writeText).toHaveBeenCalledWith("DETAILED FINDINGS", 12, "bold", expect.any(Array));
  });

  it("renders category name and number", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory]);

    const docTexts = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(docTexts.some((t: string) => t.includes("01. Positioning & Messaging"))).toBe(true);
  });

  it("renders rating label", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory]);

    const docTexts = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(docTexts).toContain("Present & Clear");
  });

  it("renders summary text", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory]);

    expect(ctx.writeText).toHaveBeenCalledWith("Clear positioning", 9, "normal", expect.any(Array), 6);
  });

  it("renders found items", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory]);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("What We Found:");
    expect(texts).toContain("- Good headline");
    expect(texts).toContain("- Strong tagline");
  });

  it("renders missing items", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory]);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("What's Missing:");
    expect(texts).toContain("- No urgency");
  });

  it("renders recommendations", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory]);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("Recommendations:");
    expect(texts).toContain("- Add urgency drivers");
  });

  it("renders priority", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory]);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("Priority: Important");
  });

  it("skips empty found/missing/recommendations sections", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [emptyCategory]);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).not.toContain("What We Found:");
    expect(texts).not.toContain("What's Missing:");
    expect(texts).not.toContain("Recommendations:");
  });

  it("draws separator between categories but not after last", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory, emptyCategory]);

    // One separator line between 2 categories
    expect(ctx.doc.line).toHaveBeenCalledTimes(1);
  });

  it("does not draw separator for single category", () => {
    const ctx = createMockCtx();
    renderFindings(ctx, [fullCategory]);

    expect(ctx.doc.line).not.toHaveBeenCalled();
  });
});
