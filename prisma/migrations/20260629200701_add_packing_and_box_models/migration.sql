-- CreateEnum
CREATE TYPE "PackingMode" AS ENUM ('GUIDED', 'FREESTYLE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "packingMode" "PackingMode" NOT NULL DEFAULT 'GUIDED',
ADD COLUMN     "packingNotes" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "heightIn" DOUBLE PRECISION,
ADD COLUMN     "lengthIn" DOUBLE PRECISION,
ADD COLUMN     "weightOz" DOUBLE PRECISION,
ADD COLUMN     "widthIn" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "BoxPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lengthIn" DOUBLE PRECISION NOT NULL,
    "widthIn" DOUBLE PRECISION NOT NULL,
    "heightIn" DOUBLE PRECISION NOT NULL,
    "maxWeightOz" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoxPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackSetting" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "boxPresetId" TEXT NOT NULL,
    "qtyPerBox" INTEGER NOT NULL DEFAULT 1,
    "packingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentBox" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "boxPresetId" TEXT,
    "lengthIn" DOUBLE PRECISION,
    "widthIn" DOUBLE PRECISION,
    "heightIn" DOUBLE PRECISION,
    "weightOz" DOUBLE PRECISION,
    "label" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentBox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackSetting_skuId_key" ON "PackSetting"("skuId");

-- AddForeignKey
ALTER TABLE "PackSetting" ADD CONSTRAINT "PackSetting_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackSetting" ADD CONSTRAINT "PackSetting_boxPresetId_fkey" FOREIGN KEY ("boxPresetId") REFERENCES "BoxPreset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentBox" ADD CONSTRAINT "ShipmentBox_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentBox" ADD CONSTRAINT "ShipmentBox_boxPresetId_fkey" FOREIGN KEY ("boxPresetId") REFERENCES "BoxPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
