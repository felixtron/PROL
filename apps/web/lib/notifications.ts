import { db } from "@prol/db";

export async function createNotification(data: {
  userId: string;
  tenantId: string;
  type: "ENROLLMENT" | "PAYMENT" | "COURSE_UPDATE" | "WORKSHOP" | "CERTIFICATE" | "SYSTEM";
  title: string;
  message: string;
  link?: string;
}) {
  return db.notification.create({ data });
}
