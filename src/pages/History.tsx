import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  History as HistoryIcon, Filter, Download, ExternalLink, ChevronDown
} from "lucide-react";
import { sanitizeUrl } from "@/lib/utils";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
const PAGE_SIZE = 20;

interface ExecutionLog {
  id: string;
  domain: string;
  status: string;
  total_links: number | null;
  relevant_links: number | null;
  duration_ms: number | null;
  spreadsheet_url: string | null;
  query_used: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export default function History() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filterDomain, setFilterDomain] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => {
    if (user) fetchLogs();
  }, [user, page, filterDomain, filterStatus, filterDateFrom, filterDateTo]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("execution_logs")
      .select("*", { count: "exact" })
      .eq("user_id", user!.id)
      .order("started_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterDomain !== "all") query = query.eq("domain", filterDomain);
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterDateFrom) query = query.gte("started_at", filterDateFrom);
    if (filterDateTo) query = query.lte("started_at", filterDateTo + "T23:59:59");

    const { data, count, error } = await query;
    if (error) toast({ title: "Error loading history", description: error.message, variant: "destructive" });
    else {
      setLogs(data as ExecutionLog[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const clearFilters = () => {
    setFilterDomain("all");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setPage(0);
  };

  const exportCsv = () => {
    if (logs.length === 0) return;
    const headers = ["Date", "Domain", "Status", "Total Links", "Relevant", "Duration (s)", "Query", "Spreadsheet"];
    const rows = logs.map(l => [
      new Date(l.started_at).toLocaleString(),
      l.domain,
      l.status,
      l.total_links ?? "",
      l.relevant_links ?? "",
      l.duration_ms ? (l.duration_ms / 1000).toFixed(1) : "",
      l.query_used ?? "",
      l.spreadsheet_url ?? "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linkedin-engagement-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalExecutions = totalCount;
  const successCount = logs.filter(l => l.status === "success").length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;
  const totalLinksFound = logs.reduce((s, l) => s + (l.total_links || 0), 0);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <DashboardLayout>
      <motion.div {...fadeIn} className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">History</h1>
          <p className="text-muted-foreground mt-1">View and filter all past workflow executions.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-4 sm:gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0); }} className="w-full sm:w-40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(0); }} className="w-full sm:w-40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Domain</label>
                <Select value={filterDomain} onValueChange={(v) => { setFilterDomain(v); setPage(0); }}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="triggered">Triggered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:inline-flex mt-2 sm:mt-0">
                <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>Clear</Button>
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={exportCsv}>
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <p className="mt-2 font-display text-4xl font-bold">{totalExecutions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="mt-2 font-display text-4xl font-bold">{successRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Links</p>
              <p className="mt-2 font-display text-4xl font-bold">{totalLinksFound}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HistoryIcon className="h-5 w-5" /> Execution Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center">
                <HistoryIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-lg font-semibold text-muted-foreground">No executions found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or trigger your first workflow.</p>
                <Button className="mt-4" asChild>
                  <a href="/">Go to Dashboard</a>
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead className="w-8"></TableHead>
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
                      <Collapsible key={log.id} open={expandedId === log.id} onOpenChange={(open) => setExpandedId(open ? log.id : null)} asChild>
                        <>
                          <TableRow className="cursor-pointer hover:bg-secondary/30">
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === log.id ? "rotate-180" : ""}`} />
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="text-sm">{new Date(log.started_at).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{log.domain}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{log.total_links ?? "—"}</TableCell>
                            <TableCell className="font-medium">{log.relevant_links ?? "—"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
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
                                  <a href={sanitizeUrl(log.spreadsheet_url)} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={8}>
                                <div className="grid gap-2 py-2 text-sm sm:grid-cols-2">
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">Started:</span>{" "}
                                    {new Date(log.started_at).toLocaleString()}
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">Completed:</span>{" "}
                                    {log.completed_at ? new Date(log.completed_at).toLocaleString() : "In progress"}
                                  </div>
                                  {log.query_used && (
                                    <div className="sm:col-span-2">
                                      <span className="text-xs font-medium text-muted-foreground">Query:</span>{" "}
                                      <code className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs">{log.query_used}</code>
                                    </div>
                                  )}
                                  {log.error_message && (
                                    <div className="sm:col-span-2">
                                      <span className="text-xs font-medium text-destructive">Error:</span>{" "}
                                      <span className="text-destructive">{log.error_message}</span>
                                    </div>
                                  )}
                                  {log.spreadsheet_url && (
                                    <div className="sm:col-span-2">
                                      <a href={sanitizeUrl(log.spreadsheet_url)} target="_blank" rel="noopener noreferrer"
                                        className="font-medium text-primary hover:underline">
                                        Open Spreadsheet →
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
