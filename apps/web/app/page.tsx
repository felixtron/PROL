import Link from "next/link";
import {
  ArrowRight,
  Smartphone,
  HeartPulse,
  Briefcase,
  GraduationCap,
  Music,
  Factory,
  Layers,
  Sparkles,
  Wifi,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";
import { PhoneMockup } from "../components/landing/phone-mockup";
import { AIPromptTicker } from "../components/landing/ai-prompt-ticker";
import { Reveal } from "../components/landing/reveal";

const PROSUITE_DEMO_URL = "https://prosuite.mx";

const industries = [
  {
    icon: HeartPulse,
    title: "Salud",
    body: "Protocolos clínicos, capacitación en bioseguridad y educación a pacientes — con video, evaluación y certificado.",
    span: "lg:col-span-3 lg:row-span-2",
    accent: true,
  },
  {
    icon: Briefcase,
    title: "Corporativo",
    body: "Onboarding, compliance y cultura. Misma marca, distintos equipos.",
    span: "lg:col-span-3",
  },
  {
    icon: GraduationCap,
    title: "Entrenamientos internos",
    body: "Capacita personal nuevo y haz seguimiento de quién completó qué.",
    span: "lg:col-span-3",
  },
  {
    icon: Music,
    title: "Músicos y creativos",
    body: "Lecciones con audio, video y ejercicios prácticos — vendibles a tu audiencia o en privado.",
    span: "lg:col-span-2",
  },
  {
    icon: Factory,
    title: "Manufactura",
    body: "Procedimientos operativos, seguridad industrial y certificaciones por planta.",
    span: "lg:col-span-2",
  },
  {
    icon: Layers,
    title: "Tu vertical",
    body: "Si enseñas algo y tienes audiencia o equipo, PROL se adapta.",
    span: "lg:col-span-2",
  },
];

const mobileFeatures = [
  {
    icon: Smartphone,
    title: "Diseñado para el celular",
    body: "Cada pantalla optimizada para una mano, en el metro, en la planta, en la sala de espera.",
  },
  {
    icon: Wifi,
    title: "Aprende donde estés",
    body: "Sigue desde el celular, retoma en la laptop. El progreso se sincroniza solo.",
  },
  {
    icon: CalendarCheck,
    title: "A su ritmo",
    body: "Lecciones cortas, quizzes rápidos y recordatorios. Cero fricción para empezar.",
  },
];

export default function Home() {
  return (
    <div
      className="min-h-screen bg-[--surface] font-body text-[--ink-900]"
      style={
        {
          "--ink-950": "#0a0a0a",
          "--ink-900": "#18181b",
          "--ink-800": "#27272a",
          "--ink-700": "#3f3f46",
          "--ink-600": "#52525b",
          "--ink-500": "#71717a",
          "--ink-400": "#a1a1aa",
          "--ink-300": "#d4d4d8",
          "--ink-200": "#e4e4e7",
          "--ink-100": "#f4f4f5",
          "--ink-50": "#fafafa",
          "--brand-700": "#047857",
          "--brand-600": "#059669",
          "--brand-500": "#10b981",
          "--brand-100": "#d1fae5",
          "--brand-50": "#ecfdf5",
          "--surface": "#fafafa",
          "--surface-2": "#f4f4f5",
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[--ink-200]/70 bg-[--surface]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-heading text-2xl font-extrabold tracking-tight text-[--ink-900]"
          >
            PROL
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#mobile"
              className="text-sm font-medium text-[--ink-600] transition-colors hover:text-[--ink-900]"
            >
              Mobile first
            </a>
            <a
              href="#industrias"
              className="text-sm font-medium text-[--ink-600] transition-colors hover:text-[--ink-900]"
            >
              Para tu industria
            </a>
            <a
              href="#ia"
              className="text-sm font-medium text-[--ink-600] transition-colors hover:text-[--ink-900]"
            >
              IA integrada
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[--ink-700] transition-colors hover:bg-[--surface-2] hover:text-[--ink-900] sm:inline-flex"
            >
              Iniciar sesión
            </Link>
            <a
              href={PROSUITE_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-1.5 rounded-lg bg-[--ink-900] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[--ink-800]"
            >
              Agendar demo
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px]"
          style={{
            background:
              "radial-gradient(60% 40% at 80% 0%, rgba(5,150,105,0.08), transparent 70%), radial-gradient(50% 35% at 10% 10%, rgba(15,15,20,0.04), transparent 70%)",
          }}
        />

        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="lg:col-span-7 lg:pt-6">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[--ink-200] bg-white px-3 py-1 text-xs font-medium text-[--ink-700]">
                <span className="h-1.5 w-1.5 rounded-full bg-[--brand-500]" />
                LMS multi-marca · ProSuite
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 font-heading text-[2.6rem] font-extrabold leading-[1.02] tracking-tight text-[--ink-900] sm:text-6xl lg:text-[4.25rem]">
                Enseña lo que sabes.
                <br />
                <span className="text-[--ink-500]">En cualquier lugar.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[--ink-600] sm:text-xl">
                PROL convierte tu conocimiento en un curso que se ve perfecto en el
                celular de tus alumnos — y la IA te ayuda a armarlo desde cero, aunque
                sea tu primera vez.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <a
                  href={PROSUITE_DEMO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-flex items-center gap-2 rounded-xl bg-[--brand-600] px-6 py-3.5 text-base font-semibold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.55)] transition-colors hover:bg-[--brand-700]"
                >
                  Agendar demo con ProSuite
                  <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
                </a>
                <a
                  href="#mobile"
                  className="press inline-flex items-center gap-2 rounded-xl border border-[--ink-200] bg-white px-5 py-3.5 text-base font-medium text-[--ink-800] transition-colors hover:bg-[--surface-2]"
                >
                  Ver cómo funciona
                </a>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <ul className="mt-10 grid grid-cols-1 gap-2 text-sm text-[--ink-600] sm:grid-cols-3 sm:gap-x-6">
                {[
                  "Sin instalación",
                  "Sin equipos de TI",
                  "Tu marca, tu dominio",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[--brand-600]" strokeWidth={2} />
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="relative lg:col-span-5 lg:pt-4">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* Mobile First */}
      <section id="mobile" className="border-y border-[--ink-200]/70 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-28">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[--brand-700]">
                Mobile first, no mobile-friendly
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-[--ink-900] sm:text-4xl lg:text-5xl">
                Tus alumnos aprenden donde tienen tiempo.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[--ink-600]">
                Pensamos cada lección para una pantalla de celular: micro-clases de 4 a
                10 minutos, video vertical opcional, quizzes táctiles y progreso
                visible. Si tus alumnos pueden abrir Instagram, pueden estudiar.
              </p>
            </Reveal>

            <ul className="mt-10 space-y-6">
              {mobileFeatures.map((f, i) => (
                <Reveal key={f.title} as="li" delay={180 + i * 60}>
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[--ink-100] text-[--ink-900]">
                      <f.icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-heading text-base font-semibold text-[--ink-900]">
                        {f.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-[--ink-600]">
                        {f.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className="relative lg:col-span-7">
            <Reveal delay={120} className="block">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-7">
                  <div className="relative h-full overflow-hidden rounded-3xl border border-[--ink-200] bg-gradient-to-br from-[--ink-50] to-white p-6 sm:p-8">
                    <p className="text-xs font-medium uppercase tracking-wider text-[--ink-500]">
                      Lección de hoy
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-bold text-[--ink-900]">
                      Lavado quirúrgico — técnica de 6 pasos
                    </h3>
                    <p className="mt-1 text-sm text-[--ink-600]">
                      Hospital ABC · Enfermería · Módulo 3
                    </p>

                    <div className="mt-6 space-y-2">
                      {[
                        { label: "Video demostrativo", time: "4:12", done: true },
                        { label: "Práctica guiada", time: "6:30", done: true },
                        { label: "Quiz: 5 preguntas", time: "2 min", done: false },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between rounded-xl border border-[--ink-200] bg-white px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                                row.done
                                  ? "bg-[--brand-600] text-white"
                                  : "border border-[--ink-300] text-[--ink-400]"
                              }`}
                            >
                              {row.done && (
                                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                              )}
                            </span>
                            <span className="text-sm font-medium text-[--ink-800]">
                              {row.label}
                            </span>
                          </div>
                          <span className="font-mono text-xs text-[--ink-500]">
                            {row.time}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <p className="text-xs text-[--ink-500]">Progreso del módulo</p>
                      <p className="font-mono text-xs font-semibold text-[--ink-800]">
                        67%
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[--ink-200]">
                      <div className="h-full w-[67%] rounded-full bg-[--brand-600]" />
                    </div>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-5">
                  <div className="grid h-full gap-4">
                    <div className="rounded-3xl border border-[--ink-200] bg-[--ink-950] p-6 text-white">
                      <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                        Recordatorio
                      </p>
                      <p className="mt-3 font-heading text-lg font-semibold leading-snug">
                        Quiz pendiente, te toma 2 minutos.
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-[--brand-500]" />
                        Notificación enviada hoy 7:42
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[--ink-200] bg-white p-6">
                      <p className="text-xs font-medium uppercase tracking-wider text-[--ink-500]">
                        Streak
                      </p>
                      <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-[--ink-900]">
                        12 <span className="text-base font-medium text-[--ink-500]">días</span>
                      </p>
                      <div className="mt-4 flex gap-1">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <span
                            key={i}
                            className={`h-6 flex-1 rounded-md ${
                              i < 5 ? "bg-[--brand-500]" : "bg-[--ink-200]"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Industries Bento */}
      <section id="industrias" className="bg-[--surface]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[--brand-700]">
                  Para cualquier industria
                </p>
              </Reveal>
              <Reveal delay={60}>
                <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-[--ink-900] sm:text-4xl lg:text-5xl">
                  Si lo enseñas, lo enseñas en PROL.
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-5 max-w-md text-base leading-relaxed text-[--ink-600]">
                  Una sola plataforma para hospitales, fábricas, equipos comerciales y
                  artistas independientes. Misma facilidad — distinto contenido.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="mt-12 grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-4 sm:grid-cols-6">
            {industries.map((it, i) => (
              <Reveal
                key={it.title}
                delay={i * 70}
                className={`group relative overflow-hidden rounded-3xl border p-7 transition-colors sm:col-span-3 ${it.span ?? ""} ${
                  it.accent
                    ? "border-[--ink-900] bg-[--ink-950] text-white"
                    : "border-[--ink-200] bg-white text-[--ink-900] hover:border-[--ink-300]"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    it.accent
                      ? "bg-white/10 text-[--brand-500]"
                      : "bg-[--ink-100] text-[--ink-900]"
                  }`}
                >
                  <it.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>

                <h3
                  className={`mt-6 font-heading text-xl font-bold tracking-tight ${
                    it.accent ? "text-white" : "text-[--ink-900]"
                  }`}
                >
                  {it.title}
                </h3>
                <p
                  className={`mt-2 max-w-md text-sm leading-relaxed ${
                    it.accent ? "text-white/70" : "text-[--ink-600]"
                  }`}
                >
                  {it.body}
                </p>

                {it.accent && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full opacity-50 blur-3xl"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(16,185,129,0.45), transparent 70%)",
                    }}
                  />
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* AI + Accessibility */}
      <section id="ia" className="border-y border-[--ink-200]/70 bg-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-28">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[--brand-700]">
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px" />
                IA integrada
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-[--ink-900] sm:text-4xl lg:text-5xl">
                ¿Primera vez armando un curso?
                <br />
                <span className="text-[--ink-500]">No importa.</span>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[--ink-600]">
                Describe el tema en una línea. La IA propone la estructura, redacta los
                guiones, sugiere quizzes y transcribe automáticamente tus videos. Tú
                editas, refinas y publicas.
              </p>
            </Reveal>

            <ul className="mt-8 space-y-4">
              {[
                "Outlines completos a partir de un párrafo",
                "Transcripción automática de videos largos",
                "Sugerencias de quizzes basadas en el contenido",
                "Reescribe en lenguaje sencillo o técnico",
              ].map((item, i) => (
                <Reveal key={item} as="li" delay={180 + i * 50}>
                  <div className="flex items-start gap-3 text-sm text-[--ink-700]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[--brand-600]" strokeWidth={2} />
                    <span>{item}</span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={140}>
              <AIPromptTicker />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[--ink-950] text-white">
        <div className="relative mx-auto max-w-7xl overflow-hidden px-4 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0"
            style={{
              background:
                "radial-gradient(40% 60% at 80% 100%, rgba(16,185,129,0.18), transparent 70%), radial-gradient(40% 50% at 0% 0%, rgba(255,255,255,0.04), transparent 70%)",
            }}
          />
          <div className="relative grid items-end gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[--brand-500]">
                  Empieza esta semana
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-4 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[4rem]">
                  30 minutos con ProSuite y tienes tu primera academia lista.
                </h2>
              </Reveal>
              <Reveal delay={140}>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
                  Te mostramos PROL en vivo con un caso parecido al tuyo. Sales con un
                  plan concreto y, si te late, con tu primer curso ya esbozado.
                </p>
              </Reveal>
            </div>

            <div className="lg:col-span-5 lg:justify-self-end">
              <Reveal delay={200}>
                <div className="flex flex-col gap-3">
                  <a
                    href={PROSUITE_DEMO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press inline-flex items-center justify-center gap-2 rounded-xl bg-[--brand-500] px-7 py-4 text-base font-semibold text-[--ink-950] transition-colors hover:bg-[--brand-100]"
                  >
                    Agendar demo con ProSuite
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </a>
                  <p className="text-center text-xs text-white/50">
                    Te respondemos el mismo día hábil.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[--ink-200]/70 bg-[--surface]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="font-heading text-lg font-extrabold tracking-tight text-[--ink-900]">
              PROL
            </span>
            <span className="text-xs text-[--ink-500]">
              · Powered by{" "}
              <a
                href={PROSUITE_DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[--ink-700] hover:text-[--ink-900]"
              >
                ProSuite
              </a>
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-[--ink-600]">
            <Link href="/sign-in" className="hover:text-[--ink-900]">
              Iniciar sesión
            </Link>
            <a
              href={PROSUITE_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[--ink-900]"
            >
              Contacto
            </a>
            <span className="text-[--ink-400]">
              © {new Date().getFullYear()} PROL
            </span>
          </div>
        </div>
      </footer>

      {/* Press feedback (Emil: scale on :active for tactile feedback) */}
      <style>{`
        .press {
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
                      background-color 160ms ease,
                      color 160ms ease,
                      box-shadow 160ms ease;
        }
        .press:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
