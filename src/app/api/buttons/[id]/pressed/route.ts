import { callDownstream } from "@/lib/operatorButtons";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const button = await prisma.operatorButton.findUnique({
    where: { id: params.id },
  });
  if (!button) {
    return NextResponse.json({ error: "Button not found" }, { status: 404 });
  }

  await prisma.operatorButton.update({
    where: { id: params.id },
    data: { status: "ACKNOWLEDGED", lastPressedAt: new Date() },
  });

  const body = await request.json().catch(() => ({}));
  await callDownstream(button, body);

  return NextResponse.json({ success: true });
}
