import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/encrypt";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const settingsSchema = z.record(
  z.string(),
  z.object({
    value: z.string(),
    encrypted: z.boolean().optional(),
  }),
);

export async function GET() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.appSetting.findMany();
  return NextResponse.json(
    settings.map((setting) => ({
      ...setting,
      value: setting.encrypted ? "***" : setting.value,
    })),
  );
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  for (const [key, { value, encrypted }] of Object.entries(parsed.data)) {
    const finalValue = encrypted ? encrypt(value) : value;
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: finalValue, encrypted: encrypted ?? false },
      update: { value: finalValue, encrypted: encrypted ?? false },
    });
  }

  return NextResponse.json({ success: true });
}
