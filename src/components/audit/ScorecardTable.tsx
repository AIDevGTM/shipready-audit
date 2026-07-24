import { CategoryRating } from "@/lib/audit-types";
import { RatingBadge } from "./RatingBadge";

interface ScorecardTableProps {
  categories: CategoryRating[];
}

export const ScorecardTable = ({ categories }: ScorecardTableProps) => {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-3 bg-secondary/50 text-xs font-mono text-muted-foreground">
        <span className="w-5">#</span>
        <span>Category</span>
        <span>Rating</span>
      </div>
      {categories.map((cat, i) => (
        <div
          key={cat.category}
          className="grid grid-cols-[auto_1fr_auto] gap-4 p-3 border-t border-border items-center hover:bg-secondary/30 transition-colors"
        >
          <span className="text-xs font-mono text-muted-foreground w-5">{String(i + 1).padStart(2, "0")}</span>
          <span className="text-sm font-medium truncate">
            {cat.category}
            {cat.category === "Design Partner / Early Access" && (
              <span className="ml-1.5 text-[10px] font-mono text-muted-foreground align-middle">(early-stage only)</span>
            )}
          </span>
          <RatingBadge rating={cat.rating} />
        </div>
      ))}
    </div>
  );
};
