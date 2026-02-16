import { AuditResult } from "@/lib/audit-types";
import { PdfContext, GREEN, WHITE, GRAY, LIGHT_GRAY, scoreColor } from "./pdf-types";

export function renderHeader(ctx: PdfContext, result: AuditResult) {
  const { writeText, gap, divider } = ctx;

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

  // Overall score
  divider();
  const sc = scoreColor(result.overall_score);
  const scoreLabel =
    result.overall_score >= 80
      ? "Launch Ready"
      : result.overall_score >= 50
        ? "Strong Foundation, Critical Gaps"
        : "Needs Significant Work";

  writeText("OVERALL SCORE", 9, "bold", GRAY);
  gap(6);
  writeText(`${result.overall_score} / 100`, 26, "bold", sc);
  gap(3);
  writeText(scoreLabel, 10, "normal", sc);
  gap(8);

  // Working well
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
}
