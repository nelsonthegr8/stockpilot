import { canTransition, ORDER_STATUS_TRANSITIONS } from "@/lib/orderRouting";

describe("orderRouting", () => {
  describe("canTransition", () => {
    it("allows valid transitions", () => {
      expect(canTransition("PENDING", "AWAITING_FULFILLMENT")).toBe(true);
      expect(canTransition("PENDING", "IN_PRODUCTION")).toBe(true);
      expect(canTransition("PENDING", "CANCELLED")).toBe(true);
      expect(canTransition("AWAITING_FULFILLMENT", "READY_TO_SHIP")).toBe(true);
      expect(canTransition("READY_TO_SHIP", "SHIPPED")).toBe(true);
      expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(canTransition("PENDING", "SHIPPED")).toBe(false);
      expect(canTransition("DELIVERED", "PENDING")).toBe(false);
      expect(canTransition("CANCELLED", "SHIPPED")).toBe(false);
      expect(canTransition("REFUNDED", "PENDING")).toBe(false);
    });

    it("returns false for unknown status", () => {
      expect(canTransition("UNKNOWN", "PENDING")).toBe(false);
    });
  });

  describe("ORDER_STATUS_TRANSITIONS", () => {
    it("defines transitions for all statuses", () => {
      const expectedStatuses = [
        "PENDING",
        "AWAITING_FULFILLMENT",
        "IN_PRODUCTION",
        "READY_TO_SHIP",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
      ];
      for (const status of expectedStatuses) {
        expect(ORDER_STATUS_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(ORDER_STATUS_TRANSITIONS[status])).toBe(true);
      }
    });

    it("DELIVERED has no further transitions", () => {
      expect(ORDER_STATUS_TRANSITIONS["DELIVERED"]).toHaveLength(0);
    });

    it("REFUNDED has no further transitions", () => {
      expect(ORDER_STATUS_TRANSITIONS["REFUNDED"]).toHaveLength(0);
    });
  });
});
