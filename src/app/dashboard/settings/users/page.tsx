"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/shared";

type User = { id: string; email: string; name: string | null; role: string; active: boolean; createdAt: string };

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/users").then((res) => res.json()).then(setUsers); }, []);
  async function inviteUser() { const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, role }) }); const data = await response.json(); setMessage(response.ok ? "Invite sent." : (data.error ?? "Invite failed")); if (response.ok) setUsers((prev) => [...prev, data]); }
  async function patchUser(id: string, payload: Partial<User>) { const response = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); if (response.ok) { const data = await response.json(); setUsers((prev) => prev.map((user) => user.id === id ? { ...user, ...data } : user)); } }
  return <div className="space-y-6 p-6"><PageHeader back={{ href: "/dashboard/settings", label: "Settings" }} title="Users" description="Invite, change roles, and deactivate user accounts." />{message ? <Card><CardContent className="p-4 text-sm">{message}</CardContent></Card> : null}<Card><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_180px_auto]"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /><select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="ADMIN">Admin</option><option value="MANAGER">Manager</option><option value="PICKER_PACKER">Picker/Packer</option><option value="VIEWER">Viewer</option></select><Button onClick={inviteUser}>Invite</Button></CardContent></Card><Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{users.map((user) => <TableRow key={user.id}><TableCell><div><p className="font-medium">{user.name ?? "No name"}</p><p className="text-sm text-muted-foreground">{user.email}</p></div></TableCell><TableCell><select value={user.role} onChange={(e) => patchUser(user.id, { role: e.target.value as User["role"] })} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="ADMIN">Admin</option><option value="MANAGER">Manager</option><option value="PICKER_PACKER">Picker/Packer</option><option value="VIEWER">Viewer</option></select></TableCell><TableCell>{user.active ? "Active" : "Inactive"}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => patchUser(user.id, { active: !user.active })}>{user.active ? "Deactivate" : "Activate"}</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}
