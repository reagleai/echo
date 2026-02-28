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

  const [productKeywords, setProductKeywords] = useState<string[]>([]);
  const [marketingKeywords, setMarketingKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState({ product: "", marketing: "" });

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
    if (user!.is_anonymous) {
      setFullName("Guest");
      setProductKeywords(["B2B", "SaaS"]);
      setMarketingKeywords(["Growth", "SEO"]);
      setLoading(false);
      return;
    }

    const [profileRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle(),
    ]);

    if (profileRes.data) {
      setFullName(profileRes.data.full_name || "");
    }
    if (settingsRes.data) {
      setDefaultDomain("product"); // Settings structure from prior build, default applies
      setProductKeywords(settingsRes.data.product_keywords || []);
      setMarketingKeywords(settingsRes.data.marketing_keywords || []);
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (user!.is_anonymous) return toast({ title: "Guest Mode", description: "Profiles cannot be saved in guest mode.", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user!.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated", description: "Your changes have been saved to the database." });
    setSaving(false);
  };

  const saveSettings = async () => {
    if (user!.is_anonymous) return toast({ title: "Guest Mode", description: "Settings cannot be saved in guest mode.", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("user_settings").update({
      product_keywords: productKeywords,
      marketing_keywords: marketingKeywords
    }).eq("user_id", user!.id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved", description: "Your workflow preferences have been updated." });
    setSaving(false);
  };

  const addKeyword = (domain: "product" | "marketing") => {
    const list = domain === "product" ? productKeywords : marketingKeywords;
    const setter = domain === "product" ? setProductKeywords : setMarketingKeywords;
    const input = newKeywordInput[domain].trim();

    if (!input) return;
    if (list.length >= 5) {
      toast({ title: "Limit reached", description: "You can only have up to 5 keywords per domain.", variant: "destructive" });
      return;
    }
    if (list.map(k => k.toLowerCase()).includes(input.toLowerCase())) {
      toast({ title: "Duplicate", description: "This keyword already exists.", variant: "destructive" });
      return;
    }
    setter([...list, input]);
    setNewKeywordInput({ ...newKeywordInput, [domain]: "" });
  };

  const removeKeyword = (domain: "product" | "marketing", keyword: string) => {
    const list = domain === "product" ? productKeywords : marketingKeywords;
    const setter = domain === "product" ? setProductKeywords : setMarketingKeywords;
    if (list.length <= 1) {
      toast({ title: "Cannot remove", description: "You must have at least one keyword for each domain.", variant: "destructive" });
      return;
    }
    setter(list.filter(k => k !== keyword));
  };


  const resetHistory = async () => {
    if (user!.is_anonymous) return toast({ title: "Guest Mode", description: "History cleared locally." });
    setResetting(true);
    const { error } = await supabase.from("execution_logs").delete().eq("user_id", user!.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Execution history cleared" });
    setResetting(false);
  };

  const deleteAccount = async () => {
    if (user!.is_anonymous) {
      await signOut();
      return;
    }
    toast({ title: "Deleting account...", description: "Removing all your data permanently." });

    // 1. Delete execution logs
    await supabase.from("execution_logs").delete().eq("user_id", user!.id);
    // 2. Delete user settings
    await supabase.from("user_settings").delete().eq("user_id", user!.id);
    // 3. Delete profile
    await supabase.from("profiles").delete().eq("id", user!.id);
    // 4. Trigger RPC to delete auth.users record securely
    const { error } = await supabase.rpc('delete_user');

    if (error) {
      toast({ title: "Error deleting account", description: error.message, variant: "destructive" });
      return;
    }

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

    try {
      const { error } = await supabase.from("user_settings").select("user_id").limit(1).maybeSingle();
      results[0] = { label: "Database Connection", status: error ? "fail" : "pass", detail: error?.message };
    } catch (e: any) {
      results[0] = { label: "Database Connection", status: "fail", detail: e.message };
    }
    setHealthChecks([...results]);

    const fns = [
      { name: "trigger-workflow", idx: 1 },
      { name: "workflow-callback", idx: 2 },
      { name: "check-scheduled-users", idx: 3 },
    ];
    await Promise.all(fns.map(async (fn) => {
      try {
        const { error } = await supabase.functions.invoke(fn.name, { body: {} });
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
          <p className="text-muted-foreground mt-1">Manage your profile, workflow preferences, and keywords.</p>
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
              <SettingsIcon className="h-5 w-5" /> Domain Keywords
            </CardTitle>
            <CardDescription>Configure the keywords triggered for each domain (Max 5 per domain).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="uppercase text-xs text-muted-foreground tracking-wider">Product Keywords</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {productKeywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1 py-1 px-3 text-sm">
                    {keyword}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeKeyword("product", keyword)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input
                  value={newKeywordInput.product}
                  onChange={(e) => setNewKeywordInput({ ...newKeywordInput, product: e.target.value })}
                  placeholder="e.g., Startup"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword("product"); } }}
                />
                <Button variant="secondary" onClick={() => addKeyword("product")} disabled={productKeywords.length >= 5}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="uppercase text-xs text-muted-foreground tracking-wider">Marketing Keywords</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {marketingKeywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1 py-1 px-3 text-sm">
                    {keyword}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeKeyword("marketing", keyword)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input
                  value={newKeywordInput.marketing}
                  onChange={(e) => setNewKeywordInput({ ...newKeywordInput, marketing: e.target.value })}
                  placeholder="e.g., SEO"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword("marketing"); } }}
                />
                <Button variant="secondary" onClick={() => addKeyword("marketing")} disabled={marketingKeywords.length >= 5}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button onClick={saveSettings} disabled={saving} className="mt-2">Save Keywords</Button>
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
