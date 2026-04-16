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
      err instanceof Error ? err.message : "Error de verificacion de firma";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Firma de webhook invalida" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(
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
        // Unhandled event type — acknowledge receipt
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

  // Prevent duplicate processing
  const existingPayment = await db.coursePayment.findUnique({
    where: { stripePaymentId: paymentIntentId },
  });

  if (existingPayment) {
    console.log(
      `Pago ya procesado para payment_intent: ${session.payment_intent}`
    );
    return;
  }

  // Get the tenant's revenue share rate at payment time
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { revenueShareRate: true },
  });

  const revenueShareRate = tenant?.revenueShareRate ?? 0.3;
  const amount = session.amount_total ?? 0;
  const prolFee = Math.round(amount * revenueShareRate);
  const creatorReceives = amount - prolFee;

  // Estimate Stripe fee (approximately 3.6% + $3 MXN for Mexico)
  // This is an estimate; the actual fee comes from the balance transaction
  const stripeFee = Math.round(amount * 0.036 + 300);

  // Create payment record and enrollment in a transaction
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
        paymentMethod: "CARD",
        status: "COMPLETED",
        paidAt: new Date(),
      },
    }),
    db.enrollment.upsert({
      where: { studentId_courseId: { studentId, courseId } },
      create: {
        studentId,
        courseId,
        tenantId,
      },
      update: {},
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath("/professor/courses");

  // Send confirmation emails (non-blocking — failures don't affect the webhook)
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

  const existingPayment = await db.coursePayment.findUnique({
    where: { stripePaymentId: session.payment_intent as string },
  });

  if (existingPayment && existingPayment.status === "PENDING") {
    await db.coursePayment.update({
      where: { id: existingPayment.id },
      data: { status: "FAILED" },
    });
  }
}
