export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const buttonSchema = z.object({
  name: z.string().min(1).optional(),
  ipAddress: z.string().optional(),
  notifyPath: z.string().optional(),
  notifyMessageTemplate: z.string().optional(),
  printerName: z.string().optional(),
  downstreamMethod: z.string().optional(),
  downstreamUrlTemplate: z.string().nullable().optional(),
  downstreamBodyTemplate: z.string().nullable().optional(),
  status: z.enum(["UNPAIRED", "PAIRED", "LIT", "ACKNOWLEDGED"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = buttonSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const button = await prisma.operatorButton.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(button);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.operatorButton.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
