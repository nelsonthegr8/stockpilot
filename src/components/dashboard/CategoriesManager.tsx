"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Category = { id: string; name: string; slug: string; children: Category[] };

export function CategoriesManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<{ id?: string; name: string; slug: string; parentId?: string | null } | null>(null);

  async function saveCategory() {
    if (!editing) return;
    const method = editing.id ? "PATCH" : "POST";
    const url = editing.id ? `/api/categories/${editing.id}` : "/api/categories";
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    const saved = await response.json();
    setCategories((prev) => editing.id ? prev.map((item) => item.id === saved.id ? { ...item, ...saved } : item) : [...prev, { ...saved, children: [] }]);
    setEditing(null);
  }

  async function removeCategory(id: string) {
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEditing({ name: "", slug: "" })}>Add Category</Button></div>
      <Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Children</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{categories.map((category) => <TableRow key={category.id}><TableCell className="font-medium">{category.name}</TableCell><TableCell>{category.slug}</TableCell><TableCell>{category.children.length}</TableCell><TableCell className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditing({ id: category.id, name: category.name, slug: category.slug })}>Edit</Button><Button size="sm" variant="ghost" onClick={() => removeCategory(category.id)}>Delete</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><Card className="w-full max-w-lg"><CardContent className="grid gap-4 p-6"><Input value={editing.name} onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)} placeholder="Category name" /><Input value={editing.slug} onChange={(e) => setEditing((prev) => prev ? { ...prev, slug: e.target.value } : prev)} placeholder="category-slug" /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveCategory}>Save</Button></div></CardContent></Card></div> : null}
    </div>
  );
}
