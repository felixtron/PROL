import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export * from "@prisma/client";
export {
  consumeCredits,
  grantCredits,
  refundCredits,
  getCreditsBalance,
  reconcileBalance,
  InsufficientCreditsError,
} from "./credits";
export type { CreditReason, ConsumeCreditsInput, GrantCreditsInput } from "./credits";
export default db;
