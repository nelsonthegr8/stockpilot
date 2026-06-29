export const dynamic = "force-dynamic";
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

  // Gather all SKU ids under this product
  const skuIds = (
    await prisma.sKU.findMany({
      where: { variant: { productId: params.id } },
      select: { id: true },
    })
  ).map((s) => s.id);

  // Block if any SKU has stock on hand
  const stockCount = await prisma.inventoryLevel.aggregate({
    _sum: { qty: true },
    where: { skuId: { in: skuIds }, qty: { gt: 0 } },
  });
  if ((stockCount._sum.qty ?? 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete a product that has inventory on hand. Adjust stock to zero first." },
      { status: 409 },
    );
  }

  // Block if any orders reference this product's SKUs
  const orderItemCount = await prisma.orderItem.count({ where: { skuId: { in: skuIds } } });
  if (orderItemCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a product that has order history. Deactivate it instead." },
      { status: 409 },
    );
  }

  // Delete all child records not covered by schema cascade, then the product
  await prisma.$transaction([
    prisma.inventoryAdjustment.deleteMany({ where: { skuId: { in: skuIds } } }),
    prisma.pickListItem.deleteMany({ where: { skuId: { in: skuIds } } }),
    prisma.printJob.deleteMany({ where: { skuId: { in: skuIds } } }),
    prisma.variantPrintConfig.deleteMany({ where: { skuId: { in: skuIds } } }),
    prisma.purchaseOrderItem.deleteMany({ where: { skuId: { in: skuIds } } }),
    prisma.product.delete({ where: { id: params.id } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
