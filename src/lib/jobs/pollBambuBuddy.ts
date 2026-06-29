import { Queue, Worker, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { syncPrintJobStatuses } from "../bambubuddy";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null }) as unknown as ConnectionOptions;

export const bambuPollQueue = new Queue("bambu-poll", { connection });

export const bambuPollWorker = new Worker(
  "bambu-poll",
  async () => {
    await syncPrintJobStatuses();
  },
  { connection }
);

export async function startBambuPoller(): Promise<void> {
  await bambuPollQueue.add("poll", {}, { repeat: { every: 60000 }, removeOnComplete: true });
}
