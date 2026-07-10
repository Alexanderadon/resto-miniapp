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

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

// Ленивая инициализация: `next build` импортирует модули роутов при сборке
// страниц (collecting page data) без DATABASE_URL — клиент не должен
// создаваться раньше первого реального обращения к БД в рантайме.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { OrderStatus, PaymentMethod } from "./generated/prisma/enums.ts";
export type {
  CategoryModel as Category,
  MenuItemModel as MenuItem,
  OrderModel as Order,
  OrderItemModel as OrderItem,
  FavoriteModel as Favorite,
} from "./generated/prisma/models.ts";
export { Prisma } from "./generated/prisma/client.ts";
