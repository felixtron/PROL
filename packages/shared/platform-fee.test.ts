import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePlatformFee,
  readFeeSnapshot,
  reconcileChargedApplicationFee,
} from "./src/platform-fee.ts";

/**
 * Venta de $1,000.00 MXN con revenue share del 4% (el caso de la academia
 * nueva). Stripe cobra en centavos: 100000.
 *
 * Parte comercial: round(100000 × 0.04) = 4000 centavos ($40.00).
 * Costo que Prosuite paga y repercute, con IVA:
 *   ceil((1000 × 4% + $3) × 1.16) = ceil($49.88) en centavos = 4988.
 * application fee = 4000 + 4988 = 8988 centavos ($89.88).
 * El tenant recibe 91012 centavos ($910.12).
 *
 * La tarjeta real sale en (1000 × 3.6% + $3) × 1.16 = $45.24, así que 4988
 * centavos cubre ese costo y deja la comisión de $40 intacta.
 */
const SALE_1000_MXN = 100_000;
const CARD_COST_1000_MXN_CENTAVOS = 4_524;

describe("computePlatformFee", () => {
  it("suma el revenue share y el costo de Stripe con IVA, en centavos, para $1,000 al 4%", () => {
    const fee = computePlatformFee({
      amountCentavos: SALE_1000_MXN,
      revenueShareRate: 0.04,
    });

    assert.equal(fee.revenueShareCentavos, 4_000);
    assert.equal(fee.stripeFeeCentavos, 4_988);
    assert.equal(fee.prolFeeCentavos, 4_000);
    assert.equal(fee.applicationFeeCentavos, 8_988);
    assert.equal(fee.creatorReceivesCentavos, 91_012);
    assert.ok(fee.stripeFeeCentavos > CARD_COST_1000_MXN_CENTAVOS);
    assert.ok(Number.isSafeInteger(fee.applicationFeeCentavos));
  });

  it("mantiene el 30% de comisión y le suma el mismo traspaso de Stripe", () => {
    const fee = computePlatformFee({
      amountCentavos: SALE_1000_MXN,
      revenueShareRate: 0.3,
    });

    assert.equal(fee.revenueShareCentavos, 30_000);
    assert.equal(fee.stripeFeeCentavos, 4_988);
    assert.equal(fee.applicationFeeCentavos, 34_988);
    assert.equal(fee.prolFeeCentavos, 30_000);
    assert.equal(fee.creatorReceivesCentavos, 65_012);
  });

  it("redondea el traspaso hacia arriba cuando el centavo queda fraccionario", () => {
    // $10.00 MXN: (10 × 4% + $3) × 1.16 = $3.944 → 395 centavos, no 394.
    const fee = computePlatformFee({
      amountCentavos: 1_000,
      revenueShareRate: 0.04,
    });

    assert.equal(fee.stripeFeeCentavos, 395);
    assert.equal(fee.revenueShareCentavos, 40);
    assert.equal(fee.applicationFeeCentavos, 435);
    assert.equal(fee.creatorReceivesCentavos, 565);
  });

  it("redondea el revenue share al centavo más cercano", () => {
    const fee = computePlatformFee({
      amountCentavos: 10_001,
      revenueShareRate: 0.3,
    });

    assert.equal(fee.revenueShareCentavos, 3_000);
    assert.equal(fee.prolFeeCentavos, 3_000);
  });

  it("nunca deja que la tarifa supere el cargo y no produce negativos", () => {
    const fee = computePlatformFee({
      amountCentavos: 100,
      revenueShareRate: 0.04,
    });

    assert.ok(fee.applicationFeeCentavos <= 100);
    assert.equal(fee.applicationFeeCentavos, 100);
    assert.equal(
      fee.prolFeeCentavos + fee.stripeFeeCentavos,
      fee.applicationFeeCentavos,
    );
    assert.equal(fee.creatorReceivesCentavos, 0);
    assert.ok(fee.prolFeeCentavos >= 0);
    assert.ok(fee.stripeFeeCentavos >= 0);
  });

  it("un cargo de $0 no genera tarifa", () => {
    const fee = computePlatformFee({
      amountCentavos: 0,
      revenueShareRate: 0.04,
    });

    assert.deepEqual(fee, {
      amountCentavos: 0,
      revenueShareCentavos: 0,
      stripeFeeCentavos: 0,
      prolFeeCentavos: 0,
      applicationFeeCentavos: 0,
      creatorReceivesCentavos: 0,
    });
  });

  it("sigue repercutiendo Stripe aunque el revenue share sea 0", () => {
    const fee = computePlatformFee({
      amountCentavos: SALE_1000_MXN,
      revenueShareRate: 0,
    });

    assert.equal(fee.prolFeeCentavos, 0);
    assert.equal(fee.stripeFeeCentavos, 4_988);
    assert.equal(fee.applicationFeeCentavos, 4_988);
    assert.equal(fee.creatorReceivesCentavos, 95_012);
  });

  it("un pago manual no repercute Stripe: sólo el revenue share", () => {
    const fee = computePlatformFee({
      amountCentavos: SALE_1000_MXN,
      revenueShareRate: 0.04,
      passThroughStripeFee: false,
    });

    assert.equal(fee.stripeFeeCentavos, 0);
    assert.equal(fee.prolFeeCentavos, 4_000);
    assert.equal(fee.applicationFeeCentavos, 4_000);
    assert.equal(fee.creatorReceivesCentavos, 96_000);
  });

  it("rechaza importes o tasas que no se pueden cobrar", () => {
    assert.throws(() =>
      computePlatformFee({ amountCentavos: -1, revenueShareRate: 0.04 }),
    );
    assert.throws(() =>
      computePlatformFee({ amountCentavos: 10.5, revenueShareRate: 0.04 }),
    );
    assert.throws(() =>
      computePlatformFee({ amountCentavos: 1_000, revenueShareRate: 1.5 }),
    );
    assert.throws(() =>
      computePlatformFee({
        amountCentavos: 1_000,
        revenueShareRate: Number.NaN,
      }),
    );
  });

  it("recupera el desglose guardado en la sesión cuando cuadra con el importe", () => {
    const fee = readFeeSnapshot(
      { prolFee: "4000", stripeFee: "4988", applicationFee: "8988" },
      SALE_1000_MXN,
    );

    assert.equal(fee?.applicationFeeCentavos, 8_988);
    assert.equal(fee?.prolFeeCentavos, 4_000);
    assert.equal(fee?.stripeFeeCentavos, 4_988);
    assert.equal(fee?.creatorReceivesCentavos, 91_012);
  });

  it("descarta un desglose que no suma o que supera el cargo", () => {
    assert.equal(
      readFeeSnapshot(
        { prolFee: "1", stripeFee: "1", applicationFee: "3" },
        100,
      ),
      null,
    );
    assert.equal(
      readFeeSnapshot(
        { prolFee: "50", stripeFee: "60", applicationFee: "110" },
        100,
      ),
      null,
    );
  });

  it("si Stripe cobró sólo el revenue share, no inventa el traspaso", () => {
    const computed = computePlatformFee({
      amountCentavos: SALE_1000_MXN,
      revenueShareRate: 0.04,
    });
    const recorded = reconcileChargedApplicationFee(computed, 4_000);

    assert.equal(recorded.applicationFeeCentavos, 4_000);
    assert.equal(recorded.prolFeeCentavos, 4_000);
    assert.equal(recorded.stripeFeeCentavos, 0);
    assert.equal(recorded.creatorReceivesCentavos, 96_000);
  });

  it("conserva el desglose cuando lo cobrado coincide con la fórmula", () => {
    const computed = computePlatformFee({
      amountCentavos: SALE_1000_MXN,
      revenueShareRate: 0.04,
    });
    assert.equal(reconcileChargedApplicationFee(computed, 8_988), computed);
    assert.equal(reconcileChargedApplicationFee(computed, null), computed);
  });
});
