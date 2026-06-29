"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/shared";

export default function SystemSettingsPage() {
  const [message, setMessage] = useState("");
  return <div className="space-y-6 p-6"><PageHeader title="System" description="Version and maintenance tools." /><Card><CardHeader><CardTitle>Application Version</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-2xl font-semibold">0.1.0</p><Button onClick={() => setMessage("Update check complete. No newer version is configured for this environment.")}>Check for Updates</Button>{message ? <p className="text-sm text-muted-foreground">{message}</p> : null}</CardContent></Card></div>;
}
