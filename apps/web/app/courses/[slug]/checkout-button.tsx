"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { enrollInCourse } from "@/lib/actions/enrollment";
import { createCheckoutSession } from "@/lib/actions/payment";

interface CheckoutButtonProps {
  courseId: string;
  priceInCents: number;
  currency: string;
  isFree: boolean;
}

export function CheckoutButton({
  courseId,
  priceInCents,
  currency,
  isFree,
}: CheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      if (isFree) {
        await enrollInCourse(courseId);
        router.push(`/dashboard/courses/${courseId}`);
      } else {
        const session = await createCheckoutSession(courseId);
        if (session?.url) {
          window.location.href = session.url;
        }
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : isFree ? (
        "Inscribirse Gratis"
      ) : (
        `Comprar Curso`
      )}
    </button>
  );
}
