"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileJson } from "lucide-react";

export function WebhookPayloadButton({ payload }: { payload: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <FileJson className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Raw Payload</DialogTitle>
          </DialogHeader>
          <pre className="overflow-auto flex-1 text-xs bg-muted rounded-md p-4 font-mono">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
