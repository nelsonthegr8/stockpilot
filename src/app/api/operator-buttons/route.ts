export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const buttonSchema = z.object({
  name: z.string().min(1),
  ipAddress: z.string().min(1),
  notifyPath: z.string().optional(),
  notifyMessageTemplate: z.string().optional(),
  printerName: z.string().min(1),
  downstreamMethod: z.string().optional(),
  downstreamUrlTemplate: z.string().optional(),
  downstreamBodyTemplate: z.string().optional(),
  status: z.enum(["UNPAIRED", "PAIRED", "LIT", "ACKNOWLEDGED"]).optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const buttons = await prisma.operatorButton.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(buttons);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = buttonSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const button = await prisma.operatorButton.create({ data: parsed.data });
  return NextResponse.json(button, { status: 201 });
}
