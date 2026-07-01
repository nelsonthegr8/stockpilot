import { BusinessProfileType, OrderStatus, PrintJobStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { queuePrint } from "./bambubuddy";

export async function routeOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { include: { sku: { include: { variant: { include: { product: true } }, variantPrintConfigs: true } } } },
    },
  });

  let allItemsReady = true;
  // ponytail: read once per routeOrder call rather than per print job
  const bambuEnabled = (await prisma.appSetting.findFirst({ where: { key: "bambubuddy_enabled" } }))?.value === "true";

  for (const item of order.items) {
    const product = item.sku.variant.product;
    if (product.businessProfileType === BusinessProfileType.THREE_D_PRINT) {
      const levels = await prisma.inventoryLevel.findMany({
        where: { skuId: item.skuId },
      });
      const available = levels.reduce((sum: number, l: { qty: number; reservedQty: number }) => sum + l.qty - l.reservedQty, 0);
      if (available >= item.qty) {
        let remaining = item.qty;
        for (const level of levels) {
          if (remaining <= 0) break;
          const canReserve = Math.min(level.qty - level.reservedQty, remaining);
          if (canReserve > 0) {
            await prisma.inventoryLevel.update({
              where: { id: level.id },
              data: { reservedQty: { increment: canReserve } },
            });
            remaining -= canReserve;
          }
        }
        await prisma.orderItem.update({ where: { id: item.id }, data: { stockReserved: true } });
      } else {
        allItemsReady = false;
        const configs = item.sku.variantPrintConfigs;
        if (configs.length > 0) {
          for (const config of configs) {
            const job = await prisma.printJob.create({
              data: {
                orderId: order.id,
                orderItemId: item.id,
                skuId: item.skuId,
                variantPrintConfigId: config.id,
                status: PrintJobStatus.QUEUED,
              },
            });
            if (bambuEnabled) {
              try {
                const bambuJobId = await queuePrint(
                  {
                    targetModel: config.targetModel,
                    filamentType: config.filamentType,
                    filamentOverrides: config.filamentOverrides,
                    archiveId: config.archiveId,
                    plateId: config.plateId,
                    projectId: config.projectId ?? null,
                  },
                  item.qty,
                  job.id,
                );
                await prisma.printJob.update({
                  where: { id: job.id },
                  data: { status: PrintJobStatus.SENT_TO_BAMBUBUDDY, bambuJobId },
                });
              } catch {
                // queuePrint already logged the error to OutboundLog — leave status as QUEUED
              }
            }
          }
        } else {
          await prisma.printJob.create({
            data: {
              orderId: order.id,
              orderItemId: item.id,
              skuId: item.skuId,
              status: PrintJobStatus.QUEUED,
            },
          });
        }
      }
    } else {
      const levels = await prisma.inventoryLevel.findMany({ where: { skuId: item.skuId } });
      const available = levels.reduce((sum: number, l: { qty: number; reservedQty: number }) => sum + l.qty - l.reservedQty, 0);
      if (available >= item.qty) {
        let remaining = item.qty;
        for (const level of levels) {
          if (remaining <= 0) break;
          const canReserve = Math.min(level.qty - level.reservedQty, remaining);
          if (canReserve > 0) {
            await prisma.inventoryLevel.update({ where: { id: level.id }, data: { reservedQty: { increment: canReserve } } });
            remaining -= canReserve;
          }
        }
        await prisma.orderItem.update({ where: { id: item.id }, data: { stockReserved: true } });
      } else {
        allItemsReady = false;
      }
    }
  }

  const newStatus = allItemsReady ? OrderStatus.AWAITING_FULFILLMENT : OrderStatus.IN_PRODUCTION;
  await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });
}

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["AWAITING_FULFILLMENT", "IN_PRODUCTION", "CANCELLED"],
  AWAITING_FULFILLMENT: ["READY_TO_SHIP", "CANCELLED"],
  IN_PRODUCTION: ["AWAITING_FULFILLMENT", "CANCELLED"],
  READY_TO_SHIP: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: ["PENDING"],
  REFUNDED: [],
};

export function canTransition(from: string, to: string): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
