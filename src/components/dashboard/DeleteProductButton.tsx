"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type Props = {
  productId: string;
  productName: string;
  redirectTo?: string;
  size?: "sm" | "default";
};

export function DeleteProductButton({ productId, productName, redirectTo = "/dashboard/products", size = "default" }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (res.status === 409) {
        const body = await res.json();
        setError(body.error ?? "Cannot delete — inventory exists.");
        setConfirming(false);
        return;
      }
      if (!res.ok) {
        setError("Delete failed. Please try again.");
        setConfirming(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-destructive font-medium">Delete &quot;{productName}&quot;?</span>
          <Button size={size} variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Confirm"}
          </Button>
          <Button size={size} variant="outline" onClick={() => { setConfirming(false); setError(null); }} disabled={deleting}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size={size}
          variant="ghost"
          onClick={() => setConfirming(true)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {size !== "sm" && <span className="ml-2">Delete Product</span>}
        </Button>
      )}
    </div>
  );
}
