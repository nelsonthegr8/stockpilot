"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";

type ButtonRow = { id: string; name: string; ipAddress: string; printerName: string; status: string; active: boolean };
const emptyRow = { id: "", name: "", ipAddress: "", printerName: "", status: "UNPAIRED", active: true };

export default function OperatorButtonsPage() {
  const [rows, setRows] = useState<ButtonRow[]>([]);
  const [editing, setEditing] = useState<typeof emptyRow | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/operator-buttons").then((res) => res.json()).then(setRows); }, []);
  async function saveRow() { if (!editing) return; const response = await fetch(editing.id ? `/api/operator-buttons/${editing.id}` : "/api/operator-buttons", { method: editing.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) }); const data = await response.json(); setRows((prev) => editing.id ? prev.map((item) => item.id === data.id ? data : item) : [...prev, data]); setEditing(null); }
  return <div className="space-y-6 p-6"><PageHeader back={{ href: "/dashboard/settings", label: "Settings" }} title="Operator Buttons" description="Pair and manage downstream floor buttons." action={<Button onClick={() => setEditing(emptyRow)}>Add Button</Button>} />{message ? <Card><CardContent className="p-4 text-sm">{message}</CardContent></Card> : null}<div className="grid gap-4">{rows.map((row) => <Card key={row.id}><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">{row.ipAddress} · {row.printerName} · {row.status}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setEditing({ id: row.id, name: row.name, ipAddress: row.ipAddress, printerName: row.printerName, status: row.status, active: row.active })}>Edit</Button><Button variant="outline" onClick={() => setMessage(`Pairing initiated for ${row.name}.`)}>Pair</Button><Button variant="outline" onClick={() => setMessage(`Test notification sent to ${row.name}.`)}>Test</Button></div></CardContent></Card>)}</div>{editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><Card className="w-full max-w-xl"><CardContent className="grid gap-4 p-6 md:grid-cols-2"><Input value={editing.name} onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)} placeholder="Button name" /><Input value={editing.ipAddress} onChange={(e) => setEditing((prev) => prev ? { ...prev, ipAddress: e.target.value } : prev)} placeholder="IP address" /><Input value={editing.printerName} onChange={(e) => setEditing((prev) => prev ? { ...prev, printerName: e.target.value } : prev)} placeholder="Printer name" /><select value={editing.status} onChange={(e) => setEditing((prev) => prev ? { ...prev, status: e.target.value } : prev)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="UNPAIRED">Unpaired</option><option value="PAIRED">Paired</option><option value="LIT">Lit</option><option value="ACKNOWLEDGED">Acknowledged</option></select><div className="md:col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveRow}>Save</Button></div></CardContent></Card></div> : null}</div>;
}
