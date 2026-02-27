import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Folder, Search, Shield, Brain, Table2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HowItWorks() {
    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Navigation */}
            <nav className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <span className="font-display font-bold text-xl">Echo</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
                    <Button asChild size="sm">
                        <Link to="/signup">Get Started</Link>
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-6"
                >
                    From keywords to ready-to-use<br className="hidden md:block" /> LinkedIn comments — fully automated.
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
                >
                    You enter your keywords. Our system finds today's trending LinkedIn posts in your niche, reads them, and writes authentic human-sounding comments for you — all delivered to your inbox and a Google Sheet.
                </motion.p>
            </section>

            {/* Animated Flow Diagram */}
            <section className="py-16 px-4 md:px-8">
                <div className="max-w-6xl mx-auto border border-border rounded-xl bg-card/50 p-8 overflow-hidden relative">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold">The Automation Pipeline</h2>
                        <p className="text-sm text-muted-foreground mt-2">Data flows automatically from your keywords to your inbox</p>
                    </div>

                    <div className="relative flex flex-col md:flex-row items-center justify-between w-full gap-16 md:gap-0 md:h-[400px] py-8 md:py-0">
                        {/* Dashed background lines logic */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 border-t-2 border-dashed border-border/50 hidden md:block" />
                        <div className="absolute top-8 bottom-8 left-1/2 w-0.5 border-l-2 border-dashed border-border/50 md:hidden" />

                        {/* Traveling dots */}
                        <motion.div
                            className="absolute h-2 w-2 rounded-full bg-primary z-10 hidden md:block" style={{ top: 'calc(50% - 4px)' }}
                            animate={{ left: ['0%', '100%'] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Phase 1 */}
                        <div className="flex flex-col items-center gap-4 relative z-20 group">
                            <div className="absolute -inset-4 bg-muted/20 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity -z-10" />
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Phase 1: Setup</div>
                            <Node icon={<Clock />} title="Webhook & Time" tooltip="Receives keywords and captures today's date" />
                            <div className="h-4 w-0.5 bg-border md:hidden" />
                            <Node icon={<Folder />} title="Organizer" tooltip="Creates a dated Google Drive folder & Sheet" />
                        </div>

                        {/* Phase 2 */}
                        <div className="flex flex-col items-center gap-4 relative z-20 group">
                            <div className="absolute -inset-4 bg-muted/20 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity -z-10" />
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Phase 2: Discovery</div>
                            <Node icon={<Search />} title="Tavily Scout" tooltip="Searches LinkedIn.com for 5 relevant posts today" />
                            <div className="h-4 w-0.5 bg-border md:hidden" />
                            <Node icon={<Shield />} title="Post Validator" tooltip="Filters duplicates, ensures unique and clean URLs" />
                        </div>

                        {/* Phase 3 - Core AI */}
                        <div className="flex flex-col items-center gap-4 relative z-20 group">
                            <div className="absolute -inset-8 bg-primary/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity -z-10" />
                            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Phase 3: AI Engine</div>
                            <Node icon={<Brain />} title="Extract Post" tooltip="DeepSeek V3 extracts raw clean post text" glowing />
                            <div className="h-4 w-0.5 bg-border md:hidden" />
                            <Node icon={<Brain />} title="Comment Generator" tooltip="Claude 3.5 Haiku crafts human-like comments" glowing />
                        </div>

                        {/* Phase 4 */}
                        <div className="flex flex-col items-center gap-4 relative z-20 group">
                            <div className="absolute -inset-4 bg-muted/20 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity -z-10" />
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Phase 4: Output</div>
                            <Node icon={<Table2 />} title="Append to Sheet" tooltip="Writes URL, post text, and AI comment to sheet" />
                            <div className="h-4 w-0.5 bg-border md:hidden" />
                            <Node icon={<Mail />} title="Send Email" tooltip="Emails the summary and triggers app callback" />
                        </div>

                    </div>
                </div>
            </section>

            {/* What You Get */}
            <section className="py-16 px-6 max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold mb-10 text-center">What You Get</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <OutcomeCard
                        title="Google Sheet Delivery"
                        desc="A structured Google Sheet with post URLs, cleaned post content, and AI-generated comments ready to copy-paste."
                        icon={<Table2 className="w-8 h-8 text-primary" />}
                    />
                    <OutcomeCard
                        title="Inbox Summary"
                        desc="An email summary delivered straight to your inbox with total posts found and a direct link to your sheet."
                        icon={<Mail className="w-8 h-8 text-primary" />}
                    />
                    <OutcomeCard
                        title="Live Dashboard Updates"
                        desc="Execution logs update live in your dashboard with success status and links the moment the run completes."
                        icon={<CheckCircle2 className="w-8 h-8 text-primary" />}
                    />
                </div>
            </section>

            {/* AI Persona Section */}
            <section className="py-16 px-6 bg-muted/30">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold mb-4">The AI Persona</h2>
                        <p className="text-muted-foreground text-lg">
                            Comments are written by an AI that thinks like a 24-year-old ops-to-PM professional based in India. <br />
                            Casual, curious, never robotic. It skips hiring posts automatically.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="hover:border-primary/50 transition-colors">
                            <CardContent className="pt-6">
                                <p className="italic text-foreground">"So true man, transitioning from ops has been a wild ride. Validating without writing code is a superpower."</p>
                                <p className="text-xs text-muted-foreground mt-4 text-right">— Generated for a PM transition post</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:border-primary/50 transition-colors">
                            <CardContent className="pt-6">
                                <p className="italic text-foreground">"this framework actually solves the exact bottleneck we hit last sprint. definitely trying this on monday."</p>
                                <p className="text-xs text-muted-foreground mt-4 text-right">— Generated for a framework post</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Simple Step Summary */}
            <section className="py-20 px-6 max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold mb-10 text-center">In 5 Simple Steps</h2>
                <div className="space-y-6">
                    <StepRow num={1} text="You enter your keywords in the dashboard" icon={<Search />} />
                    <StepRow num={2} text="We search LinkedIn for today's top posts in your niche" icon={<Folder />} />
                    <StepRow num={3} text="AI reads each post and writes a human-sounding comment" icon={<Brain />} />
                    <StepRow num={4} text="Everything lands in a Google Sheet + your inbox" icon={<Mail />} />
                    <StepRow num={5} text="You review, pick your favourites, and engage" icon={<CheckCircle2 />} />
                </div>
            </section>

            {/* Footer CTA */}
            <section className="py-16 px-6 text-center border-t border-border mt-10">
                <h3 className="text-2xl font-bold mb-6">Ready to automate your engagement?</h3>
                <Button size="lg" asChild>
                    <Link to="/signup">Start Free Trial <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
            </section>

        </div>
    );
}

// Subcomponents

function Node({ icon, title, tooltip, glowing = false }: { icon: React.ReactNode, title: string, tooltip: string, glowing?: boolean }) {
    return (
        <div className="relative group cursor-pointer">
            <motion.div
                whileHover={{ scale: 1.05 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center border bg-card text-foreground z-20 relative
          ${glowing ? 'border-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'border-border'}`}
            >
                {icon}
            </motion.div>
            <div className="text-xs font-medium text-center mt-2 max-w-[80px] leading-tight">{title}</div>

            {/* Tooltip */}
            <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-foreground text-background text-xs p-2 rounded shadow-xl z-50 transition-opacity text-center">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
            </div>
        </div>
    );
}

function OutcomeCard({ title, desc, icon }: { title: string, desc: string, icon: React.ReactNode }) {
    return (
        <Card className="h-full">
            <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="mb-4 p-4 rounded-full bg-muted/50">{icon}</div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm">{desc}</p>
            </CardContent>
        </Card>
    );
}

function StepRow({ num, text, icon }: { num: number, text: string, icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border mt-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-foreground">
                {num}
            </div>
            <div className="flex-1 text-lg">{text}</div>
            <div className="text-muted-foreground/50">{icon}</div>
        </div>
    );
}
