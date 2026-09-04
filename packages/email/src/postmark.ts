/**
 * Proveedor de envío: Postmark, por API REST directa.
 *
 * Sin SDK a propósito. La superficie que se usa aquí son dos endpoints y una
 * cabecera; un paquete más en el bundle sólo añadiría versiones que mantener y
 * un cliente que envuelve el mismo `fetch` que ya trae Node.
 *
 * La diferencia importante frente a Resend no es el transporte: Postmark
 * responde con un `ErrorCode` POR MENSAJE en los envíos por lote. Eso permite
 * decir *qué* destinatario falló, en vez de contar cuántos se aceptaron y
 * confiar. Con barridos de cumplimiento a empresas enteras, esa diferencia es
 * la que separa "se entregó" de "creímos que se entregó".
 */

const API = "https://api.postmarkapp.com";

export interface PostmarkMessage {
  From: string;
  To: string;
  Subject: string;
  HtmlBody: string;
  TextBody?: string;
  ReplyTo?: string;
  MessageStream: string;
}

export interface PostmarkResult {
  To: string;
  ErrorCode: number;
  Message: string;
  MessageID?: string;
}

export function postmarkToken(): string | undefined {
  return process.env.POSTMARK_SERVER_TOKEN || undefined;
}

/**
 * Stream de Postmark. `outbound` es el transaccional que viene por defecto en
 * toda cuenta; los avisos masivos deberían ir por un stream de tipo broadcast,
 * porque mezclarlos con el transaccional arrastra la reputación de lo que de
 * verdad no puede fallar: los correos de recuperación de contraseña.
 */
function stream(): string {
  return process.env.POSTMARK_MESSAGE_STREAM || "outbound";
}

async function post(path: string, body: unknown): Promise<Response> {
  const token = postmarkToken();
  if (!token) throw new Error("POSTMARK_SERVER_TOKEN no está configurada");
  return fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify(body),
  });
}

export function buildMessage(
  m: Omit<PostmarkMessage, "MessageStream"> & { MessageStream?: string },
): PostmarkMessage {
  return { ...m, MessageStream: m.MessageStream ?? stream() };
}

/** Un solo mensaje. Lanza si Postmark lo rechaza; quien llama decide qué hacer. */
export async function postmarkSend(msg: PostmarkMessage): Promise<PostmarkResult> {
  const res = await post("/email", msg);
  const data = (await res.json()) as PostmarkResult;
  if (!res.ok || data.ErrorCode !== 0) {
    throw new Error(
      `Postmark rechazó el envío a ${msg.To}: ${data.ErrorCode} ${data.Message}`,
    );
  }
  return data;
}

/**
 * Lote. Postmark admite hasta 500 mensajes por llamada; se trocea porque los
 * barridos de cumplimiento pueden superarlo y un 422 dejaría sin aviso a toda
 * la empresa.
 */
export async function postmarkSendBatch(
  messages: PostmarkMessage[],
): Promise<PostmarkResult[]> {
  const LIMIT = 500;
  const out: PostmarkResult[] = [];
  for (let i = 0; i < messages.length; i += LIMIT) {
    const chunk = messages.slice(i, i + LIMIT);
    const res = await post("/email/batch", chunk);
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Postmark rechazó un lote (${res.status}): ${detail}`);
    }
    out.push(...((await res.json()) as PostmarkResult[]));
  }
  return out;
}
