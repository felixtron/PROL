"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { auth, requireTenantAdmin } from "@/lib/auth";
import {
  isGoogleMeetConfigured,
  fetchGoogleAccountEmail,
} from "@/lib/google-calendar";

/**
 * Conexión de la cuenta de Google del tenant (la que hostea los Meet).
 *
 * El OAuth en sí lo maneja Better Auth (`authClient.linkSocial`) desde el
 * cliente. Estas acciones sólo administran el *puntero*: qué usuario ya
 * vinculado es el anfitrión oficial del tenant.
 *
 * Nota: estas acciones devuelven `{ error }` en vez de lanzar. En producción
 * Next enmascara cualquier excepción de un server action con un mensaje
 * genérico, así que lanzar equivale a que el admin no vea la causa real.
 */

export type GoogleMeetStatus = {
  /** El servidor tiene GOOGLE_CLIENT_ID / SECRET */
  configured: boolean;
  /** El tenant ya designó una cuenta anfitriona */
  connected: boolean;
  /** Correo de la cuenta de Google conectada (informativo) */
  email: string | null;
  /** El admin actual tiene Google vinculado a SU usuario */
  currentUserLinked: boolean;
  /** El anfitrión del tenant es otro usuario distinto al admin actual */
  hostIsAnotherUser: boolean;
};

export async function getGoogleMeetStatus(): Promise<GoogleMeetStatus> {
  const admin = await requireTenantAdmin();
  const configured = isGoogleMeetConfigured();

  if (!admin.tenantId) {
    return {
      configured,
      connected: false,
      email: null,
      currentUserLinked: false,
      hostIsAnotherUser: false,
    };
  }

  const [tenant, ownAccount] = await Promise.all([
    db.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { googleCalendarUserId: true, googleCalendarEmail: true },
    }),
    db.account.findFirst({
      where: { userId: admin.id, providerId: "google" },
      select: { id: true },
    }),
  ]);

  const hostUserId = tenant?.googleCalendarUserId ?? null;

  // Relleno de una sola vez: las conexiones hechas antes de arreglar la
  // lectura del correo quedaron con el campo vacío. En vez de pedirle al
  // admin que reconecte, lo completamos la próxima vez que abra esta
  // pantalla. Es una escritura dentro de una lectura, a propósito y acotada:
  // sólo ocurre si falta el dato y sólo en la página de configuración.
  let email = tenant?.googleCalendarEmail ?? null;
  if (hostUserId && !email) {
    email = await fetchGoogleAccountEmail(hostUserId);
    if (email) {
      await db.tenant.update({
        where: { id: admin.tenantId },
        data: { googleCalendarEmail: email },
      });
    }
  }

  return {
    configured,
    connected: Boolean(hostUserId),
    email,
    currentUserLinked: Boolean(ownAccount),
    hostIsAnotherUser: Boolean(hostUserId && hostUserId !== admin.id),
  };
}

/**
 * Marca la cuenta de Google del admin actual como la anfitriona del tenant.
 * Se invoca al volver del flujo de `linkSocial`.
 */
export async function designateGoogleMeetAccount(): Promise<
  { success: true; email: string | null } | { error: string }
> {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) {
    return { error: "Tu usuario no pertenece a ninguna academia." };
  }
  if (!isGoogleMeetConfigured()) {
    return { error: "La integración con Google no está configurada en el servidor." };
  }

  const account = await db.account.findFirst({
    where: { userId: admin.id, providerId: "google" },
    select: { id: true },
  });
  if (!account) {
    return {
      error:
        "No encontramos una cuenta de Google vinculada a tu usuario. Vuelve a intentar la conexión.",
    };
  }

  // El correo de Google puede diferir del de PROL, así que lo pedimos al
  // proveedor en vez de asumir `admin.email`. Si falla, guardamos igual la
  // conexión: el correo es sólo informativo para la UI.
  const email = await fetchGoogleAccountEmail(admin.id);

  await db.tenant.update({
    where: { id: admin.tenantId },
    data: { googleCalendarUserId: admin.id, googleCalendarEmail: email },
  });

  revalidatePath("/tenant-admin/settings");
  revalidatePath("/professor/workshops/new");
  return { success: true, email };
}

/** Desconecta la cuenta anfitriona del tenant y desvincula Google del admin. */
export async function disconnectGoogleMeetAccount(): Promise<
  { success: true } | { error: string }
> {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) {
    return { error: "Tu usuario no pertenece a ninguna academia." };
  }

  const tenant = await db.tenant.findUnique({
    where: { id: admin.tenantId },
    select: { googleCalendarUserId: true },
  });

  // Sólo desvinculamos la cuenta OAuth si el anfitrión es este mismo admin;
  // si es otro usuario nos limitamos a soltar el puntero del tenant para no
  // tocar la cuenta personal de alguien más.
  if (tenant?.googleCalendarUserId === admin.id) {
    const account = await db.account.findFirst({
      where: { userId: admin.id, providerId: "google" },
      select: { accountId: true },
    });
    if (account) {
      try {
        await auth.api.unlinkAccount({
          body: { providerId: "google", accountId: account.accountId },
          headers: await headers(),
        });
      } catch (e) {
        // Si Better Auth se niega (p. ej. es el único método de acceso),
        // igual soltamos el puntero: dejar de usar la cuenta es lo que pidió.
        console.error("[google-integration] unlinkAccount falló", e);
      }
    }
  }

  await db.tenant.update({
    where: { id: admin.tenantId },
    data: { googleCalendarUserId: null, googleCalendarEmail: null },
  });

  revalidatePath("/tenant-admin/settings");
  revalidatePath("/professor/workshops/new");
  return { success: true };
}
