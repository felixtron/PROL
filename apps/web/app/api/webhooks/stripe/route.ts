import { NextRequest, NextResponse } from "next/server";
import { db } from "@prol/db";
import { sendEmail, paymentConfirmation, enrollmentConfirmation } from "@prol/email";
import { getStripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Falta la firma de Stripe" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error de verificación de firma";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Firma de webhook invalida" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // Cards: paid immediately. Non-card methods still emit this event
        // but the payment may still be in "processing" state — handled below.
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        // OXXO/SPEI: the customer paid at OXXO or wired via SPEI.
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      case "checkout.session.async_payment_failed": {
        // OXXO voucher expired / SPEI bounce
        await handleCheckoutAsyncFailed(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      case "checkout.session.expired": {
        await handleCheckoutExpired(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      default: {
        console.log(`Evento de Stripe no manejado: ${event.type}`);
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error procesando el webhook";
    console.error(`Error procesando webhook ${event.type}: ${message}`);
    return NextResponse.json(
      { error: "Error procesando el evento" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const courseId = session.metadata?.courseId;
  const studentId = session.metadata?.studentId;
  const tenantId = session.metadata?.tenantId;

  if (!courseId || !studentId || !tenantId) {
    console.error("Metadata incompleta en la sesion de checkout:", session.id);
    return;
  }

  // Validate payment_intent exists
  if (!session.payment_intent) {
    console.error("payment_intent missing from checkout session:", session.id);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent.id;

  // Detect the real payment method used (could be card/oxxo/customer_balance)
  const pmTypes = session.payment_method_types ?? [];
  const rawMethod = pmTypes[0] ?? "card";
  const paymentMethod: "CARD" | "OXXO" | "SPEI" =
    rawMethod === "oxxo"
      ? "OXXO"
      : rawMethod === "customer_balance"
        ? "SPEI"
        : "CARD";

  // Async payment state: for OXXO/SPEI, checkout.session.completed fires
  // when the session is finalized, but the payment may still be pending.
  // The real "paid" signal is checkout.session.async_payment_succeeded.
  const paymentStatus = session.payment_status;
  const isPaid = paymentStatus === "paid";

  // Get the tenant's revenue share rate at payment time
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { revenueShareRate: true },
  });

  const revenueShareRate = tenant?.revenueShareRate ?? 0.3;
  const amount = session.amount_total ?? 0;
  const prolFee = Math.round(amount * revenueShareRate);
  const creatorReceives = amount - prolFee;
  const stripeFee = Math.round(amount * 0.036 + 300);

  // Voucher URL for OXXO/SPEI (available in payment_intent.next_action).
  // Reading it requires expanding payment_intent — do it lazily if missing.
  let voucherUrl: string | null = null;
  let voucherExpiresAt: Date | null = null;
  if (!isPaid && (paymentMethod === "OXXO" || paymentMethod === "SPEI")) {
    try {
      const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
      const na = pi.next_action;
      if (paymentMethod === "OXXO" && na?.oxxo_display_details) {
        voucherUrl = na.oxxo_display_details.hosted_voucher_url ?? null;
        const exp = na.oxxo_display_details.expires_after;
        voucherExpiresAt = exp ? new Date(exp * 1000) : null;
      } else if (
        paymentMethod === "SPEI" &&
        na?.display_bank_transfer_instructions
      ) {
        // SPEI instructions page — Stripe hosts a page with CLABE details
        voucherUrl = na.display_bank_transfer_instructions.hosted_instructions_url ?? null;
      }
    } catch (err) {
      console.error("No se pudo recuperar next_action del PaymentIntent:", err);
    }
  }

  // Idempotency: if we already recorded this payment, update its state
  // instead of inserting a duplicate (common on async_payment_succeeded
  // fired after the initial PENDING row).
  const existingPayment = await db.coursePayment.findUnique({
    where: { stripePaymentId: paymentIntentId },
  });

  if (existingPayment) {
    if (existingPayment.status !== "COMPLETED" && isPaid) {
      await db.coursePayment.update({
        where: { id: existingPayment.id },
        data: { status: "COMPLETED", paidAt: new Date() },
      });
      // Ensure enrollment exists
      await db.enrollment.upsert({
        where: { studentId_courseId: { studentId, courseId } },
        create: { studentId, courseId, tenantId },
        update: {},
      });
    } else {
      console.log(
        `Pago ya registrado (status=${existingPayment.status}) para ${paymentIntentId}`
      );
    }
    revalidatePath("/dashboard");
    return;
  }

  // Create payment record and, if paid, the enrollment in a transaction
  await db.$transaction([
    db.coursePayment.create({
      data: {
        tenantId,
        studentId,
        courseId,
        amount,
        currency: session.currency?.toUpperCase() ?? "MXN",
        revenueShareRate,
        prolFee,
        creatorReceives,
        stripeFee,
        stripePaymentId: paymentIntentId,
        paymentMethod,
        status: isPaid ? "COMPLETED" : "PROCESSING",
        paidAt: isPaid ? new Date() : null,
        voucherUrl,
        voucherExpiresAt,
      },
    }),
    // Only create enrollment once the payment actually cleared.
    ...(isPaid
      ? [
          db.enrollment.upsert({
            where: { studentId_courseId: { studentId, courseId } },
            create: { studentId, courseId, tenantId },
            update: {},
          }),
        ]
      : []),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath("/professor/courses");

  // Only send confirmation emails once payment is actually cleared
  if (!isPaid) return;

  try {
    const [student, course] = await Promise.all([
      db.user.findUnique({
        where: { id: studentId },
        select: { name: true, email: true },
      }),
      db.course.findUnique({
        where: { id: courseId },
        select: { title: true },
      }),
    ]);

    const tenantData = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    });

    if (student?.email && course && tenantData) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://prol.prosuite.pro";
      const courseUrl = `${appUrl}/dashboard/courses/${courseId}`;
      const displayAmount = (amount / 100).toFixed(2);
      const currency = session.currency?.toUpperCase() ?? "MXN";

      const paymentEmail = paymentConfirmation({
        name: student.name ?? "Estudiante",
        courseName: course.title,
        amount: displayAmount,
        currency,
        courseUrl,
        tenantName: tenantData.name,
      });

      const enrollEmail = enrollmentConfirmation({
        name: student.name ?? "Estudiante",
        courseName: course.title,
        courseUrl,
        tenantName: tenantData.name,
      });

      await Promise.allSettled([
        sendEmail({ to: student.email, subject: paymentEmail.subject, html: paymentEmail.html }),
        sendEmail({ to: student.email, subject: enrollEmail.subject, html: enrollEmail.html }),
      ]);
    }
  } catch (emailError) {
    console.error("Error enviando emails de confirmacion:", emailError);
  }
}

// ---------------------------------------------------------------------------
// checkout.session.expired
// ---------------------------------------------------------------------------

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;

  const existingPayment = await db.coursePayment.findUnique({
    where: { stripePaymentId: paymentIntentId },
  });

  if (
    existingPayment &&
    (existingPayment.status === "PENDING" ||
      existingPayment.status === "PROCESSING")
  ) {
    await db.coursePayment.update({
      where: { id: existingPayment.id },
      data: { status: "FAILED" },
    });
  }
}

// ---------------------------------------------------------------------------
// checkout.session.async_payment_failed (OXXO voucher expired / SPEI bounce)
// ---------------------------------------------------------------------------

async function handleCheckoutAsyncFailed(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;

  const existingPayment = await db.coursePayment.findUnique({
    where: { stripePaymentId: paymentIntentId },
  });

  if (!existingPayment) {
    console.warn(
      `async_payment_failed for unknown payment_intent: ${paymentIntentId}`
    );
    return;
  }

  if (existingPayment.status !== "COMPLETED") {
    await db.coursePayment.update({
      where: { id: existingPayment.id },
      data: { status: "FAILED" },
    });
    revalidatePath("/dashboard");
  }
}
