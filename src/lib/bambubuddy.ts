import { PrintJobStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { decrypt } from "./encrypt";

interface VariantPrintConfigData {
  targetModel: string;
  filamentType: string;
  filamentOverrides: unknown;
  archiveId: number;
  plateId: number;
  projectId: number | null;
}

interface AppSettingRecord {
  key: string;
  value: string;
  encrypted: boolean;
}

async function getConfig(): Promise<{ url: string; apiKey: string; enabled: boolean }> {
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["bambubuddy_enabled", "bambubuddy_url", "bambubuddy_api_key"] } },
  });
  const map = Object.fromEntries(settings.map((s: AppSettingRecord) => [s.key, s]));
  const enabled = map["bambubuddy_enabled"]?.value === "true";
  const url = map["bambubuddy_url"]?.value ?? "";
  const rawKey = map["bambubuddy_api_key"];
  const apiKey = rawKey?.encrypted ? decrypt(rawKey.value) : rawKey?.value ?? "";
  return { url, apiKey, enabled };
}

export async function queuePrint(config: VariantPrintConfigData, qty: number): Promise<number> {
  const { url, apiKey } = await getConfig();
  const payload = {
    printer_id: null,
    target_model: config.targetModel,
    target_location: null,
    required_filament_types: [config.filamentType],
    filament_overrides: config.filamentOverrides,
    archive_id: config.archiveId,
    library_file_id: null,
    scheduled_time: null,
    require_previous_success: false,
    auto_off_after: false,
    manual_start: false,
    ams_mapping: null,
    plate_id: config.plateId,
    bed_levelling: true,
    flow_cali: false,
    vibration_cali: true,
    layer_inspect: false,
    timelapse: false,
    use_ams: true,
    gcode_injection: false,
    quantity: qty,
    project_id: config.projectId,
  };
  const res = await fetch(`${url}/api/v1/queue/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`BambuBuddy queue failed: ${res.status}`);
  const data = await res.json();
  return data.id as number;
}

export async function pollQueue(url: string, apiKey: string): Promise<Array<{ id: number; status: string }>> {
  const res = await fetch(`${url}/api/v1/queue/`, { headers: { "X-API-Key": apiKey } });
  if (!res.ok) throw new Error(`BambuBuddy poll failed: ${res.status}`);
  return res.json();
}

export async function testConnection(): Promise<boolean> {
  try {
    const { url, apiKey } = await getConfig();
    const res = await fetch(`${url}/api/v1/queue/`, { headers: { "X-API-Key": apiKey } });
    return res.ok;
  } catch {
    return false;
  }
}

function mapBambuStatus(status: string): PrintJobStatus {
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
      return PrintJobStatus.SENT_TO_BAMBUBUDDY;
  }
}

export async function syncPrintJobStatuses(): Promise<void> {
  const { url, apiKey, enabled } = await getConfig();
  if (!enabled) return;
  const queueItems = await pollQueue(url, apiKey);
  const activeJobs = await prisma.printJob.findMany({
    where: { status: { in: [PrintJobStatus.SENT_TO_BAMBUBUDDY, PrintJobStatus.PRINTING] }, bambuJobId: { not: null } },
  });
  for (const job of activeJobs) {
    const queueItem = queueItems.find((q) => q.id === job.bambuJobId);
    if (!queueItem) continue;
    const newStatus = mapBambuStatus(queueItem.status);
    if (newStatus !== job.status) {
      await prisma.printJob.update({
        where: { id: job.id },
        data: { status: newStatus, completedAt: newStatus === PrintJobStatus.DONE ? new Date() : undefined },
      });
      if (newStatus === PrintJobStatus.DONE) {
        const allJobsDone = await prisma.printJob.count({
          where: { orderId: job.orderId, status: { not: PrintJobStatus.DONE } },
        });
        if (allJobsDone === 0) {
          await prisma.order.update({ where: { id: job.orderId }, data: { status: "READY_TO_SHIP" } });
        }
      }
    }
  }
}
