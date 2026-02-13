import { motion } from "framer-motion";
import { ExternalLink, ArrowLeft, FileDown, Copy, Check, Wand2 } from "lucide-react";
import { useState } from "react";
import { AuditResult } from "@/lib/audit-types";
import { ScoreCircle } from "./ScoreCircle";
import { ScorecardTable } from "./ScorecardTable";
import { WorkingWell } from "./WorkingWell";
import { CategoryDetail } from "./CategoryDetail";
import { CopyAsSkillModal } from "./CopyAsSkillModal";
import { Button } from "@/components/ui/button";
import { exportAuditToPdf } from "@/lib/export-pdf";
import { useToast } from "@/hooks/use-toast";

interface AuditResultsProps {
  result: AuditResult;
  onReset: () => void;
}

export const AuditResults = ({ result, onReset }: AuditResultsProps) => {
  const [copied, setCopied] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    const shareUrl = result.id
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-audit?id=${result.id}`
      : window.location.href;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

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

      {/* Export & Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-border">
        <Button onClick={() => setSkillModalOpen(true)} variant="outline" className="font-mono text-sm gap-2">
          <Wand2 className="w-4 h-4" /> Copy as Skill
        </Button>
        <Button onClick={() => exportAuditToPdf(result)} variant="outline" className="font-mono text-sm gap-2">
          <FileDown className="w-4 h-4" /> Download PDF
        </Button>
        <Button onClick={handleCopyLink} variant="outline" className="font-mono text-sm gap-2">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </Button>
        <Button onClick={onReset} variant="outline" className="font-mono text-sm">
          Run Another Audit
        </Button>
      </div>

      <CopyAsSkillModal open={skillModalOpen} onOpenChange={setSkillModalOpen} result={result} />
    </div>
  );
};
