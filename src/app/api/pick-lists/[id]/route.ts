export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pickList = await prisma.pickList.findUnique({
    where: { id: params.id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      orders: { include: { shipments: true } },
      items: {
        include: {
          sku: {
            include: {
              variant: { include: { product: true } },
              inventoryLevels: { include: { location: true } },
            },
          },
        },
      },
    },
  });
  if (!pickList) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pickList);
}
