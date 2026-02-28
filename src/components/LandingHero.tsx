import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Clock, Folder, Search, Shield, Brain, Table2, Mail, CheckCircle2, Lock, ArrowRight, Sparkles } from "lucide-react";
import { isNetworkError } from "@/lib/network-utils";

async function signInWithRetry(email: string, password: string) {
    const attempt = async () => supabase.auth.signInWithPassword({ email, password });
    try {
        const result = await attempt();
        if (!result.error) return result;
        if (!isNetworkError(result.error)) return result;
    } catch (err: any) {
        if (!isNetworkError(err)) throw err;
    }
    try {
        return await attempt();
    } catch (retryErr) {
        return { error: { message: "Login request failed. Check your connection." } };
    }
}

export default function LandingHero({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [guestLoading, setGuestLoading] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);

    const isLocked = failedAttempts >= 5;

    const handleGuestLogin = async () => {
        setGuestLoading(true);
        try {
            const { error } = await signInWithRetry("guest@portfolio.demo", "demo2026");
            if (error) {
                toast({ title: "Guest login failed", description: error.message, variant: "destructive" });
            } else {
                onLoginSuccess();
            }
        } catch {
            toast({ title: "Guest login failed", description: "Unexpected error.", variant: "destructive" });
        } finally {
            setGuestLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) {
            toast({ title: "Access Locked", description: "Too many failed attempts. Security cooldown active.", variant: "destructive" });
            return;
        }
        if (!email || !password) {
            toast({ title: "Validation Error", description: "Email and password are required.", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const { error } = await signInWithRetry(email, password);
            if (error) {
                setFailedAttempts((prev) => prev + 1);
                toast({ title: "Sign in failed", description: "Invalid credentials.", variant: "destructive" });
            } else {
                setFailedAttempts(0);
                onLoginSuccess();
            }
        } catch {
            toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary/20">
            {/* Navigation stripped down to essentials */}
            <nav className="flex items-center justify-between p-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-display font-bold text-xl tracking-tight">Echo</span>
                </div>
            </nav>

            {/* Hero Content - Above The Fold */}
            <section className="pt-20 px-6 max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left Column: Product Story */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-10"
                    >
                        <div>
                            <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6">
                                Authentic LinkedIn <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                                    engagement on autopilot.
                                </span>
                            </h1>
                        </div>

                        <div className="space-y-8">
                            <div className="border-l-2 border-destructive/50 pl-6">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-destructive mb-2">The Problem</h3>
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                    LinkedIn engagement takes hours. Finding the right posts, reading them fully, and writing thoughtful replies that don't sound like AI slop takes more effort than most founders have. Most resort to generic bot comments that hurt their brand.
                                </p>
                            </div>

                            <div className="border-l-2 border-primary/50 pl-6">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">The Solution</h3>
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                    Echo fully automates the loop. It scrapes LinkedIn for targeted posts, reads the context, and uses large language models to write casual, perceptive comments. Everything is shipped directly to a Google Sheet and your inbox for 1-click posting.
                                </p>
                            </div>

                            <div className="border-l-2 border-orange-500/50 pl-6">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-orange-500 mb-2">Product Thinking</h3>
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                    It's not designed to spam. Echo leverages a meticulously engineered AI persona—thinking like a sharp, 20-something product manager. It ignores irrelevant posts, formats outputs casually (no hashtags, lowercase starts), and avoids robotic clichés.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: CTA & Auth */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col items-center justify-center lg:items-end w-full"
                    >
                        <div className="w-full max-w-md relative">
                            {/* Decorative background glow */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-2xl blur-xl opacity-50" />

                            <Card className="relative bg-card border-border/50 shadow-2xl rounded-2xl overflow-hidden">
                                <CardContent className="p-8">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold tracking-tight">Access Echo</h2>
                                        <p className="text-sm text-muted-foreground mt-2">Sign in to manage workflows or explore the live UI sandbox as a guest.</p>
                                    </div>

                                    <form onSubmit={handleLogin} className="space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="admin@ripple.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                disabled={loading || isLocked}
                                                className="bg-background/50"
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
                                                disabled={loading || isLocked}
                                                className="bg-background/50"
                                            />
                                        </div>

                                        {isLocked ? (
                                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-3 text-destructive">
                                                <Lock className="w-5 h-5 flex-shrink-0" />
                                                <span className="text-sm font-medium">Too many attempts. Form locked.</span>
                                            </div>
                                        ) : (
                                            <Button type="submit" className="w-full font-medium" disabled={loading}>
                                                {loading ? "Verifying..." : "Sign In to Dashboard"}
                                            </Button>
                                        )}
                                    </form>

                                    <div className="relative my-8">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-border" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-card px-2 text-muted-foreground font-semibold">Or</span>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full font-medium border-primary/20 hover:bg-primary/5 transition-colors gap-2"
                                        onClick={handleGuestLogin}
                                        disabled={guestLoading || isLocked}
                                    >
                                        Enter as Guest <ArrowRight className="w-4 h-4" />
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground mt-4">
                                        Guest mode grants full UI access. Actual webhook execution is mocked for safety.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* How It Works Diagram - Seamlessly Integrated below fold */}
            <section className="py-32 px-4 md:px-8 mt-10">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-6xl mx-auto border border-border/50 rounded-3xl bg-card/30 p-8 md:p-12 overflow-hidden relative shadow-xl backdrop-blur-sm"
                >
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight">The Automation Pipeline</h2>
                        <p className="text-lg text-muted-foreground mt-3">From keyword configuration to delivered spreadsheet, completely autonomous.</p>
                    </div>

                    <div className="relative flex flex-col md:flex-row items-center justify-between w-full gap-16 md:gap-0 md:h-[300px] py-8 md:py-0">
                        {/* Dashed background lines logic */}
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 border-t-2 border-dashed border-border/50 hidden md:block" />
                        <div className="absolute top-8 bottom-8 left-1/2 w-0.5 border-l-2 border-dashed border-border/50 md:hidden" />

                        {/* Traveling dots */}
                        <motion.div
                            className="absolute h-2.5 w-2.5 rounded-full bg-primary z-10 hidden md:block shadow-[0_0_10px_rgba(var(--primary),0.8)]" style={{ top: 'calc(50% - 5px)' }}
                            animate={{ left: ['0%', '100%'] }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Phase 1 */}
                        <div className="flex flex-col items-center gap-4 relative z-20 group w-full md:w-auto">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 bg-background px-3 py-1 rounded-full border border-border">Phase 1: Pulse</div>
                            <Node icon={<Clock />} title="Chron Trigger" tooltip="Wake up daily or on demand" />
                            <div className="h-6 w-0.5 bg-border md:hidden" />
                            <Node icon={<Search />} title="Tavily Scout" tooltip="Fetch 5 trending posts via LinkedIn" />
                        </div>

                        {/* Phase 2 - Core AI */}
                        <div className="flex flex-col items-center gap-4 relative z-20 group w-full md:w-auto">
                            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-4 bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">Phase 2: Brain</div>
                            <Node icon={<Shield />} title="Rule Engine" tooltip="Filter duplicates & hiring posts" glowing />
                            <div className="h-6 w-0.5 bg-primary/30 md:hidden" />
                            <Node icon={<Brain />} title="Haiku Persona" tooltip="Generate authentic casual reply" glowing />
                        </div>

                        {/* Phase 3 */}
                        <div className="flex flex-col items-center gap-4 relative z-20 group w-full md:w-auto">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 bg-background px-3 py-1 rounded-full border border-border">Phase 3: Dispatch</div>
                            <Node icon={<Table2 />} title="Drive Append" tooltip="Push data to Google Sheets" />
                            <div className="h-6 w-0.5 bg-border md:hidden" />
                            <Node icon={<Mail />} title="Alert Inbox" tooltip="Email link to final spreadsheet" />
                        </div>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}

// Subcomponents
function Node({ icon, title, tooltip, glowing = false }: { icon: React.ReactNode, title: string, tooltip: string, glowing?: boolean }) {
    return (
        <div className="relative group cursor-pointer w-full flex flex-col items-center">
            <motion.div
                whileHover={{ scale: 1.05 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center border bg-card text-foreground z-20 relative
        ${glowing ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.3)] text-primary' : 'border-border'}`}
            >
                {icon}
            </motion.div>
            <div className="text-sm font-semibold text-center mt-3 max-w-[100px] leading-tight">{title}</div>

            {/* Tooltip */}
            <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 bg-foreground text-background text-sm p-3 rounded-lg shadow-xl z-50 transition-opacity text-center">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
            </div>
        </div>
    );
}
