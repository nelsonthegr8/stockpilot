import { auth } from "@/lib/auth";
import { testConnection } from "@/lib/bambubuddy";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes((session.user as { role?: string }).role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await testConnection();
  return NextResponse.json({ ok });
}
