import { defineConfig } from "prisma/config";

// Prisma 7: schema.prisma больше не содержит url — рантайм-соединение задаётся
// адаптером в src/index.ts, а для команд migrate/introspection url берётся отсюда.
export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(process.env.DATABASE_URL
    ? { datasource: { url: process.env.DATABASE_URL } }
    : {}),
});
