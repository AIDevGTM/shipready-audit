import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Plus, X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuditResult, CategoryRating, ratingConfig, getScoreColor, AUDIT_CATEGORIES } from "@/lib/audit-types";
import { RatingBadge } from "./RatingBadge";
import { ScoreCircle } from "./ScoreCircle";
import { useToast } from "@/hooks/use-toast";

interface CompetitorComparisonProps {
  primaryResult: AuditResult;
  onClose: () => void;
}

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str.startsWith("http") ? str : `https://${str}`);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export const CompetitorComparison = ({ primaryResult, onClose }: CompetitorComparisonProps) => {
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([""]);
  const [competitorResults, setCompetitorResults] = useState<AuditResult[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [currentAuditIndex, setCurrentAuditIndex] = useState(-1);
  const [errors, setErrors] = useState<(string | null)[]>([null]);
  const { toast } = useToast();

  const allResults = [primaryResult, ...competitorResults];
  const showComparison = competitorResults.length > 0;

  const addCompetitorField = () => {
    if (competitorUrls.length < 2) {
      setCompetitorUrls([...competitorUrls, ""]);
      setErrors([...errors, null]);
    }
  };

  const removeCompetitorField = (index: number) => {
    setCompetitorUrls(competitorUrls.filter((_, i) => i !== index));
    setErrors(errors.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const updated = [...competitorUrls];
    updated[index] = value;
    setCompetitorUrls(updated);
    const updatedErrors = [...errors];
    updatedErrors[index] = null;
    setErrors(updatedErrors);
  };

  const runComparison = async () => {
    // Validate all URLs
    const newErrors = competitorUrls.map((u) => {
      const trimmed = u.trim();
      if (!trimmed) return "Please enter a URL";
      if (!isValidUrl(trimmed)) return "Invalid URL";
      return null;
    });
    setErrors(newErrors);
    if (newErrors.some((e) => e !== null)) return;

    setIsAuditing(true);
    const results: AuditResult[] = [];

    for (let i = 0; i < competitorUrls.length; i++) {
      setCurrentAuditIndex(i);
      let formattedUrl = competitorUrls[i].trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-site`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ url: formattedUrl }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Audit failed" }));
          throw new Error(err.error || `Audit failed (${resp.status})`);
        }

        const data: AuditResult = await resp.json();
        results.push(data);
      } catch (err: any) {
        toast({
          title: `Failed to audit ${getDomain(competitorUrls[i])}`,
          description: err.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    }

    setCompetitorResults(results);
    setIsAuditing(false);
    setCurrentAuditIndex(-1);
  };

  if (isAuditing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border border-border rounded-lg p-8 text-center space-y-4"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground font-mono">
          Auditing competitor {currentAuditIndex + 1} of {competitorUrls.length}...
        </p>
        <p className="text-xs text-muted-foreground">
          {getDomain(competitorUrls[currentAuditIndex] || "")}
        </p>
      </motion.div>
    );
  }

  if (showComparison) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-lg">Competitor Comparison</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" /> Close
          </Button>
        </div>

        {/* Score overview */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${allResults.length}, 1fr)` }}>
          {allResults.map((r, i) => (
            <div key={r.url} className={`text-center p-4 rounded-lg border ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/30"}`}>
              <p className="text-xs font-mono text-muted-foreground mb-2 truncate" title={r.url}>
                {getDomain(r.url)}
              </p>
              <div className="flex justify-center">
                <ScoreCircle score={r.overall_score} />
              </div>
              {i === 0 && (
                <span className="inline-block mt-2 text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  YOUR SITE
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Category comparison table */}
        <div className="border border-border rounded-lg overflow-x-auto">
          {/* Header */}
          <div
            className="grid gap-2 p-3 bg-secondary/50 text-xs font-mono text-muted-foreground"
            style={{ gridTemplateColumns: `2fr repeat(${allResults.length}, 1fr)` }}
          >
            <span>Category</span>
            {allResults.map((r, i) => (
              <span key={r.url} className="text-center truncate">
                {i === 0 ? "You" : getDomain(r.url)}
              </span>
            ))}
          </div>

          {/* Rows */}
          {AUDIT_CATEGORIES.map((catName, catIdx) => (
            <div
              key={catName}
              className="grid gap-2 p-3 border-t border-border items-center hover:bg-secondary/30 transition-colors"
              style={{ gridTemplateColumns: `2fr repeat(${allResults.length}, 1fr)` }}
            >
              <span className="text-sm font-medium">
                <span className="text-xs font-mono text-muted-foreground mr-2">{String(catIdx + 1).padStart(2, "0")}</span>
                {catName}
              </span>
              {allResults.map((r) => {
                const cat = r.categories.find((c) => c.category === catName);
                return (
                  <div key={r.url} className="flex justify-center">
                    {cat ? <RatingBadge rating={cat.rating} /> : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Score totals row */}
          <div
            className="grid gap-2 p-3 border-t-2 border-border bg-secondary/30 font-semibold"
            style={{ gridTemplateColumns: `2fr repeat(${allResults.length}, 1fr)` }}
          >
            <span className="text-sm">Overall Score</span>
            {allResults.map((r) => (
              <span key={r.url} className="text-center text-lg font-heading" style={{ color: getScoreColor(r.overall_score) }}>
                {r.overall_score}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Input state - add competitor URLs
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-lg p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-sm">Compare with Competitors</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Add 1-2 competitor URLs to compare side by side</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
      </div>

      <div className="space-y-3">
        {competitorUrls.map((u, i) => (
          <div key={i} className="space-y-1">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="https://competitor.com"
                value={u}
                onChange={(e) => updateUrl(i, e.target.value)}
                className={`bg-secondary border-border font-mono text-sm h-10 ${errors[i] ? "border-destructive" : ""}`}
                maxLength={2048}
              />
              {competitorUrls.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeCompetitorField(i)} className="shrink-0 h-10 w-10 text-muted-foreground">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {errors[i] && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {errors[i]}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {competitorUrls.length < 2 && (
          <Button variant="ghost" size="sm" onClick={addCompetitorField} className="text-xs gap-1">
            <Plus className="w-3.5 h-3.5" /> Add another
          </Button>
        )}
        <Button onClick={runComparison} size="sm" className="ml-auto gap-2 font-heading">
          Compare <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
};
