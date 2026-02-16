import { ratingConfig } from "@/lib/audit-types";
import type { CategoryRating } from "@/lib/audit-types";
import {
  PdfContext,
  WHITE,
  GRAY,
  LIGHT_GRAY,
  MARGIN,
  CONTENT_W,
  ratingColor,
  sanitizePdfText,
} from "./pdf-types";

export function renderScorecard(ctx: PdfContext, categories: CategoryRating[]) {
  const { doc, writeText, gap, divider, ensureSpace } = ctx;

  divider();
  writeText("SCORECARD SUMMARY", 10, "bold", WHITE);
  gap(4);

  const ROW_H = 8;
  ensureSpace(ROW_H);
  doc.setFillColor(30, 30, 35);
  doc.rect(MARGIN, ctx.y, CONTENT_W, ROW_H, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("#", MARGIN + 3, ctx.y + 5.5);
  doc.text("Category", MARGIN + 12, ctx.y + 5.5);
  doc.text("Rating", MARGIN + CONTENT_W - 38, ctx.y + 5.5);
  ctx.y += ROW_H;

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    ensureSpace(ROW_H);

    if (i % 2 === 0) {
      doc.setFillColor(22, 22, 26);
      doc.rect(MARGIN, ctx.y, CONTENT_W, ROW_H, "F");
    }

    const rowMid = ctx.y + 5.5;
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

    ctx.y += ROW_H;
  }

  gap(10);
}
