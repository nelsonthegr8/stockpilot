import { Prisma } from "@prisma/client";
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

export async function queuePrint(config: VariantPrintConfigData, qty: number, printJobId?: string): Promise<number> {
  const { url, apiKey } = await getConfig();
  const payload = {
    printer_id: null,
    target_model: config.targetModel,
    target_location: null,
    required_filament_types: [config.filamentType],
    filament_overrides: config.filamentOverrides as Prisma.InputJsonValue,
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

  let responseBody: unknown = null;
  try {
    const res = await fetch(`${url}/api/v1/queue/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(payload),
    });
    responseBody = await res.json().catch(() => ({ status: res.status }));
    if (!res.ok) {
      await prisma.outboundLog.create({
        data: {
          service: "BAMBUBUDDY",
          action: "queue_print",
          status: "error",
          requestBody: { url: `${url}/api/v1/queue/`, payload },
          responseBody: responseBody as object,
          errorMsg: `HTTP ${res.status}`,
          printJobId,
        },
      });
      throw new Error(`BambuBuddy queue failed: ${res.status}`);
    }
    await prisma.outboundLog.create({
      data: {
        service: "BAMBUBUDDY",
        action: "queue_print",
        status: "success",
        requestBody: { url: `${url}/api/v1/queue/`, payload },
        responseBody: responseBody as object,
        printJobId,
      },
    });
    return (responseBody as { id: number }).id;
  } catch (err) {
    // ponytail: only log fetch-level errors here; HTTP errors are already logged above
    if (responseBody === null) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await prisma.outboundLog.create({
        data: {
          service: "BAMBUBUDDY",
          action: "queue_print",
          status: "error",
          requestBody: { url: `${url}/api/v1/queue/`, payload },
          errorMsg,
          printJobId,
        },
      });
    }
    throw err;
  }
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


