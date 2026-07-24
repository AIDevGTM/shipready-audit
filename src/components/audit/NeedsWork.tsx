import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { CategoryRating } from "@/lib/audit-types";

interface NeedsWorkProps {
  categories: CategoryRating[];
}

export const NeedsWork = ({ categories }: NeedsWorkProps) => {
  const items = categories
    .filter((c) => c.rating === "missing" || c.rating === "present_weak")
    .map((c) => ({ category: c.category, summary: c.summary, rating: c.rating }));

  if (!items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-warning/20 bg-warning/5 p-5"
    >
      <h3 className="font-heading font-semibold text-warning flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4" /> What Needs Work
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-sm text-secondary-foreground pl-5 relative before:content-['✗'] before:absolute before:left-0 before:text-warning before:font-mono"
          >
            <span className="font-medium">{item.category}:</span> {item.summary}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};
