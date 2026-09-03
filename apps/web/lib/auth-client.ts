import { createAuthClient } from "better-auth/react";

// Sin `baseURL` a propósito: el cliente y el servidor de auth viven siempre en
// el mismo origen, y Better Auth usa el del navegador cuando se omite. Antes se
// pasaba `NEXT_PUBLIC_APP_URL`, que este bundle SUSTITUYE en build: funcionaba
// sólo porque en el VPS se construye sin .env y quedaba `undefined`. Con un
// .env presente al construir, la imagen apuntaría el login al dominio de quien
// la compiló — y con dos instancias, una de las dos autenticaría contra la otra.
export const authClient = createAuthClient();

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
