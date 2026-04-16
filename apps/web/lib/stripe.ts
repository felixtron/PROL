import Stripe from "stripe";

const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined;
};

export function getStripe(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe;

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY no está configurada");
  }

  const instance = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });

  globalForStripe.stripe = instance;

  return instance;
}
