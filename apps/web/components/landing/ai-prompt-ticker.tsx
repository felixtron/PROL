"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";

const prompts = [
  {
    input: "Capacitación de protocolo de higiene quirúrgica",
    outline: [
      "Lavado de manos quirúrgico (técnica y duración)",
      "Vestimenta estéril paso a paso",
      "Manejo de instrumental contaminado",
      "Quiz: 8 preguntas con video real",
    ],
  },
  {
    input: "Onboarding de nuevos vendedores B2B",
    outline: [
      "Conoce a nuestros 3 buyer personas",
      "Discovery call: estructura de 30 min",
      "Manejo de objeciones más comunes",
      "Caso práctico: cierra una demo",
    ],
  },
  {
    input: "Técnica vocal para principiantes",
    outline: [
      "Postura y respiración diafragmática",
      "Calentamiento (10 min con audio guía)",
      "Afinación: ejercicios por intervalos",
      "Graba tu primera escala y autoevalúa",
    ],
  },
  {
    input: "Operación segura de torno CNC",
    outline: [
      "Inspección previa a la jornada",
      "Carga de pieza y centrado",
      "Lectura de plano y selección de herramienta",
      "Checklist de fin de turno",
    ],
  },
];

const TYPE_SPEED = 38;
const ERASE_SPEED = 16;
const HOLD_AFTER_TYPE = 600;
const HOLD_AFTER_OUTLINE = 2800;

export function AIPromptTicker() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "outline" | "erasing">("typing");
  const [revealCount, setRevealCount] = useState(0);

  const current = prompts[index]!;

  useEffect(() => {
    if (phase === "typing") {
      if (typed.length < current.input.length) {
        const t = setTimeout(
          () => setTyped(current.input.slice(0, typed.length + 1)),
          TYPE_SPEED,
        );
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setPhase("outline");
        setRevealCount(0);
      }, HOLD_AFTER_TYPE);
      return () => clearTimeout(t);
    }

    if (phase === "outline") {
      if (revealCount < current.outline.length) {
        const t = setTimeout(() => setRevealCount((c) => c + 1), 220);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("erasing"), HOLD_AFTER_OUTLINE);
      return () => clearTimeout(t);
    }

    if (phase === "erasing") {
      if (typed.length > 0) {
        const t = setTimeout(
          () => setTyped(current.input.slice(0, typed.length - 1)),
          ERASE_SPEED,
        );
        return () => clearTimeout(t);
      }
      setIndex((i) => (i + 1) % prompts.length);
      setPhase("typing");
      return;
    }
  }, [phase, typed, revealCount, current]);

  return (
    <div className="flex min-h-[540px] flex-col rounded-3xl border border-ink-200/80 bg-white p-5 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.18)] sm:min-h-[560px] sm:p-7">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-ink-500">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" strokeWidth={2} />
        Asistente PROL
      </div>

      <div className="mt-4 min-h-[88px] rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
          Describe el tema
        </p>
        <p className="mt-1.5 min-h-[2.6em] font-mono text-sm leading-relaxed text-ink-900 sm:text-[15px]">
          {typed}
          <span
            aria-hidden
            className="ai-caret ml-0.5 inline-block h-[1em] w-[2px] -translate-y-[2px] align-middle bg-ink-900"
          />
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-ink-400">
        <ArrowRight className="h-3.5 w-3.5" />
        <span>
          {phase === "outline" || phase === "erasing"
            ? "Estructura sugerida"
            : "Generando estructura…"}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {current.outline.map((item, i) => {
          const visible = phase !== "typing" && i < revealCount;
          return (
            <li
              key={`${index}-${i}`}
              className={`flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-3 transition-all duration-300 ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1 opacity-0"
              }`}
              style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-700">
                {i + 1}
              </span>
              <span className="text-sm leading-snug text-ink-700">{item}</span>
            </li>
          );
        })}

        {phase === "typing" &&
          [0, 1, 2, 3].map((i) => (
            <li
              key={`skeleton-${i}`}
              className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3"
            >
              <span className="h-5 w-5 shrink-0 rounded-md bg-ink-100" />
              <span
                className="h-3 flex-1 rounded-full bg-ink-100"
                style={{ width: `${88 - i * 14}%` }}
              />
            </li>
          ))}
      </ul>

      <style>{`
        @keyframes ai-caret-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .ai-caret { animation: ai-caret-blink 1s steps(1, end) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ai-caret { animation: none; }
        }
      `}</style>
    </div>
  );
}
