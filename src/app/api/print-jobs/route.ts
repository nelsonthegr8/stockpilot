export const dynamic = "force-dynamic";
import { PrintJobStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const jobs = await prisma.printJob.findMany({
    where: status ? { status: status as PrintJobStatus } : {},
    include: {
      order: {
        select: {
          id: true,
          customerName: true,
        },
      },
      sku: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      },
      variantPrintConfig: true,
      printer: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(jobs);
}
