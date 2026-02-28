import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

export interface User extends SupabaseUser {
  profile?: {
    full_name: string;
  };
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => { },
  signInAsGuest: () => { },
});

const GUEST_KEY = "linkedin_engage_guest";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async (sessionUser: SupabaseUser | null) => {
      if (!sessionUser) {
        // Check for guest fallback
        if (localStorage.getItem(GUEST_KEY) === "true") {
          const guestUser = {
            id: "guest-id",
            app_metadata: {},
            user_metadata: { full_name: "Guest" },
            aud: "authenticated",
            created_at: new Date().toISOString(),
            is_anonymous: true,
            email: "guest@portfolio.demo",
            profile: { full_name: "Guest" },
          } as User;
          setUser(guestUser);
          setSession({
            access_token: "guest-token",
            refresh_token: "guest-refresh",
            expires_in: 3600,
            token_type: "bearer",
            user: guestUser,
          } as Session);
        } else {
          setUser(null);
          setSession(null);
        }
        return;
      }

      // Real User Setup
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", sessionUser.id)
        .single();

      if (!error && data) {
        setUser({ ...sessionUser, profile: { full_name: data.full_name || "User" } });
      } else {
        setUser({ ...sessionUser, profile: { full_name: sessionUser.user_metadata?.full_name || "User" } });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession) {
          localStorage.removeItem(GUEST_KEY);
        }
        setSession(newSession);
        await fetchProfile(newSession?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      await fetchProfile(existingSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem(GUEST_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    navigate("/login");
  };

  const signInAsGuest = () => {
    localStorage.setItem(GUEST_KEY, "true");
    const guestUser = {
      id: "guest-id",
      app_metadata: {},
      user_metadata: { full_name: "Guest" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      is_anonymous: true,
      email: "guest@portfolio.demo",
      profile: { full_name: "Guest" },
    } as User;
    setUser(guestUser);
    setSession({
      access_token: "guest-token",
      refresh_token: "guest-refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: guestUser,
    } as Session);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, signInAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
