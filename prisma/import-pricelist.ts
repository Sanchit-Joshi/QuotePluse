/**
 * One-time catalog import from the client's Gunnebo pricelist PDF (see
 * docs/decision-log.md ADR-013). Upserts categories, then creates one Item
 * per product: name = the PDF's "Product Description" column, unit = "1"
 * and defaultGstRate = 18% (per client instruction — the PDF itself has no
 * per-product GST rate, it only notes "GST... extra as applicable").
 * Idempotent: skips a product if an item with the same name already
 * exists, so it is safe to re-run.
 *
 * Run with: npx tsx prisma/import-pricelist.ts
 */
import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { GUNNEBO_PRICELIST_2026 } from "./data/gunnebo-pricelist-2026";

const DEFAULT_GST_RATE = 18;
const DEFAULT_UNIT = "1";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  let categoriesCreated = 0;
  let itemsCreated = 0;
  let itemsSkipped = 0;

  for (const { category: categoryName, items } of GUNNEBO_PRICELIST_2026) {
    let category = await prisma.category.findUnique({ where: { name: categoryName } });
    if (!category) {
      category = await prisma.category.create({ data: { name: categoryName } });
      categoriesCreated++;
    }

    for (const item of items) {
      const existing = await prisma.item.findFirst({
        where: { name: item.name, deletedAt: null },
      });
      if (existing) {
        itemsSkipped++;
        continue;
      }

      await prisma.item.create({
        data: {
          name: item.name,
          unit: DEFAULT_UNIT,
          defaultUnitPricePaise: item.priceRupees * 100,
          defaultGstRate: DEFAULT_GST_RATE,
          categoryId: category.id,
        },
      });
      itemsCreated++;
    }
  }

  console.log(
    `Done. Categories created: ${categoriesCreated}. Items created: ${itemsCreated}. Items skipped (already existed): ${itemsSkipped}.`,
  );
  await prisma.$disconnect();
}

main();
