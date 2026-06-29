import { Shippo } from "shippo";

function getClient() {
  const apiKey = process.env.SHIPPO_API_KEY;
  if (!apiKey) throw new Error("SHIPPO_API_KEY not set");
  return new Shippo({ apiKeyHeader: apiKey });
}

export interface ShipmentInput {
  addressFrom: { name: string; street1: string; city: string; state: string; zip: string; country: string };
  addressTo: { name: string; street1: string; city: string; state: string; zip: string; country: string };
  parcels: Array<{ length: string; width: string; height: string; distanceUnit: string; weight: string; massUnit: string }>;
}

export async function getRates(shipment: ShipmentInput) {
  const client = getClient();
  return client.shipments.create({ ...shipment, async: false } as Parameters<typeof client.shipments.create>[0]);
}

export async function createLabel(rateId: string) {
  const client = getClient();
  return client.transactions.create({ rate: rateId, labelFileType: "PDF", async: false });
}

export async function voidLabel(transactionId: string) {
  const client = getClient();
  return client.transactions.create({ rate: transactionId } as Parameters<typeof client.transactions.create>[0]);
}
