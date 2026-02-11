import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface WorkingWellProps {
  items: string[];
}

export const WorkingWell = ({ items }: WorkingWellProps) => {
  if (!items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-success/20 bg-success/5 p-5"
    >
      <h3 className="font-heading font-semibold text-success flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4" /> What's Working Well
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-secondary-foreground pl-5 relative before:content-['✓'] before:absolute before:left-0 before:text-success before:font-mono">
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};
