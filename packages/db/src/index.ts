import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

// Singleton: в dev Next.js пересоздаёт модули при HMR, в serverless —
// переиспользуется между инвокациями тёплой функции.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { OrderStatus, PaymentMethod } from "./generated/prisma/enums.ts";
export type {
  CategoryModel as Category,
  MenuItemModel as MenuItem,
  OrderModel as Order,
  OrderItemModel as OrderItem,
  FavoriteModel as Favorite,
} from "./generated/prisma/models.ts";
export { Prisma } from "./generated/prisma/client.ts";
