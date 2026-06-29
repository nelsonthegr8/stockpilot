import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      variants: {
        include: {
          skus: {
            include: {
              inventoryLevels: {
                include: {
                  location: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const product = await prisma.product.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(product);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.product.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
