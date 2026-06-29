interface ButtonConfig {
  id: string;
  ipAddress: string;
  notifyPath: string;
  notifyMessageTemplate: string;
  downstreamMethod: string;
  downstreamUrlTemplate?: string | null;
  downstreamBodyTemplate?: string | null;
}

function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

export async function notifyButton(button: ButtonConfig, data: Record<string, string>): Promise<boolean> {
  try {
    const message = renderTemplate(button.notifyMessageTemplate, data);
    const res = await fetch(`http://${button.ipAddress}${button.notifyPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: message,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pairButton(button: ButtonConfig, wmsHost: string): Promise<boolean> {
  try {
    const res = await fetch(`http://${button.ipAddress}/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_url: `https://${wmsHost}/api/buttons/${button.id}/pressed`, name: button.id }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function callDownstream(button: ButtonConfig, data: Record<string, string>): Promise<boolean> {
  if (!button.downstreamUrlTemplate) return false;
  try {
    const url = renderTemplate(button.downstreamUrlTemplate, data);
    const body = button.downstreamBodyTemplate ? renderTemplate(button.downstreamBodyTemplate, data) : undefined;
    const res = await fetch(url, {
      method: button.downstreamMethod,
      headers: { "Content-Type": "application/json" },
      body,
    });
    return res.ok;
  } catch {
    return false;
  }
}
