import { useEffect, useState, useRef, useCallback } from "react";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const STAGES = [
  { label: "Initiating" },
  { label: "Creating files" },
  { label: "Researching" },
  { label: "Filtering" },
  { label: "Generating" },
  { label: "Organizing" },
  { label: "Output ready!" },
];

const STAGE_DURATIONS = [5_000, 10_000, 20_000, 15_000, 20_000, Infinity];

interface WorkflowProgressBarProps {
  active: boolean;
  completedStatus: "success" | "failed" | null;
  onReset: () => void;
  onRetry?: () => void;
  errorMessage?: string;
  initialElapsed?: number;
}

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function computeInitialStage(elapsedMs: number): number {
  let accumulated = 0;
  for (let i = 0; i < STAGE_DURATIONS.length; i++) {
    if (STAGE_DURATIONS[i] === Infinity) return i;
    accumulated += STAGE_DURATIONS[i];
    if (elapsedMs < accumulated) return i;
  }
  return 5;
}

export default function WorkflowProgressBar({
  active, completedStatus, onReset, onRetry, errorMessage, initialElapsed,
}: WorkflowProgressBarProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fastForwardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number>(Date.now());
  const isMobile = useIsMobile();

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    if (fastForwardRef.current) { clearTimeout(fastForwardRef.current); fastForwardRef.current = null; }
  }, []);

  useEffect(() => {
    if (!active || completedStatus) return;

    const initElapsed = initialElapsed || 0;
    const initStage = computeInitialStage(initElapsed);

    setStageIndex(initStage);
    setIsPulsing(initStage >= 5);
    setElapsed(initElapsed);
    startRef.current = Date.now() - initElapsed;

    elapsedRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 1000);

    if (initStage >= 5) return cleanup;

    let current = initStage;
    let remaining = STAGE_DURATIONS.slice(0, initStage + 1).reduce((a, b) => a + b, 0) - initElapsed;
    if (remaining < 0) remaining = 0;

    const advance = () => {
      if (current < 5) {
        current++;
        setStageIndex(current);
        if (current < 5) {
          timerRef.current = setTimeout(advance, STAGE_DURATIONS[current]);
        } else {
          setIsPulsing(true);
        }
      }
    };

    timerRef.current = setTimeout(advance, Math.max(remaining, 100));
    return cleanup;
  }, [active, completedStatus, cleanup, initialElapsed]);

  useEffect(() => {
    if (completedStatus === "success") {
      cleanup();
      setIsPulsing(false);
      // Immediately jump to final stage
      setStageIndex(6);
    } else if (completedStatus === "failed") {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (fastForwardRef.current) { clearTimeout(fastForwardRef.current); fastForwardRef.current = null; }
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
      setIsPulsing(false);
    }
  }, [completedStatus]);

  useEffect(() => cleanup, [cleanup]);

  if (!active && !completedStatus) return null;

  const isDone = completedStatus === "success" && stageIndex === 6;
  const isFailed = completedStatus === "failed";
  const isRunning = active && !completedStatus;

  if (isMobile) {
    const currentLabel = isFailed
      ? "Workflow failed"
      : STAGES[stageIndex]?.label || "Processing...";
    const displayLabel = isPulsing && stageIndex === 5 ? "Waiting for results..." : currentLabel;
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
          <p className="text-xs text-muted-foreground">Running for {formatElapsed(elapsed)}</p>
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
          const showWaiting = isPulsing && i === 5 && isActive;

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

      <div className="h-6 flex items-center">
        {isRunning && (
          <span className="text-xs text-muted-foreground">Running for {formatElapsed(elapsed)}</span>
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
