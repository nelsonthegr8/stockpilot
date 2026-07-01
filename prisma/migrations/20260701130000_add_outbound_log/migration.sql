-- CreateTable
CREATE TABLE "OutboundLog" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestBody" JSONB NOT NULL,
    "responseBody" JSONB,
    "errorMsg" TEXT,
    "printJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OutboundLog" ADD CONSTRAINT "OutboundLog_printJobId_fkey" FOREIGN KEY ("printJobId") REFERENCES "PrintJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
