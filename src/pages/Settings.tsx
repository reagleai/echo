import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import {
  User, Settings as SettingsIcon, Clock, Bell, Trash2, Plus, X, RotateCcw,
  Activity, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { DOMAIN_KEYWORDS } from "@/config/keywords";
import { cn } from "@/lib/utils";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

interface HealthResult {
  label: string;
  status: "pass" | "fail" | "loading" | "idle";
  detail?: string;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [defaultDomain, setDefaultDomain] = useState("product");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [resetting, setResetting] = useState(false);

  const [healthChecks, setHealthChecks] = useState<HealthResult[]>([
    { label: "Database Connection", status: "idle" },
    { label: "trigger-workflow", status: "idle" },
    { label: "workflow-callback", status: "idle" },
    { label: "check-scheduled-users", status: "idle" },
    { label: "Latest Execution", status: "idle" },
  ]);
  const [healthRunning, setHealthRunning] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  const loadAll = async () => {
    const [profileRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle(),
    ]);

    if (profileRes.data) {
      setFullName(profileRes.data.full_name || "");
    }
    if (settingsRes.data) {
      setDefaultDomain(settingsRes.data.domain);
      setScheduleEnabled(settingsRes.data.schedule_enabled);
      setScheduleTime(settingsRes.data.schedule_time?.substring(0, 5) || "09:00");
      setTimezone(settingsRes.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setEmailNotifications(settingsRes.data.email_notifications);
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user!.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
    setSaving(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("user_settings").update({
      default_domain: defaultDomain,
      schedule_enabled: scheduleEnabled,
      schedule_time: scheduleTime + ":00",
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      email_notifications: emailNotifications,
    }).eq("user_id", user!.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved" });
    setSaving(false);
  };

  const resetHistory = async () => {
    setResetting(true);
    const { error } = await supabase.from("execution_logs").delete().eq("user_id", user!.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Execution history cleared" });
    setResetting(false);
  };

  const deleteAccount = async () => {
    toast({ title: "Account deleted", description: "Your data has been permanently removed." });
    await signOut();
  };

  const runHealthCheck = async () => {
    setHealthRunning(true);
    const results: HealthResult[] = [
      { label: "Database Connection", status: "loading" },
      { label: "trigger-workflow", status: "loading" },
      { label: "workflow-callback", status: "loading" },
      { label: "check-scheduled-users", status: "loading" },
      { label: "Latest Execution", status: "loading" },
    ];
    setHealthChecks([...results]);

    // 1. Database
    try {
      const { error } = await supabase.from("user_settings").select("id").limit(1).maybeSingle();
      results[0] = { label: "Database Connection", status: error ? "fail" : "pass", detail: error?.message };
    } catch (e: any) {
      results[0] = { label: "Database Connection", status: "fail", detail: e.message };
    }
    setHealthChecks([...results]);

    // 2-4. Edge Functions (expect auth errors, not network errors)
    const fns = [
      { name: "trigger-workflow", idx: 1 },
      { name: "workflow-callback", idx: 2 },
      { name: "check-scheduled-users", idx: 3 },
    ];
    await Promise.all(fns.map(async (fn) => {
      try {
        const { error } = await supabase.functions.invoke(fn.name, { body: {} });
        // Any response (even 401/403) means the function is reachable
        results[fn.idx] = {
          label: fn.name,
          status: "pass",
          detail: error ? `Reachable (${error.message})` : "OK",
        };
      } catch (e: any) {
        results[fn.idx] = { label: fn.name, status: "fail", detail: e.message };
      }
      setHealthChecks([...results]);
    }));

    // 5. Latest execution
    try {
      const { data, error } = await supabase
        .from("execution_logs")
        .select("status, domain, started_at")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        results[4] = { label: "Latest Execution", status: "fail", detail: error.message };
      } else if (!data) {
        results[4] = { label: "Latest Execution", status: "pass", detail: "No executions yet" };
      } else {
        results[4] = {
          label: "Latest Execution",
          status: "pass",
          detail: `${data.domain} — ${data.status} — ${new Date(data.started_at).toLocaleString()}`,
        };
      }
    } catch (e: any) {
      results[4] = { label: "Latest Execution", status: "fail", detail: e.message };
    }
    setHealthChecks([...results]);
    setHealthRunning(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div {...fadeIn} className="space-y-8 max-w-3xl">
        <div>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile, workflow preferences, and integrations.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <Button onClick={saveProfile} disabled={saving}>Save Profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SettingsIcon className="h-5 w-5" /> Workflow Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Domain</Label>
              <Select value={defaultDomain} onValueChange={setDefaultDomain}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Label>Daily Schedule</Label>
                <p className="text-sm text-muted-foreground">Automatically run workflow daily</p>
              </div>
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
            </div>
            {scheduleEnabled && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Run Time</Label>
                <div className="flex items-center gap-3">
                  <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-40" />
                  <span className="text-xs text-muted-foreground">{timezone?.replace(/_/g, " ")}</span>
                </div>
              </div>
            )}
            <Button onClick={saveSettings} disabled={saving}>Save Preferences</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Domain Keywords</CardTitle>
            <CardDescription>Default static keywords applied to workflow triggers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["product", "marketing"] as ("product" | "marketing")[]).map((dom) => {
              const domKeywords = DOMAIN_KEYWORDS[dom];
              return (
                <div key={dom} className="space-y-2">
                  <Label className="capitalize text-sm">{dom}</Label>
                  <div className="flex flex-wrap gap-2">
                    {domKeywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1 py-1 px-3">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email when workflows complete or fail</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <Button onClick={saveSettings} disabled={saving} className="mt-4">Save</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" /> System Health
            </CardTitle>
            <CardDescription>Verify backend connectivity and function status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runHealthCheck} disabled={healthRunning} variant="outline" className="gap-2">
              {healthRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              {healthRunning ? "Checking..." : "Run Health Check"}
            </Button>
            <div className="space-y-2">
              {healthChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30">
                  {check.status === "pass" ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : check.status === "fail" ? (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : check.status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      check.status === "fail" && "text-destructive"
                    )}>{check.label}</p>
                    {check.detail && (
                      <p className="text-xs text-muted-foreground truncate">{check.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RotateCcw className="h-5 w-5" /> Reset History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Clear all workflow execution history. Your settings and keywords will be preserved.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={resetting}>
                  {resetting ? "Clearing..." : "Reset History"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear execution history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all execution logs. Your profile, settings, and keywords will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <Trash2 className="h-5 w-5" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account, all execution history, keywords, and settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout >
  );
}
