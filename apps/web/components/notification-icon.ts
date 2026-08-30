import {
  Bell,
  GraduationCap,
  DollarSign,
  BookOpen,
  Calendar,
  Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Icono que corresponde al tipo de notificación. */
export function getNotificationIcon(type: string): LucideIcon {
  switch (type) {
    case "ENROLLMENT":
      return GraduationCap;
    case "PAYMENT":
      return DollarSign;
    case "COURSE_UPDATE":
      return BookOpen;
    case "WORKSHOP":
      return Calendar;
    case "CERTIFICATE":
      return Award;
    case "SYSTEM":
    default:
      return Bell;
  }
}
