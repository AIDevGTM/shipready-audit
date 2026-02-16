import { describe, it, expect, vi } from "vitest";
import { renderScorecard } from "./pdf-scorecard";
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

const categories: CategoryRating[] = [
  { category: "Positioning & Messaging", rating: "present_clear", summary: "s", found: [], missing: [], recommendations: [], priority: "Quick Win" },
  { category: "Value Prop & Outcomes", rating: "present_weak", summary: "s", found: [], missing: [], recommendations: [], priority: "Important" },
  { category: "Pricing & Plans", rating: "missing", summary: "s", found: [], missing: [], recommendations: [], priority: "Important" },
];

describe("renderScorecard", () => {
  it("renders section header", () => {
    const ctx = createMockCtx();
    renderScorecard(ctx, categories);

    expect(ctx.writeText).toHaveBeenCalledWith("SCORECARD SUMMARY", 10, "bold", expect.any(Array));
  });

  it("renders header row with column labels", () => {
    const ctx = createMockCtx();
    renderScorecard(ctx, categories);

    const textCalls = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(textCalls).toContain("#");
    expect(textCalls).toContain("Category");
    expect(textCalls).toContain("Rating");
  });

  it("renders all category rows", () => {
    const ctx = createMockCtx();
    renderScorecard(ctx, categories);

    const textCalls = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(textCalls).toContain("Positioning & Messaging");
    expect(textCalls).toContain("Value Prop & Outcomes");
    expect(textCalls).toContain("Pricing & Plans");
  });

  it("renders rating labels for each category", () => {
    const ctx = createMockCtx();
    renderScorecard(ctx, categories);

    const textCalls = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(textCalls).toContain("Present & Clear");
    expect(textCalls).toContain("Present but Weak");
    expect(textCalls).toContain("Missing");
  });

  it("renders row numbers padded to 2 digits", () => {
    const ctx = createMockCtx();
    renderScorecard(ctx, categories);

    const textCalls = (ctx.doc.text as any).mock.calls.map((c: any[]) => c[0]);
    expect(textCalls).toContain("01");
    expect(textCalls).toContain("02");
    expect(textCalls).toContain("03");
  });

  it("alternates row background colors", () => {
    const ctx = createMockCtx();
    renderScorecard(ctx, categories);

    // Even rows (0, 2) get fill, odd rows (1) don't
    const fillCalls = (ctx.doc.setFillColor as any).mock.calls;
    // Header fill + 2 even-row fills = at least 3
    expect(fillCalls.length).toBeGreaterThanOrEqual(3);
  });

  it("calls ensureSpace for each row", () => {
    const ctx = createMockCtx();
    renderScorecard(ctx, categories);

    // 1 header + 3 data rows = 4
    expect(ctx.ensureSpace).toHaveBeenCalledTimes(4);
  });
});
