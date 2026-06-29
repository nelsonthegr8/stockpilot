import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const poSchema = z.object({
  supplierId: z.string().nullable().optional(),
  locationId: z.string().optional(),
  expectedDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELLED"]).optional(),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      supplier: true,
      location: true,
      items: {
        include: {
          sku: { include: { variant: { include: { product: true } } } },
        },
      },
    },
  });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = poSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const po = await prisma.purchaseOrder.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : parsed.data.expectedDate === null ? null : undefined,
    },
  });
  return NextResponse.json(po);
}
