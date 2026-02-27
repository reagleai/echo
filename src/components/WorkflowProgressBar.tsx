import { useEffect, useState, useRef, useCallback } from "react";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export type RunState =
  | "idle"
  | "initiating"
  | "processing"
  | "completing"
  | "done"
  | "failed";

const STAGES = [
  { label: "Initiating" },
  { label: "Searching LinkedIn" },
  { label: "Validating Posts" },
  { label: "Extracting Content" },
  { label: "Generating Comments" },
  { label: "Saving to Sheet" },
  { label: "Output Ready ✓" },
];

const STEP_TIMINGS = [
  0,      // Initiating (immediate)
  0,      // Searching LinkedIn (immediate on processing)
  20000,  // Validating Posts (~20s after step 2)
  40000,  // Extracting Content (~40s after step 3)
  60000,  // Generating Comments (~60s after step 4)
];

interface WorkflowProgressBarProps {
  runState: RunState;
  onReset: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  errorMessage?: string;
}

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function WorkflowProgressBar({
  runState, onReset, onRetry, onCancel, errorMessage,
}: WorkflowProgressBarProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(Date.now());
  const isMobile = useIsMobile();

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
  }, []);

  // Timer loop
  useEffect(() => {
    if (runState === "idle") {
      cleanup();
      setStageIndex(0);
      setElapsed(0);
      return;
    }

    if (runState === "initiating") {
      startRef.current = Date.now();
      elapsedRef.current = setInterval(() => {
        setElapsed(Date.now() - startRef.current);
      }, 1000);
      setStageIndex(0);
    } else if (runState === "processing") {
      setStageIndex(1); // Jump to Searching LinkedIn

      let currentStep = 1;
      const advance = () => {
        if (currentStep < 4) {
          currentStep++;
          setStageIndex(currentStep);
          timerRef.current = setTimeout(advance, STEP_TIMINGS[currentStep]);
        }
      };

      timerRef.current = setTimeout(advance, STEP_TIMINGS[2]); // schedule next step
    } else if (runState === "completing") {
      setStageIndex(5);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    } else if (runState === "done") {
      setStageIndex(6);
      cleanup();
    } else if (runState === "failed") {
      cleanup();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runState, cleanup]);

  useEffect(() => cleanup, [cleanup]);

  const isDone = runState === "done";
  const isFailed = runState === "failed";
  const isRunning = runState === "initiating" || runState === "processing" || runState === "completing";
  // It's pulsing if it's processing or completing but hasn't reached done/fail
  const isPulsing = isRunning;

  if (runState === "idle") return null;

  if (isMobile) {
    const currentLabel = isFailed
      ? "Workflow failed"
      : STAGES[stageIndex]?.label || "Processing...";
    const displayLabel = isPulsing && stageIndex === 4 ? "Waiting for results..." : currentLabel;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : isFailed ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className={cn(
            "text-sm font-medium",
            isDone && "text-success",
            isFailed && "text-destructive",
            isPulsing && "animate-pulse"
          )}>
            Step {stageIndex + 1}/7 — {displayLabel}
          </span>
        </div>
        {isFailed && errorMessage && (
          <p className="text-xs text-destructive/80 pl-6">{errorMessage}</p>
        )}
        {isRunning && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Running for {formatElapsed(elapsed)}</p>
            {onCancel && runState === "processing" && (
              <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Cancel run</button>
            )}
          </div>
        )}
        {(isDone || isFailed) && (
          <div className="flex items-center gap-3">
            {isFailed && onRetry && (
              <button onClick={onRetry} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            )}
            <button onClick={onReset} className="text-xs font-medium text-primary hover:underline">
              Run another workflow
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center w-full">
        {STAGES.map((stage, i) => {
          const isCompleted = i < stageIndex;
          const isActive = i === stageIndex && !isDone && !isFailed;
          const isFinal = i === 6 && isDone;
          const isFuture = i > stageIndex;
          const showWaiting = isPulsing && i === 4 && isActive;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center relative">
                <motion.div
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors duration-300",
                    isCompleted && "bg-primary/20 border-primary/40 text-primary",
                    isActive && "bg-primary border-primary text-primary-foreground",
                    isFinal && "bg-success border-success text-success-foreground",
                    isFuture && "bg-transparent border-border text-muted-foreground/40",
                    isFailed && isActive && "bg-destructive border-destructive text-destructive-foreground",
                    isActive && !isFailed && "shadow-[0_0_12px_hsl(200_30%_68%/0.4)]",
                    isPulsing && isActive && "animate-pulse"
                  )}
                >
                  {isCompleted || isFinal ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : isFailed && isActive ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </motion.div>

                <span
                  className={cn(
                    "absolute top-9 text-[10px] whitespace-nowrap font-medium transition-all duration-300",
                    isCompleted && "text-muted-foreground/60",
                    isActive && !isFailed && "text-primary",
                    isFinal && "text-success",
                    isFailed && isActive && "text-destructive",
                    isFuture && "text-muted-foreground/30",
                    isPulsing && isActive && "animate-pulse"
                  )}
                >
                  {isFailed && isActive ? "Failed" : showWaiting ? "Waiting for results..." : stage.label}
                </span>
              </div>

              {i < STAGES.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-1 transition-all duration-300",
                  i < stageIndex
                    ? "bg-primary/30"
                    : "border-t border-dashed border-border"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {isFailed && errorMessage && (
        <p className="text-xs text-destructive/80 mt-1">{errorMessage}</p>
      )}

      <div className="h-6 flex items-center justify-between">
        {isRunning && (
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Running for {formatElapsed(elapsed)}</span>
            {onCancel && runState === "processing" && (
              <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Cancel run</button>
            )}
          </div>
        )}
        {(isDone || isFailed) && (
          <div className="flex items-center gap-3">
            {isFailed && onRetry && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onRetry}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </motion.button>
            )}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onReset}
              className="text-xs font-medium text-primary hover:underline"
            >
              Run another workflow
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
