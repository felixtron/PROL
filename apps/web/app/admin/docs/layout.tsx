import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "ADMIN" && user.tenantId) {
    redirect("/tenant-admin/docs");
  }

  if (user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}
