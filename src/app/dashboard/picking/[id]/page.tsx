"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, ProgressBar } from "@/components/dashboard/shared";

type PickList = { id: string; status: string; items: Array<{ id: string; qtyRequired: number; qtyPicked: number; sku: { sku: string; barcode: string | null; variant: { name: string; product: { name: string } }; inventoryLevels: Array<{ location: { name: string } }> } }> };

export default function PickingSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pickList, setPickList] = useState<PickList | null>(null);
  const [mode, setMode] = useState<"scan" | "qty">("scan");
  const [cameraScan, setCameraScan] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const lastKeyAt = useRef(0);
  const submitScanRef = useRef<(code: string) => void>(() => {});
  const bufferRef = useRef("");

  useEffect(() => {
    fetch(`/api/pick-lists/${params.id}`).then((res) => res.json()).then(setPickList);
    const stored = localStorage.getItem("stockpilot-pick-mode");
    if (stored === "scan" || stored === "qty") setMode(stored);
  }, [params.id]);

  useEffect(() => { localStorage.setItem("stockpilot-pick-mode", mode); }, [mode]);

  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      const now = Date.now();
      if (now - lastKeyAt.current > 50) bufferRef.current = "";
      lastKeyAt.current = now;
      if (event.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";
        if (code) submitScanRef.current(code);
        return;
      }
      if (event.key.length === 1) bufferRef.current += event.key;
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useMemo(() => {
    if (!pickList?.items.length) return 0;
    const required = pickList.items.reduce((sum, item) => sum + item.qtyRequired, 0);
    const picked = pickList.items.reduce((sum, item) => sum + item.qtyPicked, 0);
    return (picked / required) * 100;
  }, [pickList]);

  async function refresh() {
    const data = await fetch(`/api/pick-lists/${params.id}`).then((res) => res.json());
    setPickList(data);
  }

  async function submitScan(code: string) {
    const response = await fetch(`/api/pick-lists/${params.id}/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, mode, qty: mode === "qty" ? 999 : undefined }) });
    if (response.status === 409) {
      const data = await response.json();
      setAlert(`Scanned ${code}, but expected ${data.expectedSku}.`);
      return;
    }
    setAlert(null);
    await refresh();
  }
  submitScanRef.current = submitScan;

  async function markPacked() {
    await fetch(`/api/pick-lists/${params.id}/pack`, { method: "POST" });
    router.push("/dashboard/shipping");
    router.refresh();
  }

  if (!pickList) return <div className="p-6">Loading…</div>;
  const allPicked = pickList.items.every((item) => item.qtyPicked >= item.qtyRequired);

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Pick Session ${pickList.id.slice(-8).toUpperCase()}`} description={`Mode: ${mode === "scan" ? "Scan Each Unit" : "Qty Confirm"}`} action={allPicked ? <Button onClick={markPacked}>Mark Packed</Button> : null} />
      {alert ? <Alert variant="destructive"><AlertTitle>Mismatch detected</AlertTitle><AlertDescription>{alert}</AlertDescription></Alert> : null}
      <Card><CardContent className="space-y-4 p-4"><div className="flex flex-wrap gap-2"><Button variant={mode === "scan" ? "default" : "outline"} onClick={() => setMode("scan")}>Scan Each Unit</Button><Button variant={mode === "qty" ? "default" : "outline"} onClick={() => setMode("qty")}>Qty Confirm</Button></div><ProgressBar value={progress} /><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input value={cameraScan} onChange={(e) => setCameraScan(e.target.value)} placeholder="Camera or wedge scanner input" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitScan(cameraScan); setCameraScan(""); } }} /><Button onClick={() => { submitScan(cameraScan); setCameraScan(""); }}>Submit Scan</Button></div></CardContent></Card>
      <div className="grid gap-4">{pickList.items.map((item) => { const pct = (item.qtyPicked / item.qtyRequired) * 100; const currentLocation = item.sku.inventoryLevels[0]?.location.name ?? "Unassigned"; return <Card key={item.id}><CardContent className="space-y-3 p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{item.sku.variant.product.name} — {item.sku.variant.name}</p><p className="text-sm text-muted-foreground">SKU {item.sku.sku} · Location {currentLocation}</p></div><div className="text-sm">{item.qtyPicked} / {item.qtyRequired}</div></div><ProgressBar value={pct} /></CardContent></Card>; })}</div>
    </div>
  );
}
