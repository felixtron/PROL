// ---------------------------------------------------------------------------
// PROL - Email Templates (Spanish)
// All templates return { subject, html } with inline styles.
//
// Paleta: neutra sobre azul marino, blanco y negro. Nada de acentos
// saturados: los correos del sistema son documentos formales (comprobantes,
// certificados, convocatorias), no piezas de marketing. Un solo azul de
// marca para cabecera y botones, un azul algo más claro para enlaces sobre
// blanco (contraste AA), y grises neutros para el texto.
//
// Los colores viven en `C` en vez de repetirse en cada plantilla: cambiar el
// tono aquí lo cambia en todos los correos.
// ---------------------------------------------------------------------------

const C = {
  /** Azul marino de marca: cabecera y botones. */
  brand: "#1E3A8A",
  /** Azul de enlace sobre fondo blanco. */
  brandLink: "#1D4ED8",
  /** Texto sobre el azul de marca. */
  onBrand: "#FFFFFF",
  /** Títulos / texto principal (casi negro). */
  ink: "#111827",
  /** Texto de párrafo. */
  body: "#374151",
  /** Texto secundario y etiquetas. */
  muted: "#6B7280",
  /** Bordes y separadores. */
  border: "#E5E7EB",
  /** Fondo de la tarjeta. */
  surface: "#FFFFFF",
  /** Fondo de bloques destacados dentro de la tarjeta. */
  surfaceAlt: "#F9FAFB",
  /** Fondo de la página del correo. */
  canvas: "#F3F4F6",
  // El resto de la paleta es neutra a propósito. Este amarillo es la única
  // excepción y existe para una nota que el alumno no puede pasar por alto:
  // si su nombre está mal cuando se emite el diploma, ya no hay arreglo.
  /** Fondo de la nota resaltada. */
  noteBg: "#FEF9C3",
  /** Filo izquierdo de la nota resaltada. */
  noteBorder: "#EAB308",
  /** Texto sobre la nota resaltada. */
  noteInk: "#713F12",
} as const;

function baseLayout(tenantName: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${tenantName}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.canvas};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${C.surface};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:${C.brand};padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:${C.onBrand};font-size:24px;font-weight:700;letter-spacing:-0.5px;">${tenantName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:${C.surfaceAlt};text-align:center;border-top:1px solid ${C.border};">
              <p style="margin:0;color:${C.muted};font-size:13px;line-height:1.5;">
                Enviado por ${tenantName} v&iacute;a <span style="color:${C.brand};font-weight:600;">PROL</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="border-radius:8px;background-color:${C.brand};">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;color:${C.onBrand};font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`;
}

/**
 * Bloque resaltado en amarillo.
 *
 * Va en <table> con el atributo `bgcolor` ademas del style: Outlook de
 * escritorio ignora `background-color` en <div>, y sin el atributo la nota
 * llegaria sin resaltar justo a los destinatarios corporativos.
 */
function highlightNote(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
  <tr>
    <td bgcolor="${C.noteBg}" style="background-color:${C.noteBg};border-left:4px solid ${C.noteBorder};padding:14px 16px;border-radius:6px;">
      <p style="margin:0;color:${C.noteInk};font-size:15px;line-height:1.6;">${html}</p>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface WelcomeEmailParams {
  name: string;
  tenantName: string;
  loginUrl: string;
}

export function welcomeEmail({ name, tenantName, loginUrl }: WelcomeEmailParams) {
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      &iexcl;Hola ${name}!
    </h2>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Te damos la bienvenida a <strong>${tenantName}</strong>. Tu cuenta ha sido creada exitosamente y ya puedes acceder a la plataforma.
    </p>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Explora los cursos disponibles, inscr&iacute;bete y comienza a aprender hoy mismo.
    </p>
    ${ctaButton("Iniciar sesi\u00f3n", loginUrl)}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      Si no creaste esta cuenta, puedes ignorar este correo.
    </p>`;

  return {
    subject: `\u00a1Bienvenido a ${tenantName}!`,
    html: baseLayout(tenantName, body),
  };
}

export interface EnrollmentConfirmationParams {
  name: string;
  courseName: string;
  courseUrl: string;
  tenantName: string;
}

export function enrollmentConfirmation({
  name,
  courseName,
  courseUrl,
  tenantName,
}: EnrollmentConfirmationParams) {
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      Inscripci&oacute;n confirmada
    </h2>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Hola ${name}, tu inscripci&oacute;n al curso <strong>${courseName}</strong> ha sido confirmada.
    </p>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Ya puedes acceder al contenido del curso y comenzar tu aprendizaje.
    </p>
    ${highlightNote(
      `<strong>Nota:</strong> Debes asegurarte que TU NOMBRE en el PERFIL de nuestra plataforma est&aacute; COMPLETO y es CORRECTO ya que, as&iacute; se imprimir&aacute; en los DIPLOMAS de los cursos en los que est&eacute;s inscrito(a); y tales diplomas NO PUEDEN MODIFICARSE despu&eacute;s de su emisi&oacute;n.`
    )}
    ${ctaButton("Acceder al curso", courseUrl)}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      &iexcl;Mucho &eacute;xito en tu aprendizaje!
    </p>`;

  return {
    subject: `Inscripci\u00f3n confirmada: ${courseName}`,
    html: baseLayout(tenantName, body),
  };
}

export interface PaymentConfirmationParams {
  name: string;
  courseName: string;
  amount: string;
  currency: string;
  courseUrl: string;
  tenantName: string;
}

export function paymentConfirmation({
  name,
  courseName,
  amount,
  currency,
  courseUrl,
  tenantName,
}: PaymentConfirmationParams) {
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      Comprobante de pago
    </h2>
    <p style="margin:0 0 16px;color:${C.body};font-size:16px;line-height:1.6;">
      Hola ${name}, hemos recibido tu pago correctamente. A continuaci&oacute;n los detalles:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;border:1px solid ${C.border};border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:12px 16px;background-color:${C.surfaceAlt};color:${C.muted};font-size:14px;font-weight:600;border-bottom:1px solid ${C.border};">Curso</td>
        <td style="padding:12px 16px;background-color:${C.surfaceAlt};color:${C.ink};font-size:14px;border-bottom:1px solid ${C.border};">${courseName}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:${C.muted};font-size:14px;font-weight:600;">Monto</td>
        <td style="padding:12px 16px;color:${C.ink};font-size:14px;font-weight:700;">${amount} ${currency}</td>
      </tr>
    </table>
    ${ctaButton("Acceder al curso", courseUrl)}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      Si tienes alguna duda sobre este cargo, responde a este correo.
    </p>`;

  return {
    subject: `Comprobante de pago: ${courseName}`,
    html: baseLayout(tenantName, body),
  };
}

export interface CoursePublishedParams {
  professorName: string;
  courseName: string;
  courseUrl: string;
  tenantName: string;
}

export function coursePublished({
  professorName,
  courseName,
  courseUrl,
  tenantName,
}: CoursePublishedParams) {
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      &iexcl;Tu curso est&aacute; en l&iacute;nea!
    </h2>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Hola ${professorName}, nos complace informarte que tu curso <strong>${courseName}</strong> ha sido publicado exitosamente en la plataforma.
    </p>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Los estudiantes ya pueden encontrarlo e inscribirse. Puedes ver c&oacute;mo luce tu curso con el siguiente enlace:
    </p>
    ${ctaButton("Ver mi curso", courseUrl)}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      &iexcl;Felicidades y mucho &eacute;xito!
    </p>`;

  return {
    subject: `Tu curso ha sido publicado: ${courseName}`,
    html: baseLayout(tenantName, body),
  };
}

export interface CertificateIssuedParams {
  name: string;
  courseName: string;
  certificateUrl: string;
  tenantName: string;
}

export function certificateIssued({
  name,
  courseName,
  certificateUrl,
  tenantName,
}: CertificateIssuedParams) {
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      &iexcl;Felicidades, ${name}! 🎓
    </h2>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Has completado exitosamente el curso <strong>${courseName}</strong> y tu certificado est&aacute; listo.
    </p>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Puedes descargar tu certificado o compartirlo directamente desde el enlace a continuaci&oacute;n.
    </p>
    ${ctaButton("Descargar certificado", certificateUrl)}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      &iexcl;Sigue aprendiendo y alcanzando tus metas!
    </p>`;

  return {
    subject: `\u00a1Certificado obtenido! - ${courseName}`,
    html: baseLayout(tenantName, body),
  };
}

// ---------------------------------------------------------------------------
// Company invitation
// ---------------------------------------------------------------------------

export interface CompanyInvitationParams {
  companyName: string;
  inviterName: string;
  acceptUrl: string;
  expiresInDays: number;
}

export function companyInvitationEmail({
  companyName,
  inviterName,
  acceptUrl,
  expiresInDays,
}: CompanyInvitationParams) {
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      Te invitaron a unirte a ${companyName}
    </h2>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      <strong>${inviterName}</strong> te invit&oacute; a unirte a su equipo en
      <strong>${companyName}</strong> dentro de la plataforma.
    </p>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Al aceptar, podr&aacute;s acceder a los cursos asignados a tu empresa
      sin costo adicional.
    </p>
    ${ctaButton("Aceptar invitación", acceptUrl)}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      Esta invitaci&oacute;n expira en ${expiresInDays} d&iacute;as. Si no esperabas
      este correo, puedes ignorarlo.
    </p>`;

  return {
    subject: `Invitación para unirte a ${companyName}`,
    html: baseLayout(companyName, body),
  };
}

// ---------------------------------------------------------------------------
// Consultoría Online — invitación y reprogramación
// ---------------------------------------------------------------------------

interface AdvisorySessionEmailParams {
  tenantName: string;
  /** Título de la sesión */
  title: string;
  description?: string | null;
  advisorName: string;
  /** Ya formateada en español, ej. "lunes 18 de agosto de 2026, 10:00" */
  whenLabel: string;
  /** Presencial / Virtual / Híbrida */
  modalityLabel: string;
  meetingUrl?: string | null;
  locationLabel?: string | null;
  /** Número de sesiones si es una serie recurrente (1 = sesión única) */
  sessionCount?: number;
  /** Enlace al panel del cliente */
  panelUrl: string;
}

/** Bloque compartido con los datos de la cita. */
function sessionDetails(p: AdvisorySessionEmailParams): string {
  const rows: string[] = [
    `<tr><td style="padding:6px 0;color:${C.muted};font-size:14px;width:110px;">Cu&aacute;ndo</td><td style="padding:6px 0;color:${C.ink};font-size:14px;font-weight:600;">${p.whenLabel}</td></tr>`,
    `<tr><td style="padding:6px 0;color:${C.muted};font-size:14px;">Modalidad</td><td style="padding:6px 0;color:${C.ink};font-size:14px;">${p.modalityLabel}</td></tr>`,
    `<tr><td style="padding:6px 0;color:${C.muted};font-size:14px;">Asesor</td><td style="padding:6px 0;color:${C.ink};font-size:14px;">${p.advisorName}</td></tr>`,
  ];
  if (p.locationLabel) {
    rows.push(
      `<tr><td style="padding:6px 0;color:${C.muted};font-size:14px;">Lugar</td><td style="padding:6px 0;color:${C.ink};font-size:14px;">${p.locationLabel}</td></tr>`,
    );
  }
  if (p.sessionCount && p.sessionCount > 1) {
    rows.push(
      `<tr><td style="padding:6px 0;color:${C.muted};font-size:14px;">Serie</td><td style="padding:6px 0;color:${C.ink};font-size:14px;">${p.sessionCount} sesiones programadas</td></tr>`,
    );
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-top:1px solid ${C.border};border-bottom:1px solid ${C.border};padding:8px 0;">${rows.join("")}</table>`;
}

/**
 * La invitación va a las personas convocadas, que no siempre son todas las que
 * asistirán: el contacto de la empresa suele reenviarla a su equipo. La nota lo
 * dice explícitamente para que no den por hecho que el enlace es personal.
 */
const forwardNote = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;background-color:${C.surfaceAlt};border-left:3px solid ${C.brand};border-radius:0 6px 6px 0;">
  <tr>
    <td style="padding:12px 16px;color:${C.body};font-size:14px;line-height:1.5;">
      Puedes enviar este correo a los dem&aacute;s participantes de tu empresa.
    </td>
  </tr>
</table>`;

export function advisorySessionInvitation(p: AdvisorySessionEmailParams) {
  const intro =
    p.sessionCount && p.sessionCount > 1
      ? `Se program&oacute; una serie de sesiones de consultor&iacute;a para ti. La primera es:`
      : `Se program&oacute; una sesi&oacute;n de consultor&iacute;a para ti.`;

  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      ${p.title}
    </h2>
    <p style="margin:0 0 16px;color:${C.body};font-size:16px;line-height:1.6;">
      ${intro}
    </p>
    ${sessionDetails(p)}
    ${
      p.description
        ? `<p style="margin:0 0 24px;color:${C.body};font-size:15px;line-height:1.6;">${p.description}</p>`
        : ""
    }
    ${
      p.meetingUrl
        ? ctaButton("Entrar a la reunión", p.meetingUrl)
        : ctaButton("Ver en mi panel", p.panelUrl)
    }
    ${forwardNote}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      ${
        p.meetingUrl
          ? `Tambi&eacute;n puedes consultarla en tu panel: <a href="${p.panelUrl}" style="color:${C.brandLink};">${p.panelUrl}</a>`
          : `Si tienes dudas sobre la cita, responde a este correo.`
      }
    </p>`;

  return {
    subject: `Nueva sesión de consultoría: ${p.title}`,
    html: baseLayout(p.tenantName, body),
  };
}

export function advisorySessionRescheduled(
  p: AdvisorySessionEmailParams & { previousWhenLabel: string },
) {
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      Cambio de horario: ${p.title}
    </h2>
    <p style="margin:0 0 16px;color:${C.body};font-size:16px;line-height:1.6;">
      La sesi&oacute;n que estaba programada para
      <span style="text-decoration:line-through;color:${C.muted};">${p.previousWhenLabel}</span>
      se movi&oacute;. Estos son los datos actualizados:
    </p>
    ${sessionDetails(p)}
    ${
      p.meetingUrl
        ? ctaButton("Entrar a la reunión", p.meetingUrl)
        : ctaButton("Ver en mi panel", p.panelUrl)
    }
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      El enlace de la reuni&oacute;n no cambia; sigue siendo v&aacute;lido con el
      nuevo horario.
    </p>`;

  return {
    subject: `Cambio de horario: ${p.title}`,
    html: baseLayout(p.tenantName, body),
  };
}

// ---------------------------------------------------------------------------
// Cuenta y acceso
// ---------------------------------------------------------------------------

/**
 * Estos dos correos vivían como HTML suelto en `apps/web` (auth.ts y
 * tenant-users.ts) y se quedaban fuera de cualquier cambio de estilo. Al
 * moverlos aquí comparten `baseLayout`, o sea la misma paleta que el resto.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface PasswordResetParams {
  name?: string | null;
  resetUrl: string;
  tenantName?: string;
  /** Vigencia del enlace, en horas. */
  expiresInHours?: number;
}

export function passwordResetEmail({
  name,
  resetUrl,
  tenantName = "PROL",
  expiresInHours = 1,
}: PasswordResetParams) {
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,";
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      Restablece tu contrase&ntilde;a
    </h2>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      ${greeting} recibimos una solicitud para restablecer la contrase&ntilde;a de tu cuenta.
    </p>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Usa el siguiente bot&oacute;n para crear una nueva contrase&ntilde;a.
    </p>
    ${ctaButton("Restablecer contraseña", resetUrl)}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      El enlace expira en ${expiresInHours === 1 ? "1 hora" : `${expiresInHours} horas`}.
      Si no solicitaste este cambio, puedes ignorar este correo: tu contrase&ntilde;a
      actual seguir&aacute; siendo v&aacute;lida.
    </p>`;

  return {
    subject: `Restablecer tu contraseña — ${tenantName}`,
    html: baseLayout(tenantName, body),
  };
}

export interface AccountCreatedParams {
  name: string;
  email: string;
  tempPassword: string;
  tenantName: string;
  loginUrl: string;
}

export function accountCreatedEmail({
  name,
  email,
  tempPassword,
  tenantName,
  loginUrl,
}: AccountCreatedParams) {
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      Bienvenido a ${escapeHtml(tenantName)}
    </h2>
    <p style="margin:0 0 16px;color:${C.body};font-size:16px;line-height:1.6;">
      Hola <strong>${escapeHtml(name)}</strong>, se cre&oacute; una cuenta para ti en
      la plataforma. Estas son tus credenciales de acceso:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border:1px solid ${C.border};border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:12px 16px;background-color:${C.surfaceAlt};color:${C.muted};font-size:14px;font-weight:600;border-bottom:1px solid ${C.border};width:150px;">Correo</td>
        <td style="padding:12px 16px;background-color:${C.surfaceAlt};color:${C.ink};font-size:14px;border-bottom:1px solid ${C.border};">${escapeHtml(email)}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:${C.muted};font-size:14px;font-weight:600;">Contrase&ntilde;a temporal</td>
        <td style="padding:12px 16px;color:${C.ink};font-size:14px;">
          <code style="background-color:${C.border};padding:2px 6px;border-radius:4px;font-size:14px;">${escapeHtml(tempPassword)}</code>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:${C.body};font-size:16px;line-height:1.6;">
      Por seguridad, tendr&aacute;s que cambiar la contrase&ntilde;a al iniciar sesi&oacute;n
      por primera vez.
    </p>
    ${ctaButton("Iniciar sesión", loginUrl)}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      No compartas estas credenciales con nadie.
    </p>`;

  return {
    subject: `Bienvenido a ${tenantName}`,
    html: baseLayout(tenantName, body),
  };
}

// ---------------------------------------------------------------------------
// Encuestas de satisfacción
//
// El enlace que va en estos correos es personal e irrepetible: identifica al
// destinatario y sólo sirve para responder ese lanzamiento. Por eso el pie
// pide no reenviarlo — quien lo reciba respondería en nombre de otro.
//
// El cuerpo del mensaje sale de la DESCRIPCIÓN de la encuesta, no de aquí.
// PROL es multi-tenant: un texto con el nombre de una consultora escrito en
// la plantilla acabaría en los correos de las demás academias. Cada tenant
// redacta el suyo al crear la encuesta y estas plantillas sólo aportan el
// marco (saludo, botón, vencimiento y el aviso de que el enlace es personal).
// ---------------------------------------------------------------------------

export interface SurveyInvitationParams {
  tenantName: string;
  recipientName?: string | null;
  surveyTitle: string;
  description?: string | null;
  answerUrl: string;
  /** "12 de septiembre de 2026" */
  closesAtLabel: string;
  estimatedMinutes?: number | null;
}

export function surveyInvitationEmail({
  tenantName,
  recipientName,
  surveyTitle,
  description,
  answerUrl,
  closesAtLabel,
  estimatedMinutes,
}: SurveyInvitationParams) {
  const greeting = recipientName?.trim()
    ? `Hola ${escapeHtml(recipientName.trim())},`
    : "Hola,";
  // Si la encuesta no trae descripción se usa un texto neutro: sin nombre de
  // consultora, para que sirva a cualquier tenant.
  const intro =
    description?.trim() ||
    `Nos gustar\u00eda conocer tu opini\u00f3n${
      estimatedMinutes ? `. Responder te tomar\u00e1 unos ${estimatedMinutes} minutos` : ""
    }.`;
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      ${escapeHtml(surveyTitle)}
    </h2>
    <p style="margin:0 0 12px;color:${C.body};font-size:16px;line-height:1.6;">
      ${greeting}
    </p>
    <p style="margin:0 0 16px;color:${C.body};font-size:16px;line-height:1.6;">
      ${escapeHtml(intro)}
    </p>
    ${ctaButton("Responder la encuesta", answerUrl)}
    <p style="margin:0 0 8px;color:${C.body};font-size:15px;line-height:1.6;">
      Puedes responder hasta el <strong>${escapeHtml(closesAtLabel)}</strong>. Despu&eacute;s
      de esa fecha el enlace deja de aceptar respuestas.
    </p>
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      Este enlace es personal: no lo reenv&iacute;es.
    </p>`;

  return {
    subject: `${surveyTitle} — tu opinión`,
    html: baseLayout(tenantName, body),
  };
}

export interface SurveyReminderParams extends SurveyInvitationParams {
  daysLeft: number;
}

export function surveyReminderEmail({
  tenantName,
  recipientName,
  surveyTitle,
  answerUrl,
  closesAtLabel,
  daysLeft,
}: SurveyReminderParams) {
  const greeting = recipientName?.trim()
    ? `Hola ${escapeHtml(recipientName.trim())},`
    : "Hola,";
  const remaining =
    daysLeft <= 0
      ? "hoy es el <strong>&uacute;ltimo d&iacute;a</strong> para responder"
      : daysLeft === 1
        ? "queda <strong>1 d&iacute;a</strong> para responder"
        : `quedan <strong>${daysLeft} d&iacute;as</strong> para responder`;

  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      Recordatorio: ${escapeHtml(surveyTitle)}
    </h2>
    <p style="margin:0 0 16px;color:${C.body};font-size:16px;line-height:1.6;">
      ${greeting} todav&iacute;a no registramos tu respuesta y ${remaining}.
    </p>
    ${ctaButton("Responder ahora", answerUrl)}
    <p style="margin:0 0 8px;color:${C.body};font-size:15px;line-height:1.6;">
      Cierra el <strong>${escapeHtml(closesAtLabel)}</strong>.
    </p>
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      Si ya respondiste, ignora este mensaje. Este enlace es personal: no lo reenv&iacute;es.
    </p>`;

  return {
    subject: `Recordatorio — ${surveyTitle}`,
    html: baseLayout(tenantName, body),
  };
}

export interface SurveyResultsPublishedParams {
  tenantName: string;
  recipientName?: string | null;
  surveyTitle: string;
  resultsUrl: string;
  totalResponses: number;
  note?: string | null;
}

export function surveyResultsPublishedEmail({
  tenantName,
  recipientName,
  surveyTitle,
  resultsUrl,
  totalResponses,
  note,
}: SurveyResultsPublishedParams) {
  const greeting = recipientName?.trim()
    ? `Hola ${escapeHtml(recipientName.trim())},`
    : "Hola,";
  const body = `
    <h2 style="margin:0 0 16px;color:${C.ink};font-size:20px;font-weight:600;">
      Resultados disponibles: ${escapeHtml(surveyTitle)}
    </h2>
    <p style="margin:0 0 16px;color:${C.body};font-size:16px;line-height:1.6;">
      ${greeting} ya puedes consultar el resultado consolidado de esta encuesta
      (${totalResponses} ${totalResponses === 1 ? "respuesta" : "respuestas"}).
    </p>
    ${
      note
        ? `<p style="margin:0 0 16px;color:${C.body};font-size:16px;line-height:1.6;">${escapeHtml(note)}</p>`
        : ""
    }
    ${ctaButton("Ver resultados", resultsUrl)}
    <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;">
      El informe muestra promedios y distribuciones del conjunto. Las respuestas
      individuales no se publican.
    </p>`;

  return {
    subject: `Resultados — ${surveyTitle}`,
    html: baseLayout(tenantName, body),
  };
}
