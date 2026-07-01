export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const acceptInviteSchema = z.object({
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const user = await prisma.user.findUnique({
    where: { inviteToken: params.token },
    select: {
      email: true,
      name: true,
      inviteExpiry: true,
    },
  });

  if (!user || (user.inviteExpiry && user.inviteExpiry < new Date())) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  return NextResponse.json({ email: user.email, name: user.name });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const body = await req.json();
  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { inviteToken: params.token },
  });

  if (!user || (user.inviteExpiry && user.inviteExpiry < new Date())) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      name: parsed.data.name ?? user.name,
      inviteToken: null,
      inviteExpiry: null,
    },
  });

  return NextResponse.json({ success: true });
}
