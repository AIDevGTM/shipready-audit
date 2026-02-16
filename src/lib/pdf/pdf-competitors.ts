import { AuditResult, ratingConfig } from "@/lib/audit-types";
import {
  PdfContext,
  WHITE,
  GRAY,
  LIGHT_GRAY,
  GREEN,
  RED,
  MARGIN,
  CONTENT_W,
  ratingColor,
  scoreColor,
  sanitizePdfText,
} from "./pdf-types";

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function renderCompetitors(
  ctx: PdfContext,
  result: AuditResult,
  competitors: AuditResult[]
) {
  const { doc, writeText, gap, ensureSpace, newPage } = ctx;
  const allResults = [result, ...competitors];

  newPage();
  writeText("COMPETITOR COMPARISON", 12, "bold", WHITE);
  gap(6);

  // Score overview row
  const COL_W = CONTENT_W / allResults.length;
  for (let i = 0; i < allResults.length; i++) {
    const r = allResults[i];
    const sc = scoreColor(r.overall_score);
    const x = MARGIN + i * COL_W;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY);
    doc.text(i === 0 ? "YOUR SITE" : "COMPETITOR", x + COL_W / 2, ctx.y, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_GRAY);
    doc.text(sanitizePdfText(getDomain(r.url)), x + COL_W / 2, ctx.y + 4, { align: "center" });

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...sc);
    doc.text(String(r.overall_score), x + COL_W / 2, ctx.y + 14, { align: "center" });
  }
  ctx.y += 20;
  gap(4);

  // Category comparison table
  const CAT_COL_W = CONTENT_W * 0.4;
  const RATING_COL_W = (CONTENT_W - CAT_COL_W) / allResults.length;
  const TBL_ROW_H = 7;

  // Header row
  ensureSpace(TBL_ROW_H);
  doc.setFillColor(30, 30, 35);
  doc.rect(MARGIN, ctx.y, CONTENT_W, TBL_ROW_H, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("Category", MARGIN + 3, ctx.y + 5);
  for (let i = 0; i < allResults.length; i++) {
    const lbl = i === 0 ? "You" : sanitizePdfText(getDomain(allResults[i].url));
    doc.text(lbl, MARGIN + CAT_COL_W + i * RATING_COL_W + RATING_COL_W / 2, ctx.y + 5, { align: "center" });
  }
  ctx.y += TBL_ROW_H;

  // Data rows
  const categories = result.categories.map(c => c.category);
  for (let ci = 0; ci < categories.length; ci++) {
    const catName = categories[ci];
    ensureSpace(TBL_ROW_H);

    if (ci % 2 === 0) {
      doc.setFillColor(22, 22, 26);
      doc.rect(MARGIN, ctx.y, CONTENT_W, TBL_ROW_H, "F");
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...WHITE);
    doc.text(sanitizePdfText(`${String(ci + 1).padStart(2, "0")}  ${catName}`), MARGIN + 3, ctx.y + 5);

    for (let i = 0; i < allResults.length; i++) {
      const cat = allResults[i].categories.find(c => c.category === catName);
      if (cat) {
        const rc = ratingColor(cat.rating);
        const rl = sanitizePdfText(ratingConfig[cat.rating].label);
        doc.setTextColor(...rc);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text(rl, MARGIN + CAT_COL_W + i * RATING_COL_W + RATING_COL_W / 2, ctx.y + 5, { align: "center" });
      } else {
        doc.setTextColor(...LIGHT_GRAY);
        doc.setFontSize(7);
        doc.text("-", MARGIN + CAT_COL_W + i * RATING_COL_W + RATING_COL_W / 2, ctx.y + 5, { align: "center" });
      }
    }
    ctx.y += TBL_ROW_H;
  }

  // Overall score row
  ensureSpace(TBL_ROW_H + 2);
  doc.setFillColor(30, 30, 35);
  doc.rect(MARGIN, ctx.y, CONTENT_W, TBL_ROW_H + 1, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("Overall Score", MARGIN + 3, ctx.y + 5.5);
  for (let i = 0; i < allResults.length; i++) {
    const r = allResults[i];
    const sc = scoreColor(r.overall_score);
    doc.setTextColor(...sc);
    doc.text(String(r.overall_score), MARGIN + CAT_COL_W + i * RATING_COL_W + RATING_COL_W / 2, ctx.y + 5.5, { align: "center" });
  }
  ctx.y += TBL_ROW_H + 2;
  gap(8);

  // Competitive Insights
  renderInsights(ctx, result, competitors);

  gap(4);
}

function renderInsights(
  ctx: PdfContext,
  result: AuditResult,
  competitors: AuditResult[]
) {
  const { writeText, gap, ensureSpace } = ctx;

  const ratingValue = (r: string) =>
    r === "present_clear" ? 2 : r === "present_weak" ? 1 : 0;

  const ahead: string[] = [];
  const behind: string[] = [];

  for (const cat of result.categories) {
    const pVal = ratingValue(cat.rating);
    for (const comp of competitors) {
      const compCat = comp.categories.find(c => c.category === cat.category);
      if (!compCat) continue;
      const cVal = ratingValue(compCat.rating);
      if (pVal > cVal && !ahead.includes(cat.category)) ahead.push(cat.category);
      else if (pVal < cVal && !behind.includes(cat.category)) behind.push(cat.category);
    }
  }

  if (ahead.length === 0 && behind.length === 0) return;

  ensureSpace(20);
  writeText("COMPETITIVE INSIGHTS", 10, "bold", WHITE);
  gap(4);

  if (ahead.length > 0) {
    writeText(`You're Ahead (${ahead.length})`, 9, "bold", GREEN);
    gap(1);
    for (const cat of ahead) {
      writeText(`- ${cat}`, 8, "normal", [190, 220, 190]);
      gap(0.5);
    }
    gap(3);
  }

  if (behind.length > 0) {
    writeText(`They're Ahead (${behind.length})`, 9, "bold", RED);
    gap(1);
    for (const cat of behind) {
      writeText(`- ${cat}`, 8, "normal", [220, 180, 180]);
      gap(0.5);
    }
    gap(3);
  }
}
