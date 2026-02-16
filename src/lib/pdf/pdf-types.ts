import jsPDF from "jspdf";

export type RGB = [number, number, number];

export const BG: RGB = [15, 15, 17];
export const WHITE: RGB = [240, 240, 240];
export const GRAY: RGB = [160, 160, 160];
export const LIGHT_GRAY: RGB = [130, 130, 130];
export const GREEN: RGB = [34, 197, 94];
export const AMBER: RGB = [245, 158, 11];
export const RED: RGB = [239, 68, 68];
export const BLUE: RGB = [96, 165, 250];

export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN = 18;
export const CONTENT_W = PAGE_W - MARGIN * 2;
export const BOTTOM_LIMIT = PAGE_H - 20;

export function ratingColor(rating: string): RGB {
  if (rating === "present_clear") return GREEN;
  if (rating === "present_weak") return AMBER;
  return RED;
}

export function scoreColor(score: number): RGB {
  return score >= 80 ? GREEN : score >= 50 ? AMBER : RED;
}

/**
 * jsPDF built-in fonts are WinAnsi/limited Unicode.
 * Normalize + remap to safe ASCII to keep layout stable.
 */
export function sanitizePdfText(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u00A0/g, " ")
      .replace(/\u2022/g, "-")
      .replace(/\u2713/g, "v")
      .replace(/\u2714/g, "v")
      .replace(/\u2715/g, "x")
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trimEnd()
  );
}

/** Shared drawing context passed to each section renderer */
export interface PdfContext {
  doc: jsPDF;
  y: number;
  writeText: (
    text: string,
    fontSize: number,
    style?: "normal" | "bold",
    color?: RGB,
    indent?: number
  ) => void;
  gap: (h?: number) => void;
  divider: () => void;
  ensureSpace: (needed: number) => void;
  newPage: () => void;
}
