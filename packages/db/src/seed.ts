// Сид меню: идемпотентен (upsert по slug), выполняется напрямую через pg.
// Использование:
//   node --experimental-strip-types src/seed.ts          — накатить в DATABASE_URL
//   node --experimental-strip-types src/seed.ts --print  — вывести SQL без подключения
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type SeedItem = {
  slug: string;
  name: string;
  description: string;
  priceKzt: number;
  imageUrl: string;
};

type SeedCategory = {
  slug: string;
  name: string;
  emoji?: string;
  items: SeedItem[];
};

type SeedData = { cafeName: string; categories: SeedCategory[] };

const sqlEscape = (value: string): string => `'${value.replace(/'/g, "''")}'`;

export function buildSeedSql(data: SeedData): string {
  const statements: string[] = [];

  data.categories.forEach((category, categoryIndex) => {
    statements.push(
      `INSERT INTO categories (id, name, slug, emoji, "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES (${sqlEscape(`cat-${category.slug}`)}, ${sqlEscape(category.name)}, ${sqlEscape(category.slug)}, ${
        category.emoji ? sqlEscape(category.emoji) : "NULL"
      }, ${categoryIndex}, true, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, emoji = EXCLUDED.emoji, "sortOrder" = EXCLUDED."sortOrder", "updatedAt" = now();`,
    );

    category.items.forEach((item, itemIndex) => {
      statements.push(
        `INSERT INTO menu_items (id, "categoryId", slug, name, description, "imageUrl", "priceTenge", "sortOrder", "isAvailable", "createdAt", "updatedAt")
VALUES (${sqlEscape(`item-${item.slug}`)}, ${sqlEscape(`cat-${category.slug}`)}, ${sqlEscape(item.slug)}, ${sqlEscape(item.name)}, ${sqlEscape(item.description)}, ${sqlEscape(item.imageUrl)}, ${Math.trunc(item.priceKzt)}, ${itemIndex}, true, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  "categoryId" = EXCLUDED."categoryId", name = EXCLUDED.name, description = EXCLUDED.description,
  "imageUrl" = EXCLUDED."imageUrl", "priceTenge" = EXCLUDED."priceTenge", "sortOrder" = EXCLUDED."sortOrder", "updatedAt" = now();`,
      );
    });
  });

  return statements.join("\n\n");
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));
  const data = JSON.parse(readFileSync(join(here, "seed-data.json"), "utf8")) as SeedData;
  const sql = buildSeedSql(data);

  if (process.argv.includes("--print")) {
    console.log(sql);
  } else {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`Seeded: ${data.categories.length} categories, ${data.categories.reduce((n, c) => n + c.items.length, 0)} items`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.end();
    }
  }
}
