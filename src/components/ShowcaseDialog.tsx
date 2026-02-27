import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface ShowcaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShowcaseDialog({ open, onOpenChange }: ShowcaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Showcase Mode</DialogTitle>
          <DialogDescription asChild>
            <div className="pt-2 text-base leading-relaxed space-y-3">
              <p>This actually works. That's the problem. 😅</p>
              <p>
                Real AI agents cost real money, and I'm not venture-backed (yet). So I made a product decision:{" "}
                <strong>Showcase Mode</strong>—you get full visibility into the architecture, and I keep my API costs sustainable. Classic constraint-driven design. 📉
              </p>
              <p>You can see under the hood, but the test drive requires a conversation first.</p>
              <p>Want a live demo? Let's connect. 🤝</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <a
              href="https://www.linkedin.com/in/workwithajay/"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              Connect on LinkedIn
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
