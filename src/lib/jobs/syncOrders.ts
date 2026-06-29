import { Queue, Worker, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "../prisma";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null }) as unknown as ConnectionOptions;

export const syncOrdersQueue = new Queue("sync-orders", { connection });

export const syncOrdersWorker = new Worker(
  "sync-orders",
  async () => {
    const channels = await prisma.salesChannel.findMany({ where: { active: true } });
    for (const channel of channels) {
      await prisma.salesChannel.update({ where: { id: channel.id }, data: { lastSyncAt: new Date() } });
    }
  },
  { connection }
);

export async function startOrderSync(): Promise<void> {
  await syncOrdersQueue.add("sync", {}, { repeat: { every: 300000 }, removeOnComplete: true });
}
