import { db } from "@prol/db";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using the same scrypt parameters Better Auth uses
 * internally. Format: "<saltHex>:<keyHex>" (matches the seed script and
 * Better Auth's credential provider).
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  // scrypt's options live in the optional 4th parameter; promisify keeps
  // the signature, but the type def for the promisified version drops it.
  // Cast to align with the seed.ts hashing config.
  const scryptFn = scryptAsync as unknown as (
    password: string,
    salt: string,
    keylen: number,
    options: Record<string, number>,
  ) => Promise<Buffer>;
  const key = await scryptFn(
    password.normalize("NFKC"),
    salt,
    64,
    { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
  );
  return `${salt}:${key.toString("hex")}`;
}

/**
 * Create a new user with a credential account, WITHOUT going through
 * `auth.api.signUpEmail` — that would set a session cookie on the
 * current request and log the inviting admin out.
 *
 * Used by every admin-driven user creation flow (create user from
 * /tenant-admin, /admin/tenants/[id], bulk import, ...).
 *
 * The user is created with `mustResetPassword=true` and
 * `onboardingCompleted=true` by default; callers can update other
 * fields in a separate db.user.update call after this returns.
 */
export async function createUserWithPassword(input: {
  email: string;
  name: string;
  password: string;
  emailVerified?: boolean;
}) {
  const hashed = await hashPassword(input.password);
  return db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: input.email },
    });
    if (existing) throw new Error("El email ya está registrado");

    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        emailVerified: input.emailVerified ?? false,
      },
    });
    await tx.account.create({
      data: {
        id: `account_${user.id}`,
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashed,
      },
    });
    return user;
  });
}
