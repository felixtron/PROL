import { cache } from "react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

export const getRevenueStats = cache(async () => {
  const user = await requireUser();

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [totalRevenue, monthRevenue, lastMonthRevenue, recentPayments] =
    await Promise.all([
      db.coursePayment.aggregate({
        where: {
          course: { professorId: user.id },
          status: "COMPLETED",
        },
        _sum: { creatorReceives: true },
      }),
      db.coursePayment.aggregate({
        where: {
          course: { professorId: user.id },
          status: "COMPLETED",
          createdAt: { gte: thisMonth, lte: thisMonthEnd },
        },
        _sum: { creatorReceives: true },
      }),
      db.coursePayment.aggregate({
        where: {
          course: { professorId: user.id },
          status: "COMPLETED",
          createdAt: { gte: lastMonth, lt: thisMonth },
        },
        _sum: { creatorReceives: true },
      }),
      db.coursePayment.findMany({
        where: {
          course: { professorId: user.id },
          status: "COMPLETED",
        },
        include: {
          course: { select: { title: true } },
          student: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  return {
    totalRevenue: totalRevenue._sum.creatorReceives ?? 0,
    monthRevenue: monthRevenue._sum.creatorReceives ?? 0,
    lastMonthRevenue: lastMonthRevenue._sum.creatorReceives ?? 0,
    recentPayments,
  };
});
