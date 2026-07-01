export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const printerSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.enum(["SKU_LABEL", "SHIPPING_LABEL", "BOTH"]).optional(),
  connectionType: z.enum(["NETWORK", "BLUETOOTH", "USB_DIRECT"]).optional(),
  ipAddress: z.string().nullable().optional(),
  bluetoothDeviceId: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = printerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const printer = await prisma.printerConfig.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(printer);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.printerConfig.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
