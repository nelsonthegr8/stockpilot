import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const channelSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["ETSY", "SHOPIFY", "AMAZON", "EBAY", "MANUAL"]),
  active: z.boolean().optional(),
  credentials: z.record(z.unknown()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const channels = await prisma.salesChannel.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(channels);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = channelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const channel = await prisma.salesChannel.create({ data: { ...parsed.data, credentials: parsed.data.credentials ?? {} } });
  return NextResponse.json(channel, { status: 201 });
}
