import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowRight, Eye } from "lucide-react";
import { isNetworkError } from "@/lib/network-utils";

async function signInWithRetry(
  email: string,
  password: string,
): Promise<{ error: { message: string } | null }> {
  const attempt = async () => supabase.auth.signInWithPassword({ email, password });

  try {
    const result = await attempt();
    if (!result.error) return result;
    if (!isNetworkError(result.error)) return result;
  } catch (err) {
    if (!isNetworkError(err)) throw err;
  }

  console.log("Login: network error detected, retrying once...");
  try {
    return await attempt();
  } catch (retryErr) {
    return { error: { message: "Login request failed. Please check your internet connection and try again." } };
  }
}

export default function Login() {
  const navigate = useNavigate();
  const { signInAsGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      signInAsGuest();
    } catch {
      toast({ title: "Guest login failed", description: "An unexpected error occurred.", variant: "destructive" });
      setGuestLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Validation Error", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithRetry(email, password);
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    } catch {
      toast({ title: "Login failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Echo</h1>
          <p className="mt-2 text-muted-foreground">Sign in to manage your engagement workflows</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="sharma.ajay8561@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading || guestLoading}>
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={handleGuestLogin}
              disabled={loading || guestLoading}
            >
              <Eye className="h-4 w-4" />
              {guestLoading ? "Entering demo..." : "View Demo (Guest Access)"}
            </Button>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
