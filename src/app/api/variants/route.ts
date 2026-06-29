import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const variantSchema = z.object({
  productId: z.string(),
  name: z.string().min(1),
  attributes: z.record(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = variantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const variant = await prisma.productVariant.create({ data: { ...parsed.data, attributes: parsed.data.attributes ?? {} } });
  return NextResponse.json(variant, { status: 201 });
}
