"use client";

import { Play, Bookmark, FileText, ListChecks, ChevronRight } from "lucide-react";

const upcoming = [
  { title: "Quiz: 5 preguntas", meta: "2 min", icon: ListChecks },
  { title: "Caso clínico real", meta: "8:14", icon: FileText },
];

const captionFrames = [
  "…la presión correcta es de 4 a 6 kPa…",
  "…revisa el sello antes de cerrar la válvula…",
  "…si la lectura sube, detén el procedimiento…",
  "…documenta el incidente en el formato F-204…",
];

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px]">
      {/* Soft halo */}
      <div
        aria-hidden
        className="absolute -inset-16 -z-10 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(5,150,105,0.12), transparent 70%)",
        }}
      />

      {/* Floating notification chip */}
      <div className="phone-toast pointer-events-none absolute -top-3 right-4 z-20 hidden items-center gap-2 rounded-full bg-ink-950 px-3 py-1.5 text-[11px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] sm:flex">
        <span className="phone-pulse h-1.5 w-1.5 rounded-full bg-brand-500" />
        Marina terminó el quiz
      </div>

      {/* Phone frame */}
      <div className="phone-float relative rounded-[2.75rem] border border-white/30 bg-ink-950 p-[10px] shadow-[0_40px_80px_-30px_rgba(15,15,20,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Side button hints */}
        <span aria-hidden className="absolute left-[-2px] top-24 h-10 w-[3px] rounded-r-full bg-ink-800" />
        <span aria-hidden className="absolute left-[-2px] top-40 h-16 w-[3px] rounded-r-full bg-ink-800" />
        <span aria-hidden className="absolute right-[-2px] top-32 h-20 w-[3px] rounded-l-full bg-ink-800" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[2.25rem] bg-white">
          {/* Status bar */}
          <div className="relative flex items-center justify-between px-6 pt-3 text-[10px] font-semibold text-ink-900">
            <span className="font-mono tabular-nums">9:41</span>
            <div className="flex items-center gap-1">
              {/* signal */}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden>
                <rect x="0" y="6" width="2" height="4" rx="0.5" fill="currentColor" />
                <rect x="3.5" y="4" width="2" height="6" rx="0.5" fill="currentColor" />
                <rect x="7" y="2" width="2" height="8" rx="0.5" fill="currentColor" />
                <rect x="10.5" y="0" width="2" height="10" rx="0.5" fill="currentColor" />
              </svg>
              {/* wifi */}
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden>
                <path d="M6.5 9.5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
                <path d="M3.5 6.2c1.66-1.6 4.34-1.6 6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M1 3.7c3.04-2.93 7.96-2.93 11 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {/* battery */}
              <div className="ml-0.5 flex items-center">
                <div className="relative h-[10px] w-[22px] rounded-[3px] border border-current">
                  <div className="absolute inset-[1.5px] w-[16px] rounded-[1px] bg-current" />
                </div>
                <span className="ml-px h-[5px] w-[1.5px] rounded-r-sm bg-current" />
              </div>
            </div>
          </div>

          {/* Dynamic island */}
          <div
            aria-hidden
            className="absolute left-1/2 top-2.5 h-7 w-[110px] -translate-x-1/2 rounded-full bg-ink-950"
          />

          {/* Body */}
          <div className="px-5 pb-5 pt-4">
            {/* Course header */}
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-300 to-rose-300">
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink-900">
                  MR
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-ink-900">
                  Dra. Mariana Robledo
                </p>
                <p className="truncate text-[10px] text-ink-500">
                  Bioseguridad — Hospital Ángeles
                </p>
              </div>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-ink-700"
              >
                <Bookmark className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[10px] text-ink-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                <span className="phone-pulse h-1 w-1 rounded-full bg-brand-500" />
                Lección 3 de 8
              </span>
              <span className="text-ink-300">·</span>
              <span>Módulo 2 · 14 min</span>
            </div>

            {/* Video card */}
            <div className="relative mt-3 aspect-[16/10] overflow-hidden rounded-2xl bg-ink-900">
              {/* abstract scene */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(60% 60% at 30% 30%, rgba(16,185,129,0.4), transparent 60%), radial-gradient(40% 40% at 80% 80%, rgba(244,63,94,0.18), transparent 70%), linear-gradient(135deg, #18181b 0%, #27272a 100%)",
                }}
              />
              {/* faux subject silhouette */}
              <div
                aria-hidden
                className="absolute bottom-0 left-1/2 h-3/5 w-1/2 -translate-x-1/2 rounded-t-[40%] bg-ink-950/60 blur-[1px]"
              />

              {/* Live caption */}
              <div className="absolute inset-x-3 top-3">
                <div className="phone-caption inline-flex max-w-full items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                  <span className="truncate">{captionFrames[0]}</span>
                </div>
              </div>

              {/* Center play */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-ink-900 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.45)]"
                >
                  <Play className="h-5 w-5 translate-x-[1px] fill-current" />
                </button>
              </div>

              {/* Scrubber */}
              <div className="absolute inset-x-3 bottom-3">
                <div className="relative h-1 w-full rounded-full bg-white/20">
                  <div className="phone-progress relative h-full rounded-full bg-brand-400">
                    <span
                      aria-hidden
                      className="absolute right-[-5px] top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
                    />
                  </div>
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[9px] tabular-nums text-white/80">
                  <span className="phone-time">04:21</span>
                  <span>12:08</span>
                </div>
              </div>
            </div>

            {/* Hidden captions for cycling */}
            <div className="sr-only">
              {captionFrames.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>

            {/* Now playing block */}
            <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50/60 p-3">
              <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-ink-500">
                <span>Reproduciendo</span>
                <span className="font-mono tabular-nums text-ink-700">36% visto</span>
              </div>
              <p className="mt-1.5 text-[13px] font-semibold leading-snug text-ink-900">
                Manejo seguro de instrumental contaminado
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-200">
                <div className="phone-progress-inline h-full rounded-full bg-ink-900" />
              </div>
            </div>

            {/* Up next */}
            <div className="mt-3 space-y-2">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                A continuación
              </p>
              {upcoming.map((u) => (
                <div
                  key={u.title}
                  className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                    <u.icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-ink-900">
                      {u.title}
                    </p>
                    <p className="text-[9px] text-ink-500">{u.meta}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-ink-400" />
                </div>
              ))}
            </div>

            {/* Home indicator */}
            <div aria-hidden className="mx-auto mt-4 h-[3px] w-[110px] rounded-full bg-ink-900/85" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes phone-float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50%      { transform: translate3d(0, -6px, 0); }
        }
        .phone-float {
          animation: phone-float 7s cubic-bezier(0.45, 0, 0.55, 1) infinite;
          will-change: transform;
        }

        @keyframes phone-progress {
          0%   { transform: scaleX(0.05); }
          70%  { transform: scaleX(0.36); }
          100% { transform: scaleX(0.36); }
        }
        .phone-progress {
          width: 100%;
          transform-origin: left center;
          animation: phone-progress 5s cubic-bezier(0.23, 1, 0.32, 1) infinite;
        }

        @keyframes phone-progress-inline {
          0%, 5%   { transform: scaleX(0.04); }
          60%, 70% { transform: scaleX(0.36); }
          95%, 100% { transform: scaleX(0.36); }
        }
        .phone-progress-inline {
          width: 100%;
          transform-origin: left center;
          animation: phone-progress-inline 5s cubic-bezier(0.23, 1, 0.32, 1) infinite;
        }

        @keyframes phone-pulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.5); }
        }
        .phone-pulse { animation: phone-pulse 1.8s ease-in-out infinite; }

        @keyframes phone-caption-cycle {
          0%, 22%  { opacity: 1; transform: translateY(0); }
          25%, 27% { opacity: 0; transform: translateY(-4px); }
          30%, 100% { opacity: 1; transform: translateY(0); }
        }
        .phone-caption {
          animation: phone-caption-cycle 9s ease-in-out infinite;
        }

        @keyframes phone-toast {
          0%, 8%    { opacity: 0; transform: translateY(-6px) scale(0.96); }
          15%, 35%  { opacity: 1; transform: translateY(0) scale(1); }
          45%, 100% { opacity: 0; transform: translateY(-6px) scale(0.96); }
        }
        .phone-toast { animation: phone-toast 8s cubic-bezier(0.23, 1, 0.32, 1) infinite; }

        @media (prefers-reduced-motion: reduce) {
          .phone-float,
          .phone-progress,
          .phone-progress-inline,
          .phone-pulse,
          .phone-caption,
          .phone-toast {
            animation: none;
          }
          .phone-progress, .phone-progress-inline { transform: scaleX(0.36); }
        }
      `}</style>
    </div>
  );
}
