import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckCircle2, AlertCircle, Lightbulb, Flag } from "lucide-react";
import { CategoryRating } from "@/lib/audit-types";
import { RatingBadge } from "./RatingBadge";

interface CategoryDetailProps {
  category: CategoryRating;
  index: number;
}

const priorityColors: Record<string, string> = {
  "Quick Win": "text-success",
  "Important": "text-warning",
  "Nice to Have": "text-muted-foreground",
};

export const CategoryDetail = ({ category, index }: CategoryDetailProps) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border rounded-lg overflow-hidden bg-card"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{String(index + 1).padStart(2, "0")}</span>
          <span className="font-heading font-medium text-sm truncate">{category.category}</span>
          <RatingBadge rating={category.rating} />
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">{category.summary}</p>

              {category.found.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-success mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> What We Found
                  </h4>
                  <ul className="space-y-1">
                    {category.found.map((item, i) => (
                      <li key={i} className="text-sm text-secondary-foreground pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {category.missing.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-destructive mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> What's Missing
                  </h4>
                  <ul className="space-y-1">
                    {category.missing.map((item, i) => (
                      <li key={i} className="text-sm text-secondary-foreground pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {category.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-primary mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" /> Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {category.recommendations.map((item, i) => (
                      <li key={i} className="text-sm text-secondary-foreground pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                <Flag className="w-3 h-3 text-muted-foreground" />
                <span className={`text-xs font-mono ${priorityColors[category.priority] || "text-muted-foreground"}`}>
                  {category.priority}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
