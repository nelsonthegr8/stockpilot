"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";

export default function ShippingSettingsPage() {
  const [mode, setMode] = useState("Both");
  const [shippoKey, setShippoKey] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/settings").then((res) => res.json()).then((data) => { const map = Object.fromEntries(data.map((item: { key: string; value: string }) => [item.key, item.value])); setMode(map.shipping_label_mode ?? "Both"); setShippoKey(map.shippo_api_key ?? ""); }); }, []);
  async function saveSettings() { await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shipping_label_mode: { value: mode }, shippo_api_key: { value: shippoKey, encrypted: true } }) }); setMessage("Shipping settings saved."); }
  return <div className="space-y-6 p-6"><PageHeader title="Shipping Settings" description="Configure label generation mode and Shippo credentials." action={<Button onClick={saveSettings}>Save</Button>} />{message ? <Card><CardContent className="p-4 text-sm">{message}</CardContent></Card> : null}<Card><CardHeader><CardTitle>Label workflow</CardTitle></CardHeader><CardContent className="space-y-4"><select value={mode} onChange={(e) => setMode(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="Shippo">Shippo</option><option value="Manual">Manual</option><option value="Both">Both</option></select><Input value={shippoKey} onChange={(e) => setShippoKey(e.target.value)} placeholder="Shippo API key" /></CardContent></Card></div>;
}
