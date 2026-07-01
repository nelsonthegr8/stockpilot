export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const levels = await prisma.inventoryLevel.findMany({
    include: {
      sku: { include: { variant: { include: { product: true } } } },
      location: true,
    },
    orderBy: [{ sku: { sku: "asc" } }, { location: { name: "asc" } }],
  });

  return NextResponse.json(levels);
}
