import { auth } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "PICKER_PACKER", "VIEWER"]),
});

export async function GET() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const inviteToken = randomBytes(32).toString("hex");
  const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: "",
      inviteToken,
      inviteExpiry,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    await sendInviteEmail(parsed.data.email, inviteToken, baseUrl);
  } catch (error) {
    console.error("Failed to send invite email", error);
  }

  return NextResponse.json(user, { status: 201 });
}
