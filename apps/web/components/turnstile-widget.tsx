"use client";

import { useEffect, useRef } from "react";

// Tipado mínimo del API global de Cloudflare Turnstile.
interface TurnstileAPI {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/**
 * Widget de Cloudflare Turnstile. El `siteKey` se inyecta desde un server
 * component que lo lee de `process.env.TURNSTILE_SITE_KEY` (runtime, no
 * build-time), así no dependemos de variables NEXT_PUBLIC inlinadas en el
 * bundle. Si `siteKey` es null (captcha no configurado, p. ej. dev local
 * sin llaves), el componente no renderiza nada y no estorba.
 *
 * - `onToken(token)`: se llama con el token al resolver el challenge, y con
 *   "" cuando expira o falla (para que el form deshabilite el submit).
 * - `resetKey`: al incrementarlo, el widget se reinicia. Necesario tras un
 *   submit fallido porque el token de Turnstile es de un solo uso.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
  resetKey = 0,
}: {
  siteKey: string | null;
  onToken: (token: string) => void;
  resetKey?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Guardamos onToken en una ref para no re-renderizar el widget en cada
  // render del padre (evita loops y challenges duplicados).
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    function renderWidget() {
      if (
        cancelled ||
        !containerRef.current ||
        !window.turnstile ||
        widgetIdRef.current
      ) {
        return;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
        theme: "auto",
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        "script[data-turnstile]",
      );
      if (existing) {
        existing.addEventListener("load", renderWidget, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "true";
        script.addEventListener("load", renderWidget, { once: true });
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget ya removido */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  // Reinicio explícito tras un submit fallido (token consumido).
  useEffect(() => {
    if (resetKey === 0) return;
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenRef.current("");
    }
  }, [resetKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="flex justify-center" />;
}
