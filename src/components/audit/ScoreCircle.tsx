import { motion } from "framer-motion";
import { getScoreColor, getScoreLabel } from "@/lib/audit-types";

interface ScoreCircleProps {
  score: number;
}

export const ScoreCircle = ({ score }: ScoreCircleProps) => {
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);
  const { label, colorClass } = getScoreLabel(score);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative score-circle">
        <svg width="140" height="140" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(240 4% 16%)" strokeWidth="6" />
          <motion.circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-heading font-bold"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <p className={`text-sm font-medium ${colorClass}`}>{label}</p>
    </div>
  );
};
