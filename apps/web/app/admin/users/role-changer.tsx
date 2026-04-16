"use client";

import { useTransition } from "react";
import { updateUserRole } from "@/lib/actions/admin";

const roles = [
  { value: "STUDENT", label: "Estudiante" },
  { value: "PROFESSOR", label: "Profesor" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

interface RoleChangerProps {
  userId: string;
  currentRole: string;
}

export function RoleChanger({ userId, currentRole }: RoleChangerProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value;
    if (newRole === currentRole) return;

    startTransition(async () => {
      await updateUserRole(userId, newRole);
    });
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={handleChange}
      disabled={isPending}
      className={`rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-text-primary transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
        isPending ? "opacity-50" : ""
      }`}
    >
      {roles.map((role) => (
        <option key={role.value} value={role.value}>
          {role.label}
        </option>
      ))}
    </select>
  );
}
