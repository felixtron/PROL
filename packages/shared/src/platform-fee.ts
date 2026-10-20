/**
 * Tarifa de plataforma en destination charges de Stripe Connect.
 *
 * Prosuite paga la comisión de Stripe. El `application_fee_amount` tiene que
 * incluir la parte comercial del tenant y el costo de procesar el cobro con
 * IVA. Si sólo se retiene el revenue share, al 4% la plataforma pierde dinero
 * en cada venta (en $1,000 MXN la comisión son $40 y Stripe cobra ~$45 con
 * tarjeta o ~$50 en OXXO).
 *
 * application fee = revenue share + ceil((importe × 4% + $3 MXN) × 1.16)
 *
 * Los importes entran y salen en centavos, que es la unidad de Stripe para
 * MXN. La tarifa nunca supera el cargo: si el fijo de $3 ya rebasa el
 * importe, la plataforma se queda con el cargo completo.
 *
 * Un pago manual no pasa por Stripe, así que no se le suma este traspaso.
 */

const STRIPE_VARIABLE_PERCENT = 4;
const STRIPE_FIXED_CENTAVOS = 300;
const IVA_NUMERATOR = 116;
const PERCENT = 100;

export type PlatformFeeBreakdown = {
  amountCentavos: number;
  /** round(importe × tasa), antes de topar la tarifa contra el cargo. */
  revenueShareCentavos: number;
  /** Costo de Stripe + IVA repercutido. 0 en pagos manuales. */
  stripeFeeCentavos: number;
  /** Parte comercial que sí se retiene después del tope. */
  prolFeeCentavos: number;
  /** Lo que se envía como application_fee_amount. prolFee + stripeFee. */
  applicationFeeCentavos: number;
  creatorReceivesCentavos: number;
};

export type FeeSnapshotMetadata = {
  prolFee?: string;
  stripeFee?: string;
  applicationFee?: string;
};

function assertAmount(amountCentavos: number): void {
  if (!Number.isSafeInteger(amountCentavos) || amountCentavos < 0) {
    throw new Error(
      "El importe debe ser un entero de centavos mayor o igual a cero",
    );
  }
}

function assertRate(revenueShareRate: number): void {
  if (
    !Number.isFinite(revenueShareRate) ||
    revenueShareRate < 0 ||
    revenueShareRate > 1
  ) {
    throw new Error("La tasa de revenue share debe estar entre 0 y 1");
  }
}

/** ceil((importe × 4% + $3 MXN) × 1.16), en centavos. $0 no genera fijo. */
export function stripeProcessingPassthroughCentavos(
  amountCentavos: number,
): number {
  assertAmount(amountCentavos);
  if (amountCentavos === 0) return 0;
  const numerator =
    (amountCentavos * STRIPE_VARIABLE_PERCENT +
      STRIPE_FIXED_CENTAVOS * PERCENT) *
    IVA_NUMERATOR;
  const denominator = PERCENT * PERCENT;
  return Math.ceil(numerator / denominator);
}

export function computePlatformFee(input: {
  amountCentavos: number;
  revenueShareRate: number;
  /** false en pagos registrados a mano: no hay comisión de Stripe que repercutir. */
  passThroughStripeFee?: boolean;
}): PlatformFeeBreakdown {
  const { amountCentavos, revenueShareRate } = input;
  assertAmount(amountCentavos);
  assertRate(revenueShareRate);

  if (amountCentavos === 0) {
    return {
      amountCentavos: 0,
      revenueShareCentavos: 0,
      stripeFeeCentavos: 0,
      prolFeeCentavos: 0,
      applicationFeeCentavos: 0,
      creatorReceivesCentavos: 0,
    };
  }

  const revenueShareCentavos = Math.max(
    0,
    Math.round(amountCentavos * revenueShareRate),
  );
  const stripeRaw =
    input.passThroughStripeFee === false
      ? 0
      : stripeProcessingPassthroughCentavos(amountCentavos);
  const applicationFeeCentavos = Math.min(
    revenueShareCentavos + stripeRaw,
    amountCentavos,
  );
  const stripeFeeCentavos = Math.min(stripeRaw, applicationFeeCentavos);
  const prolFeeCentavos = applicationFeeCentavos - stripeFeeCentavos;

  return {
    amountCentavos,
    revenueShareCentavos,
    stripeFeeCentavos,
    prolFeeCentavos,
    applicationFeeCentavos,
    creatorReceivesCentavos: amountCentavos - applicationFeeCentavos,
  };
}

/**
 * Desglose escrito en la metadata de la sesión de Checkout. Se usa al
 * registrar el pago para no recalcular con una tasa que haya cambiado
 * después. Se descarta si no cuadra: alguien no puede inflar la tarifa
 * cambiando la metadata a mano, y un valor a medias no se toma por bueno.
 */
export function readFeeSnapshot(
  metadata: FeeSnapshotMetadata | null | undefined,
  amountCentavos: number,
): PlatformFeeBreakdown | null {
  if (!metadata) return null;
  if (!Number.isSafeInteger(amountCentavos) || amountCentavos < 0) return null;

  const prol = Number(metadata.prolFee);
  const stripe = Number(metadata.stripeFee);
  const application = Number(metadata.applicationFee);
  const parts = [prol, stripe, application];
  if (!parts.every((n) => Number.isSafeInteger(n) && n >= 0)) return null;
  if (prol + stripe !== application) return null;
  if (application > amountCentavos) return null;

  return {
    amountCentavos,
    revenueShareCentavos: prol,
    stripeFeeCentavos: stripe,
    prolFeeCentavos: prol,
    applicationFeeCentavos: application,
    creatorReceivesCentavos: amountCentavos - application,
  };
}

/**
 * Si el PaymentIntent trae un application fee distinto al de la fórmula
 * (un checkout creado antes de repercutir Stripe), se registra lo que
 * Stripe cobró de verdad y no se inventa un traspaso que no ocurrió.
 */
export function reconcileChargedApplicationFee(
  computed: PlatformFeeBreakdown,
  chargedApplicationFeeCentavos: number | null,
): PlatformFeeBreakdown {
  if (chargedApplicationFeeCentavos == null) return computed;
  if (
    !Number.isSafeInteger(chargedApplicationFeeCentavos) ||
    chargedApplicationFeeCentavos < 0
  ) {
    return computed;
  }
  if (chargedApplicationFeeCentavos === computed.applicationFeeCentavos) {
    return computed;
  }

  const applicationFeeCentavos = Math.min(
    chargedApplicationFeeCentavos,
    computed.amountCentavos,
  );
  return {
    amountCentavos: computed.amountCentavos,
    revenueShareCentavos: computed.revenueShareCentavos,
    stripeFeeCentavos: 0,
    prolFeeCentavos: applicationFeeCentavos,
    applicationFeeCentavos,
    creatorReceivesCentavos: computed.amountCentavos - applicationFeeCentavos,
  };
}
