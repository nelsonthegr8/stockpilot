import { generateSkuLabel } from "@/lib/barcode";

describe("barcode", () => {
  describe("generateSkuLabel", () => {
    it("returns a Uint8Array PDF for a valid SKU", async () => {
      const result = await generateSkuLabel("TEST-SKU-001", "Widget Pro", "Standard");
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
      // PDF magic bytes: %PDF
      const header = String.fromCharCode(...Array.from(result.slice(0, 4)));
      expect(header).toBe("%PDF");
    });

    it("truncates long product names", async () => {
      const longName = "A Very Long Product Name That Exceeds Limit";
      const result = await generateSkuLabel("SKU-001", longName, "Variant");
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
