export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { canTransition } from "@/lib/orderRouting";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      channel: true,
      items: {
        include: {
          sku: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
          printJobs: true,
        },
      },
      shipments: true,
      pickLists: true,
      financial: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (body.status) {
    const current = await prisma.order.findUniqueOrThrow({
      where: { id: params.id },
      select: { status: true },
    });

    if (!canTransition(current.status, body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${current.status} to ${body.status}` },
        { status: 400 },
      );
    }
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(order);
}
