import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductEditor } from "@/components/dashboard/ProductEditor";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id }, include: { variants: { include: { skus: true } } } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!product) notFound();

  return <ProductEditor mode="edit" categories={categories} initialProduct={product as never} />;
}
