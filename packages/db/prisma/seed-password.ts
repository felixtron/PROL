import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using the same scrypt config as Better Auth.
 *
 * Vive en su propio módulo porque tanto `seed.ts` como `seed-documents.ts`
 * necesitan crear cuentas de credenciales que funcionen contra el login real
 * de Better Auth. La configuración de scrypt tiene que coincidir exactamente
 * (`N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2`); dos copias del
 * mismo hash divergirían con el tiempo y el login por API dejaría de
 * verificar nada.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(
    password.normalize("NFKC"),
    salt,
    64,
    { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 }
  )) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
