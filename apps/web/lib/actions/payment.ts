"use server";

import { revalidatePath } from "next/cache";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

// ---------------------------------------------------------------------------
// createCheckoutSession — Initiates Stripe Checkout for a course purchase
// ---------------------------------------------------------------------------

export async function createCheckoutSession(courseId: string) {
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

  // 3. Free course — enroll directly, no payment needed
  if (course.priceInCents === 0) {
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

  // 6. Create Stripe Checkout Session on the platform account
  //    using transfer_data.destination for Standard Connect
  const session = await getStripe().checkout.sessions.create({
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
    payment_method_types: ["card"],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/courses/${courseId}?enrolled=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}`,
    metadata: {
      courseId,
      studentId: user.id,
      tenantId: course.tenantId,
    },
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: tenant.stripeAccountId,
      },
    },
  });

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
