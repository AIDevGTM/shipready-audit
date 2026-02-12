import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, ExternalLink } from "lucide-react";
import { AuditResult, CategoryRating, ratingConfig, getScoreColor, getScoreLabel } from "@/lib/audit-types";
import { RatingBadge } from "./RatingBadge";

interface AuditComparisonProps {
  auditA: AuditResult;
  auditB: AuditResult;
  onBack: () => void;
}

const ScoreDelta = ({ before, after }: { before: number; after: number }) => {
  const delta = after - before;
  if (delta === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="w-3 h-3" /> No change</span>;
  const positive = delta > 0;
  return (
    <span className={`text-xs font-mono font-medium flex items-center gap-0.5 ${positive ? "text-success" : "text-destructive"}`}>
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {positive ? "+" : ""}{delta} pts
    </span>
  );
};

const ratingOrder = { present_clear: 2, present_weak: 1, missing: 0 } as const;

const RatingDelta = ({ before, after }: { before: CategoryRating["rating"]; after: CategoryRating["rating"] }) => {
  const delta = ratingOrder[after] - ratingOrder[before];
  if (delta === 0) return <span className="text-[10px] text-muted-foreground">unchanged</span>;
  const positive = delta > 0;
  return (
    <span className={`text-[10px] font-mono font-medium ${positive ? "text-success" : "text-destructive"}`}>
      {positive ? "▲ improved" : "▼ regressed"}
    </span>
  );
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getDomain = (url: string) => {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
};

export const AuditComparison = ({ auditA, auditB, onBack }: AuditComparisonProps) => {
  // auditA = older, auditB = newer
  const [older, newer] = new Date(auditA.created_at ?? 0) <= new Date(auditB.created_at ?? 0)
    ? [auditA, auditB]
    : [auditB, auditA];

  const categoryMap = new Map<string, { old?: CategoryRating; new?: CategoryRating }>();
  older.categories.forEach((c) => categoryMap.set(c.category, { old: c }));
  newer.categories.forEach((c) => {
    const existing = categoryMap.get(c.category);
    if (existing) existing.new = c;
    else categoryMap.set(c.category, { new: c });
  });

  return (
    <div className="min-h-screen bg-background bg-grid">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-heading font-bold text-lg tracking-tight">
          <span className="text-gradient">Ship</span>Ready
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to history
          </button>
          <h1 className="text-2xl font-heading font-bold">Audit Comparison</h1>
          <p className="text-sm text-muted-foreground">Side-by-side comparison to track improvements.</p>
        </motion.div>

        {/* Overall Score Comparison */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-4">
          {[older, newer].map((audit, i) => {
            const color = getScoreColor(audit.overall_score);
            const { label } = getScoreLabel(audit.overall_score);
            return (
              <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {i === 0 ? "Before" : "After"}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(audit.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-heading font-bold border-2 shrink-0"
                    style={{ borderColor: color, color }}
                  >
                    {audit.overall_score}
                  </div>
                  <div>
                    <a href={audit.url} target="_blank" rel="noopener noreferrer" className="font-mono text-sm hover:text-primary transition-colors flex items-center gap-1">
                      {getDomain(audit.url)} <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-xs font-medium" style={{ color }}>{label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Delta summary */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-3 py-3 rounded-lg border border-border bg-card"
        >
          <span className="text-sm text-muted-foreground">Overall change:</span>
          <ScoreDelta before={older.overall_score} after={newer.overall_score} />
        </motion.div>

        {/* Category-by-category */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="font-heading font-semibold text-lg mb-3">Category Breakdown</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 p-3 bg-secondary/50 text-xs font-mono text-muted-foreground">
              <span>Category</span>
              <span className="w-24 text-center">Before</span>
              <span className="w-24 text-center">After</span>
              <span className="w-20 text-center">Change</span>
            </div>
            {Array.from(categoryMap.entries()).map(([category, { old: oldCat, new: newCat }]) => (
              <div key={category} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 p-3 border-t border-border items-center hover:bg-secondary/30 transition-colors">
                <span className="text-sm font-medium truncate">{category}</span>
                <div className="w-24 flex justify-center">
                  {oldCat ? <RatingBadge rating={oldCat.rating} /> : <span className="text-xs text-muted-foreground">—</span>}
                </div>
                <div className="w-24 flex justify-center">
                  {newCat ? <RatingBadge rating={newCat.rating} /> : <span className="text-xs text-muted-foreground">—</span>}
                </div>
                <div className="w-20 flex justify-center">
                  {oldCat && newCat ? (
                    <RatingDelta before={oldCat.rating} after={newCat.rating} />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">n/a</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recommendations diff */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="grid grid-cols-2 gap-4">
          {[
            { title: "Previously Working Well", items: older.working_well, label: "Before" },
            { title: "Now Working Well", items: newer.working_well, label: "After" },
          ].map(({ title, items, label }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{title}</h3>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">None listed</p>
              ) : (
                <ul className="space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="text-xs text-secondary-foreground pl-4 relative before:content-['✓'] before:absolute before:left-0 before:text-success before:font-mono">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
};
