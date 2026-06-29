"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

type Level = {
  id: string;
  qty: number;
  reservedQty: number;
  skuId: string;
  locationId: string;
  sku: { sku: string; reorderPoint: number; variant: { name: string; product: { name: string } } };
  location: { name: string };
};

type RowState = {
  value: string;
  status: "idle" | "saving" | "saved" | "error";
  message?: string;
  dirty: boolean;
};

export default function InventoryAuditPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    fetch("/api/inventory/levels")
      .then((r) => r.json())
      .then((data: Level[]) => {
        setLevels(data);
        const initial: Record<string, RowState> = {};
        for (const l of data) {
          initial[l.id] = { value: String(l.qty), status: "idle", dirty: false };
        }
        setRows(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(id: string, value: string) {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], value, dirty: true, status: "idle", message: undefined },
    }));
  }

  const auditRow = useCallback(async (level: Level, valueStr: string) => {
    const parsed = parseInt(valueStr, 10);
    const actualQty = isNaN(parsed) ? 0 : parsed;

    setRows((prev) => ({ ...prev, [level.id]: { ...prev[level.id], status: "saving" } }));

    const res = await fetch("/api/inventory/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skuId: level.skuId, locationId: level.locationId, actualQty }),
    });

    if (!res.ok) {
      const err = await res.json();
      setRows((prev) => ({
        ...prev,
        [level.id]: { ...prev[level.id], status: "error", message: err.error ?? "Failed", dirty: false },
      }));
      return;
    }

    if (actualQty <= 0) {
      // Remove the row from both state maps so the tr vanishes immediately
      setLevels((prev) => prev.filter((l) => l.id !== level.id));
      setRows((prev) => {
        const next = { ...prev };
        delete next[level.id];
        return next;
      });
    } else {
      setRows((prev) => ({
        ...prev,
        [level.id]: { value: String(actualQty), status: "saved", dirty: false, message: `Set to ${actualQty}` },
      }));
      setLevels((prev) => prev.map((l) => l.id === level.id ? { ...l, qty: actualQty } : l));
    }
  }, []);

  async function saveAll() {
    setSavingAll(true);
    const dirty = levels.filter((l) => rows[l.id]?.dirty);
    await Promise.all(dirty.map((l) => auditRow(l, rows[l.id].value)));
    setSavingAll(false);
  }

  const dirtyCount = levels.filter((l) => rows[l.id]?.dirty).length;

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        back={{ href: "/dashboard/inventory", label: "Inventory" }}
        title="Inventory Audit"
        description="Set the actual on-hand quantity for each SKU. Setting a value of 0 removes that inventory record."
        action={
          dirtyCount > 0 ? (
            <Button onClick={saveAll} disabled={savingAll}>
              {savingAll ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : `Save ${dirtyCount} change${dirtyCount !== 1 ? "s" : ""}`}
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border-2 border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <strong>How this works:</strong> Enter the exact physical count for each SKU. Clicking Set (or Save All) records a{" "}
        <em>Physical Count</em> adjustment and sets the system qty to match. Setting a value ≤ 0 deletes that inventory record.
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-left font-medium">Product / Variant</th>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-right font-medium">System Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Reserved</th>
                  <th className="px-4 py-3 text-center font-medium w-40">Actual On Hand</th>
                  <th className="px-4 py-3 text-center font-medium w-24">Action</th>
                  <th className="px-4 py-3 text-left font-medium w-32">Status</th>
                </tr>
              </thead>
              <tbody>
                {levels.filter((l) => !!rows[l.id]).map((level) => {
                  const row = rows[level.id];
                  const parsedVal = parseInt(row.value, 10);
                  const willRemove = !isNaN(parsedVal) && parsedVal <= 0;
                  const isLow = level.sku.reorderPoint > 0 && level.qty <= level.sku.reorderPoint;

                  return (
                    <tr key={level.id} className={`border-b border-border transition-colors ${row.dirty ? "bg-amber-50/60 dark:bg-amber-900/10" : ""}`}>
                      <td className="px-4 py-3 font-mono">{level.sku.sku}</td>
                      <td className="px-4 py-3 text-muted-foreground">{level.sku.variant.product.name} — {level.sku.variant.name}</td>
                      <td className="px-4 py-3">{level.location.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={isLow ? "text-amber-600 font-semibold" : ""}>{level.qty}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{level.reservedQty}</td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={row.value}
                          onChange={(e) => handleChange(level.id, e.target.value)}
                          disabled={row.status === "saving"}
                          className={`w-full text-center tabular-nums ${willRemove && row.dirty ? "border-destructive text-destructive" : ""}`}
                        />
                        {willRemove && row.dirty && (
                          <p className="mt-1 text-center text-xs text-destructive">Will remove record</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.status === "saving" ? (
                          <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Button
                            size="sm"
                            variant={willRemove && row.dirty ? "destructive" : "outline"}
                            disabled={!row.dirty}
                            onClick={() => auditRow(level, row.value)}
                          >
                            {willRemove && row.dirty ? "Remove" : "Set"}
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "saved" && (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> {row.message}
                          </span>
                        )}
                        {row.status === "error" && (
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="h-3 w-3" /> {row.message}
                          </span>
                        )}
                        {row.dirty && row.status === "idle" && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                            Unsaved
                          </Badge>
                        )}
                        {!row.dirty && row.status === "idle" && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {levels.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No inventory records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
