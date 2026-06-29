"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/shared";

type Channel = { id: string; name: string; type: string; active: boolean; lastSyncAt: string | null };

export default function ChannelSettingsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/channels").then((res) => res.json()).then(setChannels); }, []);
  async function patchChannel(id: string, payload: Partial<Channel>) { const response = await fetch(`/api/channels/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json(); setChannels((prev) => prev.map((channel) => channel.id === id ? { ...channel, ...data } : channel)); }
  return <div className="space-y-6 p-6"><PageHeader title="Channels" description="Monitor channel connection health and sync status." />{message ? <Card><CardContent className="p-4 text-sm">{message}</CardContent></Card> : null}<div className="grid gap-4">{channels.map((channel) => <Card key={channel.id}><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{channel.name}</p><p className="text-sm text-muted-foreground">{channel.type} · Last sync {channel.lastSyncAt ? new Date(channel.lastSyncAt).toLocaleString() : "Never"}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => patchChannel(channel.id, { active: !channel.active })}>{channel.active ? "Disconnect" : "Connect"}</Button><Button variant="outline" onClick={() => { patchChannel(channel.id, { lastSyncAt: new Date().toISOString() as never }); setMessage(`Sync triggered for ${channel.name}.`); }}>Sync Now</Button></div></CardContent></Card>)}</div></div>;
}
