import jsPDF from "jspdf";
import { AuditResult, ratingConfig } from "@/lib/audit-types";

const BG: [number, number, number] = [15, 15, 17];
const WHITE: [number, number, number] = [240, 240, 240];
const GRAY: [number, number, number] = [160, 160, 160];
const LIGHT_GRAY: [number, number, number] = [130, 130, 130];
const GREEN: [number, number, number] = [34, 197, 94];
const AMBER: [number, number, number] = [245, 158, 11];
const RED: [number, number, number] = [239, 68, 68];
const BLUE: [number, number, number] = [96, 165, 250];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - 20;

function ratingColor(rating: string): [number, number, number] {
  if (rating === "present_clear") return GREEN;
  if (rating === "present_weak") return AMBER;
  return RED;
}

/**
 * jsPDF built-in fonts are WinAnsi/limited Unicode.
 * When unsupported glyphs appear (✓, •, smart quotes, em-dash), many viewers show bizarre tracking/spacing.
 * Normalize + remap to safe ASCII to keep layout stable.
 */
function sanitizePdfText(input: string): string {
  return (
    input
      .normalize("NFKD")
      // Common typography
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u00A0/g, " ")
      // Bullets/checkmarks
      .replace(/\u2022/g, "-")
      .replace(/\u2713/g, "v")
      .replace(/\u2714/g, "v")
      .replace(/\u2715/g, "x")
      // Any remaining non-ASCII -> space (prevents weird kerning)
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
      // Collapse accidental runs of spaces
      .replace(/\s{2,}/g, " ")
      .trimEnd()
  );
}

export function exportAuditToPdf(result: AuditResult) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const paintBg = () => {
    doc.setFillColor(...BG);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  };

  const newPage = () => {
    doc.addPage();
    paintBg();
    y = MARGIN;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > BOTTOM_LIMIT) newPage();
  };

  /** Write wrapped text lines. Advances y. */
  const writeText = (
    text: string,
    fontSize: number,
    style: "normal" | "bold" = "normal",
    color: [number, number, number] = WHITE,
    indent = 0
  ) => {
    const safe = sanitizePdfText(text);
    if (!safe) return;

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", style);
    doc.setTextColor(...color);

    const maxW = CONTENT_W - indent;
    const lines: string[] = doc.splitTextToSize(safe, maxW);
    const lineH = fontSize * 0.45; // mm per line

    for (const line of lines) {
      ensureSpace(lineH + 1);
      doc.text(line, MARGIN + indent, y);
      y += lineH;
    }
  };

  const gap = (h = 4) => {
    y += h;
  };

  const divider = () => {
    ensureSpace(6);
    doc.setDrawColor(50, 50, 55);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  };

  // ────────────── PAGE 1: HEADER ──────────────
  paintBg();

  writeText("SHIPREADY", 10, "bold", GREEN);
  gap(2);
  writeText("GTM Readiness Audit Report", 20, "bold", WHITE);
  gap(2);
  writeText(result.url, 9, "normal", GRAY);
  gap(1);
  const now = new Date();
  writeText(
    `Generated ${now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    8,
    "normal",
    LIGHT_GRAY
  );
  gap(8);

  // ────────────── OVERALL SCORE ──────────────
  divider();

  const scoreColor =
    result.overall_score >= 80
      ? GREEN
      : result.overall_score >= 50
        ? AMBER
        : RED;
  const scoreLabel =
    result.overall_score >= 80
      ? "Launch Ready"
      : result.overall_score >= 50
        ? "Strong Foundation, Critical Gaps"
        : "Needs Significant Work";

  writeText("OVERALL SCORE", 9, "bold", GRAY);
  gap(6);
  writeText(`${result.overall_score} / 100`, 26, "bold", scoreColor);
  gap(3);
  writeText(scoreLabel, 10, "normal", scoreColor);
  gap(8);

  // ────────────── WHAT'S WORKING WELL ──────────────
  if (result.working_well.length > 0) {
    divider();
    writeText("WHAT'S WORKING WELL", 10, "bold", GREEN);
    gap(3);
    for (const item of result.working_well) {
      writeText(`- ${item}`, 9, "normal", [200, 215, 200]);
      gap(1.5);
    }
    gap(4);
  }

  // ────────────── SCORECARD TABLE ──────────────
  divider();
  writeText("SCORECARD SUMMARY", 10, "bold", WHITE);
  gap(4);

  const ROW_H = 8;
  ensureSpace(ROW_H);
  doc.setFillColor(30, 30, 35);
  doc.rect(MARGIN, y, CONTENT_W, ROW_H, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("#", MARGIN + 3, y + 5.5);
  doc.text("Category", MARGIN + 12, y + 5.5);
  doc.text("Rating", MARGIN + CONTENT_W - 38, y + 5.5);
  y += ROW_H;

  for (let i = 0; i < result.categories.length; i++) {
    const cat = result.categories[i];
    ensureSpace(ROW_H);

    if (i % 2 === 0) {
      doc.setFillColor(22, 22, 26);
      doc.rect(MARGIN, y, CONTENT_W, ROW_H, "F");
    }

    const rowMid = y + 5.5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_GRAY);
    doc.text(String(i + 1).padStart(2, "0"), MARGIN + 3, rowMid);

    doc.setTextColor(...WHITE);
    doc.text(sanitizePdfText(cat.category), MARGIN + 12, rowMid);

    const rc = ratingColor(cat.rating);
    const label = sanitizePdfText(ratingConfig[cat.rating].label);
    doc.setTextColor(...rc);
    doc.setFont("helvetica", "bold");
    doc.text(label, MARGIN + CONTENT_W - 38, rowMid);

    y += ROW_H;
  }

  gap(10);

  // ────────────── DETAILED FINDINGS ──────────────
  divider();
  writeText("DETAILED FINDINGS", 12, "bold", WHITE);
  gap(6);

  for (let i = 0; i < result.categories.length; i++) {
    const cat = result.categories[i];
    ensureSpace(25);

    const rc = ratingColor(cat.rating);
    doc.setFillColor(...rc);
    doc.rect(MARGIN, y, 2.5, 7, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(
      sanitizePdfText(`${String(i + 1).padStart(2, "0")}. ${cat.category}`),
      MARGIN + 6,
      y + 5
    );

    const rLabel = sanitizePdfText(ratingConfig[cat.rating].label);
    doc.setFontSize(8);
    doc.setTextColor(...rc);
    doc.text(rLabel, MARGIN + CONTENT_W - 35, y + 5);
    y += 10;

    writeText(cat.summary, 9, "normal", GRAY, 6);
    gap(3);

    if (cat.found.length > 0) {
      writeText("What We Found:", 8, "bold", GREEN, 6);
      gap(1);
      for (const item of cat.found) {
        writeText(`- ${item}`, 8, "normal", [190, 205, 190], 10);
        gap(0.5);
      }
      gap(2);
    }

    if (cat.missing.length > 0) {
      writeText("What's Missing:", 8, "bold", RED, 6);
      gap(1);
      for (const item of cat.missing) {
        writeText(`- ${item}`, 8, "normal", [200, 170, 170], 10);
        gap(0.5);
      }
      gap(2);
    }

    if (cat.recommendations.length > 0) {
      writeText("Recommendations:", 8, "bold", BLUE, 6);
      gap(1);
      for (const item of cat.recommendations) {
        writeText(`- ${item}`, 8, "normal", [180, 195, 220], 10);
        gap(0.5);
      }
      gap(2);
    }

    writeText(`Priority: ${cat.priority}`, 7, "bold", LIGHT_GRAY, 6);
    gap(6);

    if (i < result.categories.length - 1) {
      ensureSpace(4);
      doc.setDrawColor(40, 40, 45);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 6, y, PAGE_W - MARGIN - 6, y);
      y += 6;
    }
  }

  // ────────────── FOOTER ──────────────
  gap(8);
  divider();
  writeText("Generated by ShipReady - GTM Audit for Dev Tools", 7, "normal", LIGHT_GRAY);
  writeText("Built by Shane O'Connor @ The DevTool GTM Company", 7, "normal", LIGHT_GRAY);

  doc.save(`shipready-audit-${new URL(result.url).hostname}.pdf`);
}
