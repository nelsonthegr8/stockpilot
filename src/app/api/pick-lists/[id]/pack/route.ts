import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "PICKER_PACKER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pickList = await prisma.pickList.findUnique({
    where: { id: params.id },
    include: { items: true, orders: true },
  });
  if (!pickList) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const incomplete = pickList.items.some((item) => item.qtyPicked < item.qtyRequired);
  if (incomplete) return NextResponse.json({ error: "Items still pending" }, { status: 400 });

  await prisma.pickList.update({ where: { id: params.id }, data: { status: "COMPLETE" } });
  await prisma.order.updateMany({ where: { id: { in: pickList.orders.map((order) => order.id) } }, data: { status: "READY_TO_SHIP" } });
  return NextResponse.json({ success: true });
}
