import { ratingConfig } from "@/lib/audit-types";
import type { CategoryRating } from "@/lib/audit-types";
import {
  PdfContext,
  WHITE,
  GRAY,
  LIGHT_GRAY,
  GREEN,
  RED,
  BLUE,
  MARGIN,
  CONTENT_W,
  PAGE_W,
  ratingColor,
  sanitizePdfText,
} from "./pdf-types";

export function renderFindings(ctx: PdfContext, categories: CategoryRating[]) {
  const { doc, writeText, gap, divider, ensureSpace } = ctx;

  divider();
  writeText("DETAILED FINDINGS", 12, "bold", WHITE);
  gap(6);

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    ensureSpace(25);

    const rc = ratingColor(cat.rating);
    doc.setFillColor(...rc);
    doc.rect(MARGIN, ctx.y, 2.5, 7, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(
      sanitizePdfText(`${String(i + 1).padStart(2, "0")}. ${cat.category}`),
      MARGIN + 6,
      ctx.y + 5
    );

    const rLabel = sanitizePdfText(ratingConfig[cat.rating].label);
    doc.setFontSize(8);
    doc.setTextColor(...rc);
    doc.text(rLabel, MARGIN + CONTENT_W - 35, ctx.y + 5);
    ctx.y += 10;

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

    if (i < categories.length - 1) {
      ensureSpace(4);
      doc.setDrawColor(40, 40, 45);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 6, ctx.y, PAGE_W - MARGIN - 6, ctx.y);
      ctx.y += 6;
    }
  }
}
