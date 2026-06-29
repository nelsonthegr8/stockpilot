import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const variantSchema = z.object({
  name: z.string().min(1).optional(),
  attributes: z.record(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = variantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const variant = await prisma.productVariant.update({ where: { id: params.id }, data: { ...parsed.data, attributes: parsed.data.attributes ?? undefined } });
  return NextResponse.json(variant);
}
