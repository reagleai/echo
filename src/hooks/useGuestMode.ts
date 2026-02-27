import { useAuth } from "@/hooks/useAuth";

const GUEST_EMAIL = "guest@portfolio.demo";

export function useGuestMode() {
  const { user } = useAuth();
  return { isGuest: user?.email === GUEST_EMAIL };
}
