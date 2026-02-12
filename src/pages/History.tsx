import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Clock, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuditResult } from "@/lib/audit-types";
import { getScoreColor, getScoreLabel } from "@/lib/audit-types";
import { AuditResults } from "@/components/audit/AuditResults";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditRow {
  id: string;
  url: string;
  overall_score: number;
  working_well: string[];
  categories: any[];
  created_at: string;
}

const History = () => {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<AuditResult | null>(null);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const res = await supabase.functions.invoke("get-audit-history");
        const data = res.data;
        if (Array.isArray(data)) {
          setAudits(
            data.map((d: any) => ({
              id: d.id,
              url: d.url,
              overall_score: d.overall_score ?? 0,
              working_well: (d.working_well as string[]) ?? [],
              categories: (d.categories as any[]) ?? [],
              created_at: d.created_at,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch audit history:", err);
      }
      setLoading(false);
    };
    fetchAudits();
  }, []);

  const handleViewAudit = (audit: AuditRow) => {
    setSelectedAudit({
      id: audit.id,
      url: audit.url,
      overall_score: audit.overall_score,
      working_well: audit.working_well,
      categories: audit.categories as any,
      created_at: audit.created_at,
    });
  };

  if (selectedAudit) {
    return (
      <div className="min-h-screen bg-background">
        <AuditResults result={selectedAudit} onReset={() => setSelectedAudit(null)} />
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-heading font-bold text-lg tracking-tight">
          <span className="text-gradient">Ship</span>Ready
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to audit
          </Link>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Audit History
          </h1>
          <p className="text-sm text-muted-foreground">
            All past audits — click any to view full results.
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : audits.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-heading font-medium">No audits yet</p>
            <p className="text-sm mt-1">
              Run your first audit from the{" "}
              <Link to="/" className="text-primary hover:underline">
                homepage
              </Link>
              .
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            {audits.map((audit, i) => {
              const scoreColor = getScoreColor(audit.overall_score);
              const { label } = getScoreLabel(audit.overall_score);
              return (
                <motion.button
                  key={audit.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleViewAudit(audit)}
                  className="w-full text-left flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors group"
                >
                  {/* Score */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-heading font-bold border-2 shrink-0"
                    style={{ borderColor: scoreColor, color: scoreColor }}
                  >
                    {audit.overall_score}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium truncate">
                        {getDomain(audit.url)}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span
                        className="text-xs font-medium"
                        style={{ color: scoreColor }}
                      >
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(audit.created_at)}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </main>

      <footer className="text-center py-6">
        <p className="text-xs text-muted-foreground">
          Built by Shane O'Connor @{" "}
          <a
            href="https://www.memco.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors underline underline-offset-2"
          >
            The Memory Company
          </a>
        </p>
      </footer>
    </div>
  );
};

export default History;
