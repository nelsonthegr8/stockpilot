export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sku = await prisma.sKU.findUnique({
    where: { id: params.id },
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
      adjustments: {
        take: 20,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!sku) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(sku);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const sku = await prisma.sKU.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(sku);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.sKU.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
