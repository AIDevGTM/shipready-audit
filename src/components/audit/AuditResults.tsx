import { motion } from "framer-motion";
import { ExternalLink, ArrowLeft, FileDown, Copy, Check, Wand2, GitCompareArrows } from "lucide-react";
import { useState } from "react";
import { AuditResult } from "@/lib/audit-types";
import { ScoreCircle } from "./ScoreCircle";
import { ScorecardTable } from "./ScorecardTable";
import { WorkingWell } from "./WorkingWell";
import { NeedsWork } from "./NeedsWork";
import { CategoryDetail } from "./CategoryDetail";
import { CopyAsSkillModal } from "./CopyAsSkillModal";
import { CompetitorComparison } from "./CompetitorComparison";
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
  const [showComparison, setShowComparison] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    const appOrigin = "https://ship-readyxyz.lovable.app";
    const shareUrl = result.id
      ? `${appOrigin}/?audit=${result.id}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
    }
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
            {result.rendered_with_firecrawl && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-mono text-accent-foreground bg-accent/50 px-2 py-0.5 rounded-full">
                🔥 JS-rendered content detected — analyzed with Firecrawl
              </span>
            )}
          </div>
          <ScoreCircle score={result.overall_score} />
        </div>
      </motion.div>

      {/* Working Well */}
      <WorkingWell items={result.working_well} />

      {/* Needs Work */}
      <NeedsWork categories={result.categories} />

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

      {/* Competitor Comparison */}
      {showComparison && (
        <CompetitorComparison primaryResult={result} onClose={() => setShowComparison(false)} />
      )}

      {/* Export & Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-border">
        {!showComparison && (
          <Button onClick={() => setShowComparison(true)} variant="outline" className="font-mono text-sm gap-2">
            <GitCompareArrows className="w-4 h-4" /> Compare Competitors
          </Button>
        )}
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
