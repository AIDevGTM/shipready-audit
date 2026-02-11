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
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - 25;

function ratingColor(rating: string): [number, number, number] {
  if (rating === "present_clear") return GREEN;
  if (rating === "present_weak") return AMBER;
  return RED;
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

  const lineHeight = (fontSize: number) => fontSize * 0.4;

  const addText = (
    text: string,
    fontSize: number,
    style: "normal" | "bold" = "normal",
    color: [number, number, number] = WHITE,
    indent = 0
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", style);
    doc.setTextColor(...color);
    const maxWidth = CONTENT_W - indent;
    const lines: string[] = doc.splitTextToSize(text, maxWidth);
    const lh = lineHeight(fontSize);

    for (const line of lines) {
      ensureSpace(lh + 2);
      doc.text(line, MARGIN + indent, y);
      y += lh + 1.2;
    }
  };

  const addSpacer = (h = 4) => { y += h; };

  const addDivider = () => {
    ensureSpace(6);
    doc.setDrawColor(50, 50, 55);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 4;
  };

  // === PAGE 1 ===
  paintBg();

  // Title block
  addText("SHIPREADY", 10, "bold", GREEN);
  addText("GTM Readiness Audit Report", 22, "bold", WHITE);
  addSpacer(2);
  addText(result.url, 9, "normal", GRAY);
  addSpacer(2);

  const now = new Date();
  addText(`Generated ${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 8, "normal", LIGHT_GRAY);
  addSpacer(8);

  // Overall score
  addDivider();
  const scoreColor = result.overall_score >= 80 ? GREEN : result.overall_score >= 50 ? AMBER : RED;
  const scoreLabel = result.overall_score >= 80 ? "Launch Ready" : result.overall_score >= 50 ? "Strong Foundation, Critical Gaps" : "Needs Significant Work";

  addText("OVERALL SCORE", 9, "bold", GRAY);
  addSpacer(1);
  addText(`${result.overall_score} / 100`, 28, "bold", scoreColor);
  addText(scoreLabel, 11, "normal", scoreColor);
  addSpacer(6);

  // What's working well
  if (result.working_well.length > 0) {
    addDivider();
    addText("WHAT'S WORKING WELL", 10, "bold", GREEN);
    addSpacer(2);
    result.working_well.forEach((item) => {
      addText(`✓  ${item}`, 9, "normal", [200, 210, 200], 0);
      addSpacer(1);
    });
    addSpacer(4);
  }

  // Scorecard summary
  addDivider();
  addText("SCORECARD SUMMARY", 10, "bold", WHITE);
  addSpacer(3);

  // Table header
  doc.setFillColor(30, 30, 35);
  ensureSpace(8);
  doc.rect(MARGIN, y - 1, CONTENT_W, 7, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("#", MARGIN + 2, y + 3);
  doc.text("Category", MARGIN + 10, y + 3);
  doc.text("Rating", MARGIN + CONTENT_W - 40, y + 3);
  y += 8;

  // Table rows
  result.categories.forEach((cat, i) => {
    ensureSpace(8);
    if (i % 2 === 0) {
      doc.setFillColor(22, 22, 26);
      doc.rect(MARGIN, y - 1, CONTENT_W, 7, "F");
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_GRAY);
    doc.text(String(i + 1).padStart(2, "0"), MARGIN + 2, y + 3);

    doc.setTextColor(...WHITE);
    doc.text(cat.category, MARGIN + 10, y + 3);

    const rc = ratingColor(cat.rating);
    const label = ratingConfig[cat.rating].label;
    doc.setTextColor(...rc);
    doc.setFont("helvetica", "bold");
    doc.text(label, MARGIN + CONTENT_W - 40, y + 3);
    y += 7;
  });

  addSpacer(8);

  // Detailed findings
  addDivider();
  addText("DETAILED FINDINGS", 12, "bold", WHITE);
  addSpacer(4);

  result.categories.forEach((cat, i) => {
    ensureSpace(20);

    // Category header with colored bar
    const rc = ratingColor(cat.rating);
    doc.setFillColor(...rc);
    doc.rect(MARGIN, y, 2, 6, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(`${String(i + 1).padStart(2, "0")}. ${cat.category}`, MARGIN + 5, y + 4);

    const label = ratingConfig[cat.rating].label;
    doc.setFontSize(8);
    doc.setTextColor(...rc);
    doc.text(label, MARGIN + CONTENT_W - 35, y + 4);
    y += 9;

    // Summary
    addText(cat.summary, 9, "normal", GRAY, 5);
    addSpacer(2);

    // Found
    if (cat.found.length > 0) {
      addText("What We Found:", 8, "bold", GREEN, 5);
      cat.found.forEach((item) => {
        addText(`•  ${item}`, 8, "normal", [190, 200, 190], 9);
      });
      addSpacer(2);
    }

    // Missing
    if (cat.missing.length > 0) {
      addText("What's Missing:", 8, "bold", RED, 5);
      cat.missing.forEach((item) => {
        addText(`•  ${item}`, 8, "normal", [200, 170, 170], 9);
      });
      addSpacer(2);
    }

    // Recommendations
    if (cat.recommendations.length > 0) {
      addText("Recommendations:", 8, "bold", BLUE, 5);
      cat.recommendations.forEach((item) => {
        addText(`•  ${item}`, 8, "normal", [180, 195, 220], 9);
      });
      addSpacer(2);
    }

    // Priority
    addText(`Priority: ${cat.priority}`, 7, "bold", LIGHT_GRAY, 5);
    addSpacer(6);

    // Separator between categories
    if (i < result.categories.length - 1) {
      doc.setDrawColor(40, 40, 45);
      doc.setLineWidth(0.2);
      ensureSpace(4);
      doc.line(MARGIN + 5, y, PAGE_W - MARGIN - 5, y);
      y += 5;
    }
  });

  // Footer on last page
  addSpacer(8);
  addDivider();
  addText("Generated by ShipReady — GTM Audit for Dev Tools", 7, "normal", LIGHT_GRAY);
  addText("Built by Shane O'Connor @ The DevTool GTM Company", 7, "normal", LIGHT_GRAY);

  doc.save(`shipready-audit-${new URL(result.url).hostname}.pdf`);
}
