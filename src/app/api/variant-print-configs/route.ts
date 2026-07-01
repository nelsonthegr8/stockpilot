export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const mappingSchema = z.object({
  skuId: z.string(),
  channelVariantId: z.string(),
  archiveId: z.number().int(),
  plateId: z.number().int(),
  projectId: z.number().int().nullable().optional(),
  targetModel: z.string().min(1),
  filamentType: z.string().min(1),
  filamentOverrides: z.unknown().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mappings = await prisma.variantPrintConfig.findMany({
    include: {
      sku: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(mappings);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = mappingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const mapping = await prisma.variantPrintConfig.create({
    data: {
      ...parsed.data,
      filamentOverrides: (parsed.data.filamentOverrides as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
    },
  });
  return NextResponse.json(mapping, { status: 201 });
}
