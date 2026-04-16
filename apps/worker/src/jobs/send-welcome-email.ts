import { task } from "@trigger.dev/sdk/v3";
import { db } from "@prol/db";
import { sendEmail, welcomeEmail } from "@prol/email";

export const sendWelcomeEmail = task({
  id: "send-welcome-email",
  run: async (payload: { userId: string; email: string; name: string }) => {
    // Look up the user's tenant
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user?.tenant) {
      throw new Error(`User ${payload.userId} has no tenant`);
    }

    // Compute login URL
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`;

    // Generate email template
    const { subject, html } = welcomeEmail({
      name: payload.name,
      tenantName: user.tenant.name,
      loginUrl,
    });

    // Send the email
    await sendEmail({
      to: payload.email,
      subject,
      html,
    });

    return { success: true };
  },
});
