export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const printerSchema = z.object({
  name: z.string().min(1),
  purpose: z.enum(["SKU_LABEL", "SHIPPING_LABEL", "BOTH"]),
  connectionType: z.enum(["NETWORK", "BLUETOOTH", "USB_DIRECT"]),
  ipAddress: z.string().optional(),
  bluetoothDeviceId: z.string().optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const printers = await prisma.printerConfig.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(printers);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = printerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const printer = await prisma.printerConfig.create({ data: parsed.data });
  return NextResponse.json(printer, { status: 201 });
}
