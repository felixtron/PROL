"use server";

import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

/**
 * Clears the mustResetPassword flag for the current user.
 * Called after the user successfully changed their password via
 * Better Auth's changePassword endpoint.
 */
export async function completePasswordReset() {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { mustResetPassword: false },
  });
  return { success: true };
}
