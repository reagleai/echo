import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import SearchQueryPreview from "@/components/SearchQueryPreview";
import WorkflowProgressBar, { RunState } from "@/components/WorkflowProgressBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Play, Clock, Link2, Target, ExternalLink, CalendarClock,
  TrendingUp, Zap, BarChart3, TestTube
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DOMAIN_KEYWORDS } from "@/config/keywords";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

interface ExecutionLog {
  id: string;
  domain: string;
  status: string;
  total_links: number;
  relevant_links: number;
  duration_ms: number | null;
  spreadsheet_url: string | null;
  started_at: string;
  completed_at: string | null;
  error_message?: string | null;
}

export default function Index() {
  const { user } = useAuth();
  const [domain, setDomain] = useState("product");
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [runState, setRunState] = useState<RunState>("idle");
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const activeLogIdRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Removed realtime Supabase channel listener as we now rely strictly on N8N Serverless Callback polling

  // Main Polling Loop
  useEffect(() => {
    if (runState !== "processing") {
      clearPolling();
      return;
    }

    const TIMEOUT_MS = 15 * 60 * 1000;

    pollingRef.current = setInterval(async () => {
      const logId = activeLogIdRef.current;
      if (!logId) return;

      if (startTimeRef.current && Date.now() - startTimeRef.current > TIMEOUT_MS) {
        await supabase
          .from("execution_logs")
          .update({ status: "failed", error_message: "Workflow timed out after 15 minutes" })
          .eq("id", logId);
        clearPolling();
        setRunState("failed");
        setWorkflowError("Workflow timed out after 15 minutes");
        toast({ title: "Workflow timed out", description: "No response after 15 minutes. Marked as failed.", variant: "destructive" });
        fetchData();
        return;
      }

      try {
        const res = await fetch(`/api/poll?execution_id=${logId}`);
        if (!res.ok) return; // Keep polling if network blips
        const data = await res.json();

        if (data.ready) {
          clearPolling();

          await supabase.from("execution_logs").update({
            status: data.status === "success" ? "completed" : "failed",
            total_links: data.total_links || 0,
            relevant_links: data.relevant_links || 0,
            spreadsheet_url: data.spreadsheet_url || null,
            completed_at: new Date().toISOString(),
          }).eq("id", logId);

          if (data.status === "success") {
            setRunState("completing");
            toast({ title: "Workflow complete!", description: `Found ${data.total_links} posts, ${data.relevant_links} relevant.` });
            setTimeout(() => {
              setRunState("done");
              setTimeout(() => {
                setRunState("idle");
              }, 3000);
            }, 1000); // 1 second completing animation transition
          } else {
            setRunState("failed");
            setWorkflowError(data.error || "Unknown error occurred inside N8N workflow.");
            toast({ title: "Workflow failed", description: data.error || "Something went wrong.", variant: "destructive" });
          }
          fetchData();
        }
      } catch (e) {
        console.error("Poll Error:", e);
        // We do not fail immediately on network err, allow next poll retry
      }

    }, 5000);

    return clearPolling;
  }, [runState]);

  const fetchData = async () => {
    const [logsRes, settingsRes] = await Promise.all([
      supabase.from("execution_logs").select("*").order("started_at", { ascending: false }).limit(10),
      supabase.from("user_settings").select("*").maybeSingle(),
    ]);
    if (logsRes.data) {
      setLogs(logsRes.data as ExecutionLog[]);

      // Restore running workflow on page load
      if (runState === "idle") {
        const runningLog = logsRes.data.find(
          (l: any) => l.status === "processing" || l.status === "running" || l.status === "triggered"
        );
        if (runningLog) {
          activeLogIdRef.current = runningLog.id;
          startTimeRef.current = new Date(runningLog.started_at).getTime();
          setRunState("processing");
          setWorkflowError(null);
        }
      }
    }
    if (settingsRes.data) {
      setScheduleEnabled(settingsRes.data.schedule_enabled);
      setScheduleTime(settingsRes.data.schedule_time?.substring(0, 5) || "09:00");
      setDomain(settingsRes.data.domain);
      setTimezone(settingsRes.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    } else {
      setScheduleEnabled(false);
      setScheduleTime("09:00");
      setDomain("product");
    }
    setLoading(false);
  };

  const triggerWorkflow = async () => {
    setRunState("initiating");
    setWorkflowError(null);
    startTimeRef.current = Date.now();

    const executionId = crypto.randomUUID();
    activeLogIdRef.current = executionId;

    const startIso = new Date().toISOString();
    await supabase.from("execution_logs").insert({
      id: executionId,
      user_id: user.id,
      domain: domain,
      status: "processing",
      started_at: startIso
    });

    fetchData();

    try {
      const keywordsArray = DOMAIN_KEYWORDS[domain as keyof typeof DOMAIN_KEYWORDS] || [];
      const queryStr = keywordsArray.join(", ");

      const payload = {
        query: queryStr,
        user_email: user.email,
        execution_id: executionId,
        callback_url: `${window.location.origin}/api/callback`
      };

      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      setRunState("processing");
      toast({ title: "Workflow triggered!", description: `Running for ${domain} domain. This may take a few minutes.` });

    } catch (err: any) {
      toast({ title: "Trigger failed", description: "check your connection.", variant: "destructive" });
      await supabase.from("execution_logs").update({
        status: "failed",
        error_message: err.message || "Failed to call /api/trigger"
      }).eq("id", executionId);
      setRunState("failed");
      setWorkflowError(err.message || "Failed to call /api/trigger");
      fetchData();
    }
  };

  const cancelWorkflow = async () => {
    const logId = activeLogIdRef.current;
    if (logId) {
      await supabase.from("execution_logs").update({
        status: "failed",
        error_message: "Run cancelled by user"
      }).eq("id", logId);
    }
    setRunState("failed");
    setWorkflowError("Cancelled by user");
    clearPolling();
    fetchData();
  };

  const resetWorkflow = () => {
    setRunState("idle");
    setWorkflowError(null);
    activeLogIdRef.current = null;
    startTimeRef.current = null;
    clearPolling();
  };

  const retryWorkflow = () => {
    resetWorkflow();
    triggerWorkflow();
  };

  const saveSchedule = async (enabled: boolean, time?: string) => {
    if (!user) return;
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { error } = await supabase.from("user_settings").update({
      schedule_enabled: enabled,
      schedule_time: (time || scheduleTime) + ":00",
      timezone: tz,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Could not save schedule", description: "Settings may not be initialized yet.", variant: "destructive" });
    } else {
      toast({ title: "Schedule updated" });
    }
  };

  const handleScheduleToggle = (checked: boolean) => {
    setScheduleEnabled(checked);
    saveSchedule(checked);
  };

  const handleTimeBlur = () => {
    saveSchedule(scheduleEnabled, scheduleTime);
  };

  const lastRun = logs[0];
  const totalLinks = logs.reduce((s, l) => s + (l.total_links || 0), 0);
  const relevantLinks = logs.reduce((s, l) => s + (l.relevant_links || 0), 0);

  const chartData = (() => {
    const days: Record<string, { date: string; product: number; marketing: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = { date: key, product: 0, marketing: 0 };
    }
    logs.forEach((l) => {
      const key = l.started_at.split("T")[0];
      if (days[key]) {
        if (l.domain === "product") days[key].product += l.relevant_links || 0;
        else days[key].marketing += l.relevant_links || 0;
      }
    });
    return Object.values(days);
  })();

  const stats = [
    { label: "Last Run", value: lastRun ? new Date(lastRun.started_at).toLocaleDateString() : "Never", icon: Clock },
    { label: "Total Links", value: totalLinks, icon: Link2 },
    { label: "Relevant Links", value: relevantLinks, icon: Target },
  ];

  return (
    <DashboardLayout>
      <motion.div {...fadeIn} className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor and trigger your LinkedIn engagement workflows.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-primary" />
                Run Workflow
              </CardTitle>
              <CardDescription>Select a domain and trigger the workflow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {runState === "idle" ? (
                <>
                  <div className="flex items-center gap-3">
                    <Select value={domain} onValueChange={setDomain}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={triggerWorkflow} className="gap-2">
                      <Play className="h-4 w-4" />
                      Trigger Workflow
                    </Button>
                  </div>

                  <div className="mt-4 p-4 border rounded-md bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Search Pattern</p>
                    <div className="flex flex-wrap gap-2">
                      {DOMAIN_KEYWORDS[domain as keyof typeof DOMAIN_KEYWORDS]?.map((kw: string) => (
                        <Badge key={kw} variant="secondary" className="font-normal">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <WorkflowProgressBar
                  runState={runState}
                  onReset={resetWorkflow}
                  onRetry={retryWorkflow}
                  onCancel={cancelWorkflow}
                  errorMessage={workflowError || undefined}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  <Label className="text-sm font-medium">Daily Schedule</Label>
                </div>
                <Switch checked={scheduleEnabled} onCheckedChange={handleScheduleToggle} />
              </div>
              {scheduleEnabled && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      onBlur={handleTimeBlur}
                      className="w-32 h-9 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      title="Test schedule"
                      onClick={() => {
                        const now = new Date();
                        const tz = timezone || "Asia/Kolkata";
                        const formatter = new Intl.DateTimeFormat("en-US", {
                          timeZone: tz,
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        });
                        const parts = formatter.formatToParts(now);
                        const curH = parts.find(p => p.type === "hour")?.value || "00";
                        const curM = parts.find(p => p.type === "minute")?.value || "00";
                        const currentMins = parseInt(curH) * 60 + parseInt(curM);
                        const [sH, sM] = scheduleTime.split(":").map(Number);
                        const schedMins = sH * 60 + sM;
                        const diff = Math.min(Math.abs(currentMins - schedMins), 1440 - Math.abs(currentMins - schedMins));
                        const wouldTrigger = diff <= 7;
                        const short = tz.split("/").pop()?.replace(/_/g, " ") || tz;
                        toast({
                          title: "Schedule Test",
                          description: `Saved: ${scheduleTime} (${short}) | Current: ${curH}:${curM} (${short}) | Would Trigger: ${wouldTrigger ? "Yes ✅" : "No ❌"}`,
                        });
                      }}
                    >
                      <TestTube className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-5">
                    {timezone?.replace(/_/g, " ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 font-display text-4xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {lastRun?.spreadsheet_url && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Latest Output</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="gap-2" asChild>
                <a href={lastRun.spreadsheet_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open in Google Sheets
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              7-Day Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground border-2 border-dashed rounded-lg border-border/50">
                <BarChart3 className="h-8 w-8 mb-3 opacity-20" />
                <p className="font-medium">No performance data available</p>
                <p className="text-sm">Trigger a workflow to see metrics</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 88%)" />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { weekday: "short" })} className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(0 0% 82%)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                  <Legend />
                  <Line type="monotone" dataKey="product" stroke="#96B6C5" strokeWidth={2} dot={{ r: 4, fill: "#96B6C5" }} name="Product" />
                  <Line type="monotone" dataKey="marketing" stroke="#EEE0C9" strokeWidth={2} dot={{ r: 4, fill: "#EEE0C9" }} name="Marketing" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Recent Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No executions yet. Trigger your first workflow above!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="text-xs font-medium">Date</TableHead>
                    <TableHead className="text-xs font-medium">Domain</TableHead>
                    <TableHead className="text-xs font-medium">Links</TableHead>
                    <TableHead className="text-xs font-medium">Relevant</TableHead>
                    <TableHead className="text-xs font-medium">Status</TableHead>
                    <TableHead className="text-xs font-medium">Duration</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{new Date(log.started_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{log.domain}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.total_links}</TableCell>
                      <TableCell className="font-medium">{log.relevant_links}</TableCell>
                      <TableCell>
                        <Badge
                          variant={log.status === "success" || log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
                      </TableCell>
                      <TableCell>
                        {log.spreadsheet_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={log.spreadsheet_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
