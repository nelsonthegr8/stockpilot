export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const scanSchema = z.object({
  code: z.string().min(1),
  mode: z.enum(["scan", "qty"]),
  qty: z.number().int().positive().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "PICKER_PACKER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pickList = await prisma.pickList.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { sku: true }, orderBy: { id: "asc" } },
    },
  });

  if (!pickList) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const target = pickList.items.find((item) => item.qtyPicked < item.qtyRequired);
  if (!target) return NextResponse.json({ error: "Pick list already complete" }, { status: 400 });

  const matches = parsed.data.code === target.sku.sku || parsed.data.code === target.sku.barcode;
  if (!matches) {
    return NextResponse.json({ error: `Expected ${target.sku.sku}`, expectedSku: target.sku.sku }, { status: 409 });
  }

  const incrementBy = parsed.data.mode === "qty" ? Math.min(parsed.data.qty ?? target.qtyRequired, target.qtyRequired - target.qtyPicked) : 1;
  const updated = await prisma.pickListItem.update({
    where: { id: target.id },
    data: {
      qtyPicked: { increment: incrementBy },
      scannedBarcode: parsed.data.code,
      confirmedAt: target.qtyPicked + incrementBy >= target.qtyRequired ? new Date() : target.confirmedAt,
    },
  });

  const refreshed = await prisma.pickList.findUnique({ where: { id: params.id }, include: { items: true } });
  const complete = refreshed ? refreshed.items.every((item) => item.qtyPicked >= item.qtyRequired) : false;
  if (pickList.status === "PENDING") {
    await prisma.pickList.update({ where: { id: params.id }, data: { status: "IN_PROGRESS" } });
  }

  return NextResponse.json({ item: updated, complete });
}
