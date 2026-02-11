import { motion } from "framer-motion";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { AuditResult } from "@/lib/audit-types";
import { ScoreCircle } from "./ScoreCircle";
import { ScorecardTable } from "./ScorecardTable";
import { WorkingWell } from "./WorkingWell";
import { CategoryDetail } from "./CategoryDetail";
import { Button } from "@/components/ui/button";

interface AuditResultsProps {
  result: AuditResult;
  onReset: () => void;
}

export const AuditResults = ({ result, onReset }: AuditResultsProps) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <button onClick={onReset} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> New audit
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-heading font-bold">GTM Readiness Audit</h1>
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-1 font-mono">
              {result.url} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ScoreCircle score={result.overall_score} />
        </div>
      </motion.div>

      {/* Working Well */}
      <WorkingWell items={result.working_well} />

      {/* Scorecard */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 className="font-heading font-semibold text-lg mb-3">Scorecard</h2>
        <ScorecardTable categories={result.categories} />
      </motion.div>

      {/* Detailed Findings */}
      <div>
        <h2 className="font-heading font-semibold text-lg mb-3">Detailed Findings</h2>
        <div className="space-y-2">
          {result.categories.map((cat, i) => (
            <CategoryDetail key={cat.category} category={cat} index={i} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-6 border-t border-border">
        <Button onClick={onReset} variant="outline" className="font-mono text-sm">
          Run Another Audit
        </Button>
      </div>
    </div>
  );
};
