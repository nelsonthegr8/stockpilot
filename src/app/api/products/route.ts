export const dynamic = "force-dynamic";
import { BusinessProfileType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  businessProfileType: z.nativeEnum(BusinessProfileType),
  images: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const businessProfile = searchParams.get("businessProfile");
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const where = { ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}), ...(businessProfile ? { businessProfileType: businessProfile as BusinessProfileType } : {}) };
  const [products, total] = await Promise.all([prisma.product.findMany({ where, include: { category: true, variants: { include: { skus: true } } }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }), prisma.product.count({ where })]);
  return NextResponse.json({ products, total, page, limit });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const product = await prisma.product.create({ data: { ...parsed.data, images: parsed.data.images ?? [] } });
  return NextResponse.json(product, { status: 201 });
}
