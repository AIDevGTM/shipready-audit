import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AUDIT_CATEGORIES } from "@/lib/audit-types";
import { Loader2 } from "lucide-react";

const stepMessages = AUDIT_CATEGORIES.map((c) => `Analyzing ${c.toLowerCase()}...`);

export const ProcessingState = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < stepMessages.length - 1 ? prev + 1 : prev));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="relative">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>

      <div className="text-center space-y-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="font-mono text-sm text-primary"
          >
            {stepMessages[currentStep]}
          </motion.p>
        </AnimatePresence>

        <div className="flex gap-1 justify-center">
          {stepMessages.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-6 rounded-full transition-colors duration-300 ${
                i <= currentStep ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">This usually takes 30–60 seconds</p>
    </div>
  );
};
