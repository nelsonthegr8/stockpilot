"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";
import { Trash2 } from "lucide-react";

type PrintJob = { id: string; status: string; order: { id: string; customerName: string | null }; sku: { sku: string; variant: { product: { name: string }; name: string } }; printer?: { name: string } | null; notes: string | null; createdAt: string };

export default function PrintQueuePage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [status, setStatus] = useState("ALL");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    function load() {
      fetch(`/api/print-jobs${status !== "ALL" ? `?status=${status}` : ""}`)
        .then((res) => res.json())
        .then((data: PrintJob[]) =>
          setJobs((prev) =>
            prev.length !== data.length || data.some((j, i) => j.status !== prev[i]?.status) ? data : prev,
          ),
        );
    }
    load();
    intervalRef.current = setInterval(load, 15_000);
    return () => clearInterval(intervalRef.current);
  }, [status]);

  async function handleDelete(jobId: string) {
    await fetch(`/api/print-jobs/${jobId}`, { method: "DELETE" });
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  const filtered = useMemo(() => jobs.filter((job) => !search || job.sku.sku.toLowerCase().includes(search.toLowerCase()) || job.sku.variant.product.name.toLowerCase().includes(search.toLowerCase())), [jobs, search]);
  const grouped = useMemo(() => filtered.reduce<Record<string, PrintJob[]>>((acc, job) => { (acc[job.status] ??= []).push(job); return acc; }, {}), [filtered]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Print Queue" description="Monitor print jobs heading to BambuBuddy and the operator floor." action={<div className="flex gap-2"><Button variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>List</Button><Button variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")}>Kanban</Button></div>} />
      <div className="flex flex-wrap gap-2"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs" className="max-w-xs" />{["ALL", "QUEUED", "SENT_TO_BAMBUBUDDY", "PRINTING", "DONE", "FAILED"].map((value) => <Button key={value} variant={status === value ? "default" : "outline"} onClick={() => setStatus(value)}>{value.replaceAll("_", " ")}</Button>)}</div>
      {view === "list" ? <div className="grid gap-4">{filtered.map((job) => <Card key={job.id}><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><p className="font-medium">{job.sku.variant.product.name}</p><Badge>{job.status.replaceAll("_", " ")}</Badge></div><p className="text-sm text-muted-foreground">{job.sku.sku} · Order {job.order.id.slice(-8).toUpperCase()} · {job.order.customerName ?? "No customer"}</p></div><div className="text-sm text-muted-foreground">{job.printer?.name ?? "Auto-select printer"}</div><Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(job.id)}><Trash2 className="h-4 w-4" /></Button></CardContent></Card>)}{!filtered.length ? <Card><CardContent className="p-8 text-center text-muted-foreground">No print jobs found.</CardContent></Card> : null}</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Object.entries(grouped).map(([key, value]) => <Card key={key}><CardHeader><CardTitle className="text-base">{key.replaceAll("_", " ")} ({value.length})</CardTitle></CardHeader><CardContent className="space-y-3">{value.map((job) => <div key={job.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{job.sku.variant.product.name}</p><p className="text-muted-foreground">{job.sku.sku}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</p><Button variant="ghost" size="sm" className="mt-1 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(job.id)}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent></Card>)}</div>}
    </div>
  );
}
