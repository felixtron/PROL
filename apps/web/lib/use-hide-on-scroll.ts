"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** Píxeles recorridos antes de empezar a ocultar: evita que la barra
 *  desaparezca por el rebote de un toque en la parte alta de la página. */
const START_AT = 80;
/** Movimiento mínimo para considerar que hubo un cambio de dirección. */
const THRESHOLD = 4;

/**
 * Oculta un elemento `sticky` al bajar y lo devuelve al subir.
 *
 * Escucha el contenedor marcado con `[data-scroll-container]` más cercano —el
 * `<main>` de los shells—, no `window`: el scroll de la app no vive en el
 * `<body>`. Cae a `window` si no encuentra ninguno.
 */
export function useHideOnScroll(
  ref: RefObject<HTMLElement | null>,
  { disabled = false }: { disabled?: boolean } = {},
): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (disabled) {
      setHidden(false);
      return;
    }

    const node = ref.current;
    const container: HTMLElement | Window =
      node?.closest<HTMLElement>("[data-scroll-container]") ?? window;

    const readY = () =>
      container === window
        ? window.scrollY
        : (container as HTMLElement).scrollTop;

    let lastY = readY();
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = readY();
        const delta = y - lastY;
        if (Math.abs(delta) < THRESHOLD) return;
        setHidden(delta > 0 && y > START_AT);
        lastY = y;
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, disabled]);

  return hidden;
}
