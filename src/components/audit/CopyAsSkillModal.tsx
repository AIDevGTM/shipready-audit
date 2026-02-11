import { useState, useEffect } from "react";
import { Copy, Check, Download, Wand2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuditResult } from "@/lib/audit-types";
import { generateSkillContent, getFileName, SkillMode, SkillFormat } from "@/lib/skill-content";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CopyAsSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AuditResult;
}

const MODE_OPTIONS: { value: SkillMode; label: string }[] = [
  { value: "generic", label: "Generic Framework" },
  { value: "personalized", label: "My Audit" },
];

const FORMAT_TABS: { value: SkillFormat; label: string }[] = [
  { value: "claude_skill", label: "Claude Skill" },
  { value: "system_prompt", label: "System Prompt" },
  { value: "cursor_rules", label: "Cursor / IDE" },
];

export const CopyAsSkillModal = ({ open, onOpenChange, result }: CopyAsSkillModalProps) => {
  const [mode, setMode] = useState<SkillMode>("generic");
  const [format, setFormat] = useState<SkillFormat>("claude_skill");
  const [copied, setCopied] = useState(false);
  const [exportCount, setExportCount] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    supabase
      .from("skill_exports")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => setExportCount(count ?? 0));
  }, [open]);

  const content = generateSkillContent(mode, format, result);

  const trackExport = async (action: "copy" | "download") => {
    try {
      await supabase.from("skill_exports").insert({
        audit_id: result.id ?? null,
        mode,
        format,
        action,
      });
    } catch {
      // non-critical
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    await trackExport("copy");
    toast({
      title: "✓ Copied!",
      description: "Share it with your team or drop it in your AI workflow. Run audits automatically → ship-ready.xyz",
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = async () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getFileName(format);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    await trackExport("download");
    toast({ title: "Downloaded!", description: getFileName(format) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[hsl(240_6%_7%)] border-border p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" /> Copy as Skill
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Share this audit framework as a reusable AI prompt for your team or community.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-secondary p-1 w-fit">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  mode === opt.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Format Tabs */}
          <div className="flex rounded-lg bg-secondary p-1 w-fit">
            {FORMAT_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFormat(tab.value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  format === tab.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Code Preview */}
          <ScrollArea className="flex-1 min-h-0 max-h-[400px] rounded-lg bg-background border border-border">
            <pre className="p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </pre>
          </ScrollArea>
        </div>

        {/* Actions Footer */}
        <div className="p-6 pt-4 flex flex-wrap items-center gap-3 border-t border-border">
          <Button
            onClick={handleCopy}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="gap-2 font-mono text-sm"
          >
            <Download className="w-4 h-4" /> Download File
          </Button>
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            {exportCount !== null && exportCount >= 50
              ? `Used by ${exportCount} teams`
              : "Join early adopters"}
            <span className="mx-1">·</span>
            ship-ready.xyz
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
