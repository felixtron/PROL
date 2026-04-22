"use server";

import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

// ---------------------------------------------------------------------------
// createCheckoutSession — Initiates Stripe Checkout for a course purchase
// ---------------------------------------------------------------------------

export type StripePaymentMethod = "card" | "oxxo" | "spei";

export async function createCheckoutSession(
  courseId: string,
  paymentMethod: StripePaymentMethod = "card"
) {
  const user = await requireUser();

  // 1. Find the course (must be published)
  const course = await db.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
    include: {
      tenant: {
        select: {
          id: true,
          stripeAccountId: true,
          revenueShareRate: true,
        },
      },
    },
  });

  if (!course) {
    throw new Error("Curso no disponible");
  }

  // 2. Check user isn't already enrolled
  const existingEnrollment = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId } },
  });

  if (existingEnrollment) {
    throw new Error("Ya estas inscrito en este curso");
  }

  // 3. Free course OR course assigned to the user's company — enroll directly
  let isCompanyAssigned = false;
  if (user.companyId) {
    const assignment = await db.companyCourseAssignment.findUnique({
      where: {
        companyId_courseId: { companyId: user.companyId, courseId },
      },
      select: { isActive: true, expiresAt: true },
    });
    if (
      assignment?.isActive &&
      (!assignment.expiresAt || assignment.expiresAt > new Date())
    ) {
      isCompanyAssigned = true;
    }
  }

  if (course.priceInCents === 0 || isCompanyAssigned) {
    await db.enrollment.create({
      data: {
        studentId: user.id,
        courseId,
        tenantId: course.tenantId,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/courses");

    return {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/courses/${courseId}?enrolled=true`,
    };
  }

  // 4. Paid course — require Stripe Connect
  const tenant = course.tenant;

  if (!tenant.stripeAccountId) {
    throw new Error("El creador no ha configurado pagos");
  }

  // 5. Calculate the platform fee (PROL cut)
  const applicationFeeAmount = Math.round(
    course.priceInCents * tenant.revenueShareRate
  );

  // 6. Stripe Checkout session. Method-specific configuration:
  //    - card: instant, synchronous confirmation
  //    - oxxo: async, hosted voucher with 3-day expiration (MX only)
  //    - spei (customer_balance bank transfer): async, CLABE instructions
  const baseParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: course.currency.toLowerCase(),
          product_data: {
            name: course.title,
            ...(course.description ? { description: course.description } : {}),
          },
          unit_amount: course.priceInCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/courses/${courseId}?enrolled=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}`,
    metadata: {
      courseId,
      studentId: user.id,
      tenantId: course.tenantId,
      paymentMethod,
    },
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: tenant.stripeAccountId },
    },
  };

  let session;
  if (paymentMethod === "oxxo") {
    session = await getStripe().checkout.sessions.create({
      ...baseParams,
      payment_method_types: ["oxxo"],
      payment_method_options: {
        oxxo: { expires_after_days: 3 },
      },
      // OXXO requires the customer's email
      customer_email: user.email,
    });
  } else if (paymentMethod === "spei") {
    session = await getStripe().checkout.sessions.create({
      ...baseParams,
      payment_method_types: ["customer_balance"],
      payment_method_options: {
        customer_balance: {
          funding_type: "bank_transfer",
          bank_transfer: { type: "mx_bank_transfer" },
        },
      },
      customer_email: user.email,
    });
  } else {
    session = await getStripe().checkout.sessions.create({
      ...baseParams,
      payment_method_types: ["card"],
    });
  }

  return { url: session.url };
}

// ---------------------------------------------------------------------------
// createConnectOnboardingLink — Generates Stripe Connect onboarding URL
// ---------------------------------------------------------------------------

export async function createConnectOnboardingLink() {
  const user = await requireUser();

  if (user.role !== "PROFESSOR" && user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }

  if (!user.tenantId) {
    throw new Error("No se encontro la academia asociada");
  }

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { id: true, stripeAccountId: true, name: true, contactEmail: true },
  });

  if (!tenant) {
    throw new Error("Academia no encontrada");
  }

  let stripeAccountId = tenant.stripeAccountId;

  // Create a new Standard Connect account if one doesn't exist
  if (!stripeAccountId) {
    const account = await getStripe().accounts.create({
      type: "standard",
      country: "MX",
      email: tenant.contactEmail ?? user.email,
      business_profile: {
        name: tenant.name,
      },
      metadata: {
        tenantId: tenant.id,
      },
    });

    stripeAccountId = account.id;

    await db.tenant.update({
      where: { id: tenant.id },
      data: { stripeAccountId: account.id },
    });
  }

  // Create onboarding link
  const accountLink = await getStripe().accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/professor/settings?stripe=success`,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/professor/settings?stripe=refresh`,
  });

  return { url: accountLink.url };
}

// ---------------------------------------------------------------------------
// getConnectAccountStatus — Checks Stripe Connect account status
// ---------------------------------------------------------------------------

export async function getConnectAccountStatus() {
  const user = await requireUser();

  if (user.role !== "PROFESSOR" && user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }

  if (!user.tenantId) {
    return { connected: false as const };
  }

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { stripeAccountId: true },
  });

  if (!tenant?.stripeAccountId) {
    return { connected: false as const };
  }

  const account = await getStripe().accounts.retrieve(tenant.stripeAccountId);

  return {
    connected: true as const,
    chargesEnabled: account.charges_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
  };
}
