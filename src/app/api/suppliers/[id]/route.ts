import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  leadTimeDays: z.number().int().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = Object.fromEntries(Object.entries(parsed.data).map(([key, value]) => [key, value === "" ? null : value]));
  const supplier = await prisma.supplier.update({ where: { id: params.id }, data });
  return NextResponse.json(supplier);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.supplier.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
