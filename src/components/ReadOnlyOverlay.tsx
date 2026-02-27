import { useRef, useCallback } from "react";
import { useGuestMode } from "@/hooks/useGuestMode";

interface ReadOnlyOverlayProps {
  children: React.ReactNode;
  onLockedClick: () => void;
}

export default function ReadOnlyOverlay({ children, onLockedClick }: ReadOnlyOverlayProps) {
  const { isGuest } = useGuestMode();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isGuest) return;
      e.preventDefault();
      e.stopPropagation();
      onLockedClick();
    },
    [isGuest, onLockedClick]
  );

  if (!isGuest) return <>{children}</>;

  return (
    <div className="relative cursor-not-allowed" onClick={handleClick}>
      <div className="pointer-events-none select-none">{children}</div>
    </div>
  );
}
