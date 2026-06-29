import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  // Seed admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@stockpilot.dev" },
    update: {},
    create: {
      email: "admin@stockpilot.dev",
      name: "Admin User",
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });
  console.log("✓ Admin user created:", admin.email);

  // Seed PRIMARY location
  const location = await prisma.location.upsert({
    where: { id: "primary-location" },
    update: {},
    create: {
      id: "primary-location",
      name: "Main Warehouse",
      type: "PRIMARY",
      address: "123 Warehouse St, Anytown, CA 90210",
      active: true,
    },
  });
  console.log("✓ Location created:", location.name);

  // Seed sample category
  const category = await prisma.category.upsert({
    where: { slug: "sample-category" },
    update: {},
    create: {
      name: "Sample Category",
      slug: "sample-category",
    },
  });
  console.log("✓ Category created:", category.name);

  // Seed 3D Print product + variant + SKU
  const product3d = await prisma.product.upsert({
    where: { id: "sample-3d-print" },
    update: {},
    create: {
      id: "sample-3d-print",
      name: "Sample 3D Print Widget",
      description: "A sample 3D printed widget",
      businessProfileType: "THREE_D_PRINT",
      categoryId: category.id,
      active: true,
    },
  });

  const variant3d = await prisma.productVariant.upsert({
    where: { id: "sample-3d-variant" },
    update: {},
    create: {
      id: "sample-3d-variant",
      productId: product3d.id,
      name: "Standard",
      attributes: { color: "Black", material: "PLA" },
      active: true,
    },
  });

  const sku3d = await prisma.sKU.upsert({
    where: { sku: "3DP-WIDGET-BLK-001" },
    update: {},
    create: {
      variantId: variant3d.id,
      sku: "3DP-WIDGET-BLK-001",
      barcode: "0000000000001",
      weight: 2.5,
      weightUnit: "oz",
      costPrice: 1.50,
      retailPrice: 12.99,
      reorderPoint: 5,
      reorderQty: 20,
      stlFileUrl: "https://example.com/widget.stl",
    },
  });

  await prisma.inventoryLevel.upsert({
    where: { skuId_locationId: { skuId: sku3d.id, locationId: location.id } },
    update: {},
    create: { skuId: sku3d.id, locationId: location.id, qty: 10, reservedQty: 0 },
  });

  console.log("✓ 3D Print product created:", product3d.name);

  // Seed Retail Arbitrage product + variant + SKU
  const productRA = await prisma.product.upsert({
    where: { id: "sample-retail-arb" },
    update: {},
    create: {
      id: "sample-retail-arb",
      name: "Sample Retail Arb Item",
      description: "A sourced retail arbitrage item",
      businessProfileType: "RETAIL_ARBITRAGE",
      categoryId: category.id,
      active: true,
    },
  });

  const variantRA = await prisma.productVariant.upsert({
    where: { id: "sample-ra-variant" },
    update: {},
    create: {
      id: "sample-ra-variant",
      productId: productRA.id,
      name: "Standard",
      attributes: { size: "One Size" },
      active: true,
    },
  });

  const skuRA = await prisma.sKU.upsert({
    where: { sku: "RA-ITEM-001" },
    update: {},
    create: {
      variantId: variantRA.id,
      sku: "RA-ITEM-001",
      barcode: "0000000000002",
      weight: 8.0,
      weightUnit: "oz",
      costPrice: 5.00,
      retailPrice: 19.99,
      reorderPoint: 3,
      reorderQty: 10,
      sourceStore: "Target",
      sourcedDate: new Date("2024-01-15"),
    },
  });

  await prisma.inventoryLevel.upsert({
    where: { skuId_locationId: { skuId: skuRA.id, locationId: location.id } },
    update: {},
    create: { skuId: skuRA.id, locationId: location.id, qty: 5, reservedQty: 0 },
  });

  console.log("✓ Retail Arbitrage product created:", productRA.name);

  // Seed default AppSettings
  const defaultSettings = [
    { key: "bambubuddy_enabled", value: "false", encrypted: false },
    { key: "bambubuddy_url", value: "", encrypted: false },
    { key: "bambubuddy_api_key", value: "", encrypted: true },
    { key: "label_mode", value: "MANUAL", encrypted: false },
    { key: "app_name", value: "StockPilot", encrypted: false },
  ];

  for (const setting of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("✓ App settings seeded");

  console.log("\n✅ Seed complete!");
  console.log("  Admin login: admin@stockpilot.dev / admin123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
