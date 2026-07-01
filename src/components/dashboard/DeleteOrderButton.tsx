"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type Props = {
  orderId: string;
  orderRef: string;
  redirectTo?: string;
  size?: "sm" | "default";
};

export function DeleteOrderButton({ orderId, orderRef, redirectTo = "/dashboard/orders", size = "default" }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      router.push(redirectTo);
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-destructive font-medium">Delete {orderRef}?</span>
        <Button size={size} variant="destructive" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Confirm"}
        </Button>
        <Button size={size} variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button size={size} variant="ghost" onClick={() => setConfirming(true)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
      <Trash2 className="h-4 w-4" />
      {size !== "sm" && <span className="ml-2">Delete Order</span>}
    </Button>
  );
}
