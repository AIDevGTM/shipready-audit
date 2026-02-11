import { RatingLevel, ratingConfig } from "@/lib/audit-types";

interface RatingBadgeProps {
  rating: RatingLevel;
}

export const RatingBadge = ({ rating }: RatingBadgeProps) => {
  const config = ratingConfig[rating];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-mono ${config.bgClass} ${config.textClass}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
};
