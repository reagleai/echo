import { useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ShowcaseDialog from "@/components/ShowcaseDialog";

export interface WhyLockedFabRef {
  shake: () => void;
}

interface Props {
  inline?: boolean;
}

const WhyLockedFab = forwardRef<WhyLockedFabRef, Props>(({ inline }, ref) => {
  const [shaking, setShaking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    shake: () => {
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    },
  }));

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        className={cn(
          "z-50 gap-2 rounded-full shadow-lg px-5 py-3 text-sm font-semibold transition-transform",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          inline ? "relative w-full sm:w-auto" : "fixed bottom-6 right-6",
          shaking && "animate-bounce"
        )}
        size="lg"
      >
        <Lock className="h-4 w-4" />
        Why is this locked?
      </Button>
      <ShowcaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
});

WhyLockedFab.displayName = "WhyLockedFab";
export default WhyLockedFab;
