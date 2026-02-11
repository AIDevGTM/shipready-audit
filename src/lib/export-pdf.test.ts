import { describe, it, expect, vi } from "vitest";

// Mock jsPDF
const mockText = vi.fn();
const mockSave = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetFont = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockRect = vi.fn();
const mockSplitTextToSize = vi.fn((text: string) => [text]);
const mockAddPage = vi.fn();

vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    text: mockText,
    save: mockSave,
    setFontSize: mockSetFontSize,
    setFont: mockSetFont,
    setTextColor: mockSetTextColor,
    setFillColor: mockSetFillColor,
    rect: mockRect,
    splitTextToSize: mockSplitTextToSize,
    addPage: mockAddPage,
  })),
}));

import { exportAuditToPdf } from "@/lib/export-pdf";
import { AuditResult } from "@/lib/audit-types";

const mockResult: AuditResult = {
  url: "https://example.com",
  overall_score: 75,
  working_well: ["Great messaging", "Strong CTAs"],
  categories: [
    { category: "Positioning & Messaging", rating: "present_clear", summary: "Clear positioning", found: ["Good headline"], missing: ["No urgency"], recommendations: ["Add urgency drivers"], priority: "Important" },
    { category: "Value Prop & Outcomes", rating: "present_weak", summary: "Weak metrics", found: ["Some outcomes"], missing: ["No attributed quotes"], recommendations: ["Add named testimonials"], priority: "Quick Win" },
    { category: "Target Personas & Use Cases", rating: "present_clear", summary: "Good personas", found: ["Dev docs"], missing: [], recommendations: ["Add CTO content"], priority: "Nice to Have" },
    { category: "Product & Feature Clarity", rating: "present_clear", summary: "Clear product", found: ["Architecture diagram"], missing: [], recommendations: [], priority: "Nice to Have" },
    { category: "Pricing & Plans", rating: "missing", summary: "No pricing", found: [], missing: ["No pricing page"], recommendations: ["Add pricing page"], priority: "Important" },
    { category: "Design Partner / Early Access", rating: "missing", summary: "No beta program", found: [], missing: ["No early access CTA"], recommendations: ["Launch beta program"], priority: "Important" },
    { category: "Social Proof & Credibility", rating: "present_weak", summary: "Some proof", found: ["A few logos"], missing: ["No named testimonials"], recommendations: ["Add attributed quotes"], priority: "Quick Win" },
    { category: "Conversion Paths & CTAs", rating: "present_clear", summary: "Strong CTAs", found: ["Clear primary CTA"], missing: [], recommendations: [], priority: "Nice to Have" },
    { category: "Content, SEO & Readability", rating: "present_clear", summary: "Good SEO", found: ["Meta tags present"], missing: [], recommendations: [], priority: "Nice to Have" },
    { category: "Trust, Security & Compliance", rating: "present_weak", summary: "Partial trust", found: ["Privacy policy"], missing: ["No SOC2"], recommendations: ["Get SOC2 certified"], priority: "Important" },
  ],
};

describe("exportAuditToPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a PDF with the correct filename", () => {
    exportAuditToPdf(mockResult);
    expect(mockSave).toHaveBeenCalledWith("shipready-audit-example.com.pdf");
  });

  it("includes the title and URL", () => {
    exportAuditToPdf(mockResult);
    const allTextCalls = mockText.mock.calls.map(c => c[0]).flat();
    expect(allTextCalls).toContain("ShipReady GTM Audit Report");
    expect(allTextCalls).toContain("https://example.com");
  });

  it("includes the overall score", () => {
    exportAuditToPdf(mockResult);
    const allTextCalls = mockText.mock.calls.map(c => c[0]).flat();
    expect(allTextCalls.some((t: string) => t.includes("75"))).toBe(true);
  });

  it("includes all 10 categories", () => {
    exportAuditToPdf(mockResult);
    const allTextCalls = mockText.mock.calls.map(c => c[0]).flat();
    for (const cat of mockResult.categories) {
      expect(allTextCalls.some((t: string) => t.includes(cat.category))).toBe(true);
    }
  });

  it("includes working well items", () => {
    exportAuditToPdf(mockResult);
    const allTextCalls = mockText.mock.calls.map(c => c[0]).flat();
    expect(allTextCalls.some((t: string) => t.includes("Great messaging"))).toBe(true);
  });

  it("includes recommendations", () => {
    exportAuditToPdf(mockResult);
    const allTextCalls = mockText.mock.calls.map(c => c[0]).flat();
    expect(allTextCalls.some((t: string) => t.includes("Add urgency drivers"))).toBe(true);
    expect(allTextCalls.some((t: string) => t.includes("Add named testimonials"))).toBe(true);
  });

  it("includes found and missing items", () => {
    exportAuditToPdf(mockResult);
    const allTextCalls = mockText.mock.calls.map(c => c[0]).flat();
    expect(allTextCalls.some((t: string) => t.includes("Good headline"))).toBe(true);
    expect(allTextCalls.some((t: string) => t.includes("No pricing page"))).toBe(true);
  });
});
