import { task } from "@trigger.dev/sdk/v3";
import { db } from "@prol/db";

export const calculateRevenue = task({
  id: "calculate-monthly-revenue",
  run: async (payload: { tenantId: string; month: number; year: number }) => {
    // Calculate the start and end dates for the given month
    const startDate = new Date(payload.year, payload.month - 1, 1);
    const endDate = new Date(payload.year, payload.month, 0, 23, 59, 59, 999);

    // Query aggregate data for completed payments in the month range
    const result = await db.coursePayment.aggregate({
      where: {
        tenantId: payload.tenantId,
        status: "COMPLETED",
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
        prolFee: true,
        creatorReceives: true,
      },
      _count: true,
    });

    return {
      totalRevenue: result._sum.amount ?? 0,
      platformFees: result._sum.prolFee ?? 0,
      creatorPayouts: result._sum.creatorReceives ?? 0,
      transactionCount: result._count,
    };
  },
});
