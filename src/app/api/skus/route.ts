import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSkuSchema = z.object({
  variantId: z.string(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  weight: z.number().optional(),
  weightUnit: z.string().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  dimUnit: z.string().optional(),
  costPrice: z.number().optional(),
  retailPrice: z.number().optional(),
  reorderPoint: z.number().optional(),
  reorderQty: z.number().optional(),
  stlFileUrl: z.string().optional(),
  sourceStore: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";

  const skus = await prisma.sKU.findMany({
    where: search
      ? {
          OR: [
            { sku: { contains: search, mode: "insensitive" } },
            { barcode: { contains: search, mode: "insensitive" } },
          ],
        }
      : {},
    include: {
      variant: {
        include: {
          product: true,
        },
      },
      inventoryLevels: {
        include: {
          location: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(skus);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSkuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const sku = await prisma.sKU.create({ data: parsed.data });
  return NextResponse.json(sku, { status: 201 });
}
