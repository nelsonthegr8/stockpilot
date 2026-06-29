import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generateSkuLabel(skuCode: string, productName: string, variantName: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([108, 108]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: 108, height: 108, color: rgb(1, 1, 1) });

  const productText = productName.length > 16 ? productName.substring(0, 16) + "…" : productName;
  page.drawText(productText, { x: 4, y: 90, size: 7, font: boldFont, color: rgb(0, 0, 0) });

  const variantText = variantName.length > 18 ? variantName.substring(0, 18) + "…" : variantName;
  page.drawText(variantText, { x: 4, y: 80, size: 6, font, color: rgb(0, 0, 0) });

  page.drawText(skuCode, { x: 4, y: 20, size: 7, font: boldFont, color: rgb(0, 0, 0) });

  page.drawText("|||||||||||||||||||||||||||", { x: 4, y: 34, size: 18, font: boldFont, color: rgb(0, 0, 0) });

  return doc.save();
}
