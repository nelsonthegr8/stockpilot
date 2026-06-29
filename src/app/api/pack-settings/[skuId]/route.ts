export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  boxPresetId: z.string(),
  qtyPerBox: z.number().int().positive().optional(),
  packingNotes: z.string().optional(),
});

export async function GET(_: Request, { params }: { params: { skuId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const setting = await prisma.packSetting.findUnique({
    where: { skuId: params.skuId },
    include: { boxPreset: true },
  });
  return NextResponse.json(setting ?? null);
}

export async function PUT(request: Request, { params }: { params: { skuId: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const setting = await prisma.packSetting.upsert({
    where: { skuId: params.skuId },
    create: { skuId: params.skuId, ...parsed.data },
    update: parsed.data,
    include: { boxPreset: true },
  });
  return NextResponse.json(setting);
}

export async function DELETE(_: Request, { params }: { params: { skuId: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.packSetting.deleteMany({ where: { skuId: params.skuId } });
  return new NextResponse(null, { status: 204 });
}
