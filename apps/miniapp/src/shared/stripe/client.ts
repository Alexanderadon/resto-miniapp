// Ленивый singleton Stripe SDK — серверный модуль, клиентам не импортировать.
// Ключ читается при первом обращении: сборка проходит без env.
import Stripe from "stripe";

let cached: Stripe | undefined;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  cached = new Stripe(key);
  return cached;
}
