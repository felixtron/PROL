"use client";

import { Play, BookOpen, Check } from "lucide-react";

const lessons = [
  { title: "1. Bienvenida", duration: "2:14", done: true },
  { title: "2. Conceptos clave", duration: "8:42", done: true },
  { title: "3. Caso práctico", duration: "12:08", done: false, active: true },
  { title: "4. Quiz del módulo", duration: "5 preguntas", done: false },
];

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[360px]">
      <div
        aria-hidden
        className="absolute -inset-12 -z-10 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(5,150,105,0.10), transparent 70%)",
        }}
      />

      <div className="phone-float relative rounded-[2.75rem] border border-white/40 bg-zinc-950 p-2 shadow-[0_30px_80px_-30px_rgba(15,15,20,0.45)]">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-white">
          <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-zinc-950" />

          <div className="px-4 pb-4 pt-9">
            <div className="flex items-center justify-between text-[10px] font-medium text-zinc-400">
              <span>Lección 3 de 8</span>
              <span className="flex items-center gap-1">
                <span className="phone-pulse h-1.5 w-1.5 rounded-full bg-emerald-500" />
                EN VIVO
              </span>
            </div>

            <h3 className="mt-2 font-heading text-[15px] font-bold leading-tight text-zinc-900">
              Manejo seguro de equipos
            </h3>
            <p className="text-[11px] text-zinc-500">Curso ISO 45001 · Módulo 2</p>

            <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700">
              <div
                aria-hidden
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 30%, rgba(5,150,105,0.35), transparent 60%)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-zinc-900 shadow-lg transition-transform active:scale-95"
                >
                  <Play className="h-5 w-5 translate-x-[1px] fill-current" />
                </button>
              </div>

              <div className="absolute inset-x-3 bottom-3">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
                  <div className="phone-progress h-full rounded-full bg-emerald-400" />
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-white/80">
                  <span>04:21</span>
                  <span>12:08</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {lessons.map((l) => (
                <div
                  key={l.title}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors ${
                    l.active
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-zinc-100 bg-white"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      l.done
                        ? "bg-emerald-600 text-white"
                        : l.active
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {l.done ? (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    ) : (
                      <BookOpen className="h-3 w-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[11px] font-semibold ${
                        l.active ? "text-zinc-900" : "text-zinc-700"
                      }`}
                    >
                      {l.title}
                    </p>
                    <p className="text-[9px] text-zinc-400">{l.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes phone-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .phone-float {
          animation: phone-float 7s cubic-bezier(0.45, 0, 0.55, 1) infinite;
          will-change: transform;
        }
        @keyframes phone-progress {
          0%   { width: 0%; }
          70%  { width: 36%; }
          100% { width: 36%; }
        }
        .phone-progress {
          animation: phone-progress 4.5s cubic-bezier(0.23, 1, 0.32, 1) infinite;
        }
        @keyframes phone-pulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.4); }
        }
        .phone-pulse {
          animation: phone-pulse 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .phone-float, .phone-progress, .phone-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}
