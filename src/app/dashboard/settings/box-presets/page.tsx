"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/shared";

type BoxPreset = {
  id: string;
  name: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  maxWeightOz: number;
  active: boolean;
};

const emptyForm = { name: "", lengthIn: "", widthIn: "", heightIn: "", maxWeightOz: "" };

export default function BoxPresetsPage() {
  const [presets, setPresets] = useState<BoxPreset[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/pack-presets").then((r) => r.json()).then(setPresets);
  }, []);

  function setField(k: keyof typeof emptyForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/pack-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          lengthIn: parseFloat(form.lengthIn),
          widthIn: parseFloat(form.widthIn),
          heightIn: parseFloat(form.heightIn),
          maxWeightOz: parseFloat(form.maxWeightOz),
        }),
      });
      if (!res.ok) { const err = await res.json(); setMessage(`Error: ${JSON.stringify(err.error)}`); return; }
      const created: BoxPreset = await res.json();
      setPresets((p) => [...p, created]);
      setForm(emptyForm);
      setShowForm(false);
      setMessage(`Box preset "${created.name}" created.`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(preset: BoxPreset) {
    const res = await fetch(`/api/pack-presets/${preset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !preset.active }),
    });
    const updated: BoxPreset = await res.json();
    setPresets((p) => p.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/pack-presets/${id}`, { method: "DELETE" });
    setPresets((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        back={{ href: "/dashboard/settings", label: "Settings" }}
        title="Box Presets"
        description="Define standard box sizes for guided packing. SKUs can be assigned a preset so operators know which box to use."
        action={
          <Button onClick={() => { setShowForm((v) => !v); setMessage(""); }}>
            {showForm ? "Cancel" : "+ New Preset"}
          </Button>
        }
      />

      {message && <Card><CardContent className="p-4 text-sm">{message}</CardContent></Card>}

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">New Box Preset</h3>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bp-name">Preset name</Label>
                <Input id="bp-name" required value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Small Mailer 6×4×2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-len">Length (in)</Label>
                <Input id="bp-len" type="number" step="0.1" required value={form.lengthIn} onChange={(e) => setField("lengthIn", e.target.value)} placeholder="6.0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-wid">Width (in)</Label>
                <Input id="bp-wid" type="number" step="0.1" required value={form.widthIn} onChange={(e) => setField("widthIn", e.target.value)} placeholder="4.0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-ht">Height (in)</Label>
                <Input id="bp-ht" type="number" step="0.1" required value={form.heightIn} onChange={(e) => setField("heightIn", e.target.value)} placeholder="2.0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-wt">Max weight (oz)</Label>
                <Input id="bp-wt" type="number" step="0.5" required value={form.maxWeightOz} onChange={(e) => setField("maxWeightOz", e.target.value)} placeholder="32" />
              </div>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Preset"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {presets.length === 0 && !showForm && (
          <p className="col-span-full text-sm text-muted-foreground">No box presets yet. Add one to enable guided packing.</p>
        )}
        {presets.map((preset) => (
          <Card key={preset.id} className={preset.active ? "" : "opacity-50"}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between">
                <p className="font-semibold">{preset.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${preset.active ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-500"}`}>
                  {preset.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {preset.lengthIn}&quot; × {preset.widthIn}&quot; × {preset.heightIn}&quot; · max {preset.maxWeightOz} oz
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleActive(preset)}>
                  {preset.active ? "Deactivate" : "Activate"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(preset.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
