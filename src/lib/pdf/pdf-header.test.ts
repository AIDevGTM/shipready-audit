import { describe, it, expect, vi } from "vitest";
import { renderHeader } from "./pdf-header";
import { PdfContext } from "./pdf-types";
import { AuditResult } from "@/lib/audit-types";

function createMockCtx() {
  const calls: { fn: string; args: any[] }[] = [];
  const ctx: PdfContext = {
    doc: {} as any,
    y: 20,
    writeText: vi.fn((...args) => calls.push({ fn: "writeText", args })),
    gap: vi.fn((...args) => calls.push({ fn: "gap", args })),
    divider: vi.fn(() => calls.push({ fn: "divider", args: [] })),
    ensureSpace: vi.fn(),
    newPage: vi.fn(),
  };
  return { ctx, calls };
}

const baseResult: AuditResult = {
  url: "https://example.com",
  overall_score: 75,
  working_well: ["Great messaging", "Strong CTAs"],
  categories: [],
};

describe("renderHeader", () => {
  it("renders branding, title, URL, and date", () => {
    const { ctx } = createMockCtx();
    renderHeader(ctx, baseResult);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("SHIPREADY");
    expect(texts).toContain("GTM Readiness Audit Report");
    expect(texts).toContain("https://example.com");
    expect(texts.some((t: string) => t.startsWith("Generated "))).toBe(true);
  });

  it("renders score and label for mid-range score", () => {
    const { ctx } = createMockCtx();
    renderHeader(ctx, baseResult);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("75 / 100");
    expect(texts).toContain("Strong Foundation, Critical Gaps");
  });

  it("renders 'Launch Ready' for score >= 80", () => {
    const { ctx } = createMockCtx();
    renderHeader(ctx, { ...baseResult, overall_score: 90 });

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("90 / 100");
    expect(texts).toContain("Launch Ready");
  });

  it("renders 'Needs Significant Work' for score < 50", () => {
    const { ctx } = createMockCtx();
    renderHeader(ctx, { ...baseResult, overall_score: 30 });

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("Needs Significant Work");
  });

  it("renders working well items", () => {
    const { ctx } = createMockCtx();
    renderHeader(ctx, baseResult);

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).toContain("WHAT'S WORKING WELL");
    expect(texts).toContain("- Great messaging");
    expect(texts).toContain("- Strong CTAs");
  });

  it("skips working well section when empty", () => {
    const { ctx } = createMockCtx();
    renderHeader(ctx, { ...baseResult, working_well: [] });

    const texts = (ctx.writeText as any).mock.calls.map((c: any[]) => c[0]);
    expect(texts).not.toContain("WHAT'S WORKING WELL");
  });

  it("calls divider before score section", () => {
    const { ctx, calls } = createMockCtx();
    renderHeader(ctx, baseResult);

    const dividerIdx = calls.findIndex(c => c.fn === "divider");
    const scoreIdx = calls.findIndex(c => c.fn === "writeText" && c.args[0] === "OVERALL SCORE");
    expect(dividerIdx).toBeLessThan(scoreIdx);
  });
});
