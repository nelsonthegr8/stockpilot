export const dynamic = "force-dynamic";
import { PrintJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function mapStatus(status: string): PrintJobStatus {
  switch (status) {
    case "pending":
      return PrintJobStatus.SENT_TO_BAMBUBUDDY;
    case "printing":
      return PrintJobStatus.PRINTING;
    case "completed":
      return PrintJobStatus.DONE;
    case "failed":
      return PrintJobStatus.FAILED;
    default:
      return PrintJobStatus.PRINTING;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { job_id, status } = body as { job_id: number; status: string };

  const job = await prisma.printJob.findFirst({
    where: { bambuJobId: job_id },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const newStatus = mapStatus(status);
  await prisma.printJob.update({
    where: { id: job.id },
    data: {
      status: newStatus,
      completedAt: newStatus === PrintJobStatus.DONE ? new Date() : undefined,
    },
  });

  if (newStatus === PrintJobStatus.DONE) {
    const remaining = await prisma.printJob.count({
      where: {
        orderId: job.orderId,
        status: { not: PrintJobStatus.DONE },
      },
    });

    if (remaining === 0) {
      await prisma.order.update({
        where: { id: job.orderId },
        data: { status: "READY_TO_SHIP" },
      });
    }
  }

  return NextResponse.json({ success: true });
}
