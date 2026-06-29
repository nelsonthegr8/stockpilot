import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const channelSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["ETSY", "SHOPIFY", "AMAZON", "EBAY", "MANUAL"]).optional(),
  active: z.boolean().optional(),
  credentials: z.record(z.unknown()).optional(),
  lastSyncAt: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = channelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const channel = await prisma.salesChannel.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      lastSyncAt: parsed.data.lastSyncAt ? new Date(parsed.data.lastSyncAt) : undefined,
    },
  });
  return NextResponse.json(channel);
}
