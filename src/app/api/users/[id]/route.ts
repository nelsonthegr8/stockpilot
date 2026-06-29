import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "PICKER_PACKER", "VIEWER"]).optional(),
  active: z.boolean().optional(),
  name: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });

  return NextResponse.json(user);
}
