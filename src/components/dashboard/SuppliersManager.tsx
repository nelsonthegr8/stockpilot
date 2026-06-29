"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  leadTimeDays: number;
  paymentTerms: string | null;
  notes: string | null;
};

const emptySupplier = { id: "", name: "", contactName: "", email: "", phone: "", address: "", leadTimeDays: 7, paymentTerms: "", notes: "" };

export function SuppliersManager({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [editing, setEditing] = useState<typeof emptySupplier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveSupplier() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `/api/suppliers/${editing.id}` : "/api/suppliers";
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editing, leadTimeDays: Number(editing.leadTimeDays) }) });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save supplier");
      }
      const saved = await response.json();
      setSuppliers((prev) => editing.id ? prev.map((item) => item.id === saved.id ? saved : item) : [saved, ...prev]);
      setEditing(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  async function removeSupplier(id: string) {
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    setSuppliers((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="destructive"><AlertTitle>Supplier action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="flex justify-end"><Button onClick={() => setEditing(emptySupplier)}>Add Supplier</Button></div>
      <Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Lead Time</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{suppliers.map((supplier) => <TableRow key={supplier.id}><TableCell className="font-medium">{supplier.name}</TableCell><TableCell>{supplier.contactName ?? "—"}</TableCell><TableCell>{supplier.email ?? "—"}</TableCell><TableCell>{supplier.leadTimeDays} days</TableCell><TableCell className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setEditing({ id: supplier.id, name: supplier.name, contactName: supplier.contactName ?? "", email: supplier.email ?? "", phone: supplier.phone ?? "", address: supplier.address ?? "", leadTimeDays: supplier.leadTimeDays, paymentTerms: supplier.paymentTerms ?? "", notes: supplier.notes ?? "" })}>Edit</Button><Button variant="ghost" size="sm" onClick={() => removeSupplier(supplier.id)}>Delete</Button></TableCell></TableRow>)}{!suppliers.length ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No suppliers yet.</TableCell></TableRow> : null}</TableBody></Table></CardContent></Card>
      {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><Card className="w-full max-w-2xl"><CardHeader><CardTitle>{editing.id ? "Edit Supplier" : "New Supplier"}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Input value={editing.name} onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)} placeholder="Name" /><Input value={editing.contactName} onChange={(e) => setEditing((prev) => prev ? { ...prev, contactName: e.target.value } : prev)} placeholder="Contact name" /><Input value={editing.email} onChange={(e) => setEditing((prev) => prev ? { ...prev, email: e.target.value } : prev)} placeholder="Email" /><Input value={editing.phone} onChange={(e) => setEditing((prev) => prev ? { ...prev, phone: e.target.value } : prev)} placeholder="Phone" /><Input value={editing.address} onChange={(e) => setEditing((prev) => prev ? { ...prev, address: e.target.value } : prev)} placeholder="Address" className="md:col-span-2" /><Input type="number" value={editing.leadTimeDays} onChange={(e) => setEditing((prev) => prev ? { ...prev, leadTimeDays: Number(e.target.value) } : prev)} placeholder="Lead time days" /><Input value={editing.paymentTerms} onChange={(e) => setEditing((prev) => prev ? { ...prev, paymentTerms: e.target.value } : prev)} placeholder="Payment terms" /><Input value={editing.notes} onChange={(e) => setEditing((prev) => prev ? { ...prev, notes: e.target.value } : prev)} placeholder="Notes" className="md:col-span-2" /><div className="md:col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveSupplier} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div></CardContent></Card></div> : null}
    </div>
  );
}
