export const dynamic = "force-dynamic";
import { POStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const poSchema = z.object({
  supplierId: z.string().optional(),
  locationId: z.string(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      skuId: z.string(),
      qtyOrdered: z.number().int().positive(),
      unitCost: z.number().min(0),
    }),
  ),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const pos = await prisma.purchaseOrder.findMany({
    where: status ? { status: status as POStatus } : {},
    include: {
      supplier: true,
      location: true,
      items: {
        include: {
          sku: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = poSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { items, ...poData } = parsed.data;
  const po = await prisma.purchaseOrder.create({
    data: {
      ...poData,
      expectedDate: poData.expectedDate ? new Date(poData.expectedDate) : undefined,
      createdBy: (session.user as { id: string }).id,
      items: { create: items },
    },
    include: { items: true },
  });

  return NextResponse.json(po, { status: 201 });
}
