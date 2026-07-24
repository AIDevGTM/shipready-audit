import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Scan, MessageSquareText, Wand2, AlertTriangle, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProcessingState } from "@/components/audit/ProcessingState";
import { AuditResults } from "@/components/audit/AuditResults";
import { AuditResult } from "@/lib/audit-types";
import { useToast } from "@/hooks/use-toast";

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str.startsWith("http") ? str : `https://${str}`);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const Index = () => {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "processing" | "results">("idle");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load shared audit from ?audit=<id> query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auditId = params.get("audit");
    if (!auditId) return;

    const loadAudit = async () => {
      setState("processing");
      try {
        const { data, error } = await supabase
          .from("audits_public")
          .select("*")
          .eq("id", auditId)
          .maybeSingle();

        if (error || !data) {
          toast({ title: "Audit not found", description: "This audit link may be invalid or expired.", variant: "destructive" });
          setState("idle");
          return;
        }

        setResult({
          id: data.id!,
          url: data.url!,
          overall_score: data.overall_score!,
          categories: data.categories as unknown as AuditResult["categories"],
          working_well: data.working_well as unknown as AuditResult["working_well"],
        });
        setState("results");
      } catch {
        toast({ title: "Failed to load audit", variant: "destructive" });
        setState("idle");
      }
    };

    loadAudit();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl(trimmed)) {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    let formattedUrl = trimmed;
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setState("processing");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000); // 90s client timeout

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
      setResult(data);
      setState("results");
    } catch (err: any) {
      console.error("Audit error:", err);
      if (err.name === "AbortError") {
        toast({ title: "Timeout", description: "The audit took too long. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Audit failed", description: err.message || "Something went wrong.", variant: "destructive" });
      }
      setState("idle");
    }
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setUrl("");
    setError(null);
  };

  if (state === "processing") {
    return (
      <div className="min-h-screen bg-background bg-grid">
        <ProcessingState />
      </div>
    );
  }

  if (state === "results" && result) {
    return (
      <div className="min-h-screen bg-background">
        <AuditResults result={result} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2 font-heading font-bold text-lg tracking-tight">
          <span className="font-mono text-sm text-primary border border-primary/30 rounded-md px-1.5 py-0.5 leading-none">&gt;_</span>
          <span><span className="text-gradient">Ship</span>Ready</span>
        </span>
      </header>

      {/* Hero */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 pb-20">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[440px] hero-glow" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-xs font-mono text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            10-point GTM audit · AI &amp; dev tools
          </div>

          <h1 className="text-4xl sm:text-6xl font-heading font-bold leading-[1.05] tracking-tight">
            Is your AI or dev tool homepage
            <br />
            <span className="text-gradient">ready to convert?</span>
          </h1>

          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Paste your URL — get a free, 10-point GTM readiness audit in&nbsp;~60&nbsp;seconds.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2 max-w-lg mx-auto mt-8">
            <div className="flex-1 space-y-1">
              <Input
                type="text"
                placeholder="https://your-dev-tool.com"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); }}
                className={`bg-secondary border-border font-mono text-sm h-11 focus-visible:ring-primary ${error ? "border-destructive" : ""}`}
                maxLength={2048}
              />
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {error}
                </p>
              )}
            </div>
            <Button type="submit" className="h-11 px-5 gap-2 font-heading font-medium glow-green shrink-0">
              Run Audit <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-xs font-mono text-muted-foreground/70">
            no signup · free · ~60s
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-3 justify-center mt-12"
        >
          {[
            { icon: Scan, label: "10-Point Audit" },
            { icon: MessageSquareText, label: "Actionable Recommendations" },
            { icon: Wand2, label: "Copy as AI Skill" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm text-muted-foreground">
              <Icon className="w-3.5 h-3.5 text-primary" />
              {label}
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 space-y-2">
        <p className="text-xs text-muted-foreground">
          Built by <a href="https://thedevtoolgtmcompany.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">Shane O'Connor</a> · The DevTool GTM Company
        </p>
        <a
          href="https://www.linkedin.com/in/devtoolgtm/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Linkedin className="w-3.5 h-3.5" /> LinkedIn
        </a>
      </footer>
    </div>
  );
};

export default Index;
