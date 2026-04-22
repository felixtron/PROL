// ---------------------------------------------------------------------------
// PROL - Email Templates (Spanish)
// All templates return { subject, html } with inline styles.
// Brand color: #6366f1 (indigo)
// ---------------------------------------------------------------------------

function baseLayout(tenantName: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${tenantName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#6366f1;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${tenantName}</h1>
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
            <td style="padding:24px 32px;background-color:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
                Enviado por ${tenantName} v&iacute;a <span style="color:#6366f1;font-weight:600;">PROL</span>
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
    <td style="border-radius:8px;background-color:#6366f1;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
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
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">
      &iexcl;Hola ${name}!
    </h2>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      Te damos la bienvenida a <strong>${tenantName}</strong>. Tu cuenta ha sido creada exitosamente y ya puedes acceder a la plataforma.
    </p>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      Explora los cursos disponibles, inscr&iacute;bete y comienza a aprender hoy mismo.
    </p>
    ${ctaButton("Iniciar sesi\u00f3n", loginUrl)}
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">
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
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">
      Inscripci&oacute;n confirmada
    </h2>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      Hola ${name}, tu inscripci&oacute;n al curso <strong>${courseName}</strong> ha sido confirmada.
    </p>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      Ya puedes acceder al contenido del curso y comenzar tu aprendizaje.
    </p>
    ${ctaButton("Acceder al curso", courseUrl)}
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">
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
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">
      Comprobante de pago
    </h2>
    <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
      Hola ${name}, hemos recibido tu pago correctamente. A continuaci&oacute;n los detalles:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:12px 16px;background-color:#f9fafb;color:#6b7280;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb;">Curso</td>
        <td style="padding:12px 16px;background-color:#f9fafb;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb;">${courseName}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#6b7280;font-size:14px;font-weight:600;">Monto</td>
        <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:700;">${amount} ${currency}</td>
      </tr>
    </table>
    ${ctaButton("Acceder al curso", courseUrl)}
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">
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
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">
      &iexcl;Tu curso est&aacute; en l&iacute;nea!
    </h2>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      Hola ${professorName}, nos complace informarte que tu curso <strong>${courseName}</strong> ha sido publicado exitosamente en la plataforma.
    </p>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      Los estudiantes ya pueden encontrarlo e inscribirse. Puedes ver c&oacute;mo luce tu curso con el siguiente enlace:
    </p>
    ${ctaButton("Ver mi curso", courseUrl)}
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">
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
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">
      &iexcl;Felicidades, ${name}! 🎓
    </h2>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      Has completado exitosamente el curso <strong>${courseName}</strong> y tu certificado est&aacute; listo.
    </p>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      Puedes descargar tu certificado o compartirlo directamente desde el enlace a continuaci&oacute;n.
    </p>
    ${ctaButton("Descargar certificado", certificateUrl)}
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">
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
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:600;">
      Te invitaron a unirte a ${companyName}
    </h2>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      <strong>${inviterName}</strong> te invit&oacute; a unirte a su equipo en
      <strong>${companyName}</strong> dentro de la plataforma.
    </p>
    <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
      Al aceptar, podr&aacute;s acceder a los cursos asignados a tu empresa
      sin costo adicional.
    </p>
    ${ctaButton("Aceptar invitación", acceptUrl)}
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">
      Esta invitaci&oacute;n expira en ${expiresInDays} d&iacute;as. Si no esperabas
      este correo, puedes ignorarlo.
    </p>`;

  return {
    subject: `Invitación para unirte a ${companyName}`,
    html: baseLayout(companyName, body),
  };
}
