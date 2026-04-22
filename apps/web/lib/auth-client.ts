import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

/**
 * Sign out helper that works around a Better Auth client bug where
 * `authClient.signOut()` sends an empty POST body, causing the server
 * to throw `SyntaxError: Unexpected end of JSON input`.
 *
 * We call the endpoint directly with an explicit empty JSON body.
 */
export async function signOut(): Promise<void> {
  await fetch("/api/auth/sign-out", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    credentials: "include",
  });
}
