export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const mappingSchema = z.object({
  skuId: z.string().optional(),
  channelVariantId: z.string().optional(),
  archiveId: z.number().int().optional(),
  plateId: z.number().int().optional(),
  projectId: z.number().int().nullable().optional(),
  targetModel: z.string().optional(),
  filamentType: z.string().optional(),
  filamentOverrides: z.unknown().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = mappingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { skuId, filamentOverrides, ...rest } = parsed.data;
  const mapping = await prisma.variantPrintConfig.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(skuId ? { sku: { connect: { id: skuId } } } : {}),
      ...("filamentOverrides" in parsed.data
        ? { filamentOverrides: (filamentOverrides as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull }
        : {}),
    },
  });
  return NextResponse.json(mapping);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.variantPrintConfig.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
