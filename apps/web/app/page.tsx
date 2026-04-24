import Link from "next/link";
import {
  PlayCircle,
  Palette,
  CreditCard,
  Award,
  Users,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";

const features = [
  {
    icon: PlayCircle,
    title: "Video Interactivo",
    description:
      "Paradas interactivas, quizzes en tiempo real y seguimiento de progreso para maximizar el aprendizaje.",
  },
  {
    icon: Palette,
    title: "Marca Propia",
    description:
      "Tu dominio, colores, logo. 100% tu marca. Tus alumnos nunca verán la nuestra.",
  },
  {
    icon: CreditCard,
    title: "Pagos Integrados",
    description:
      "Stripe Connect, OXXO, SPEI. Cobra en MXN y recibe pagos automáticamente.",
  },
  {
    icon: Award,
    title: "Certificados",
    description:
      "Genera certificados automáticos personalizados al completar cursos o módulos.",
  },
  {
    icon: Users,
    title: "Sesiones y Talleres",
    description:
      "Sesiones presenciales y virtuales. Gestiona asistentes, horarios y materiales.",
  },
  {
    icon: Sparkles,
    title: "IA Integrada",
    description:
      "Transcripciones automáticas, resúmenes inteligentes y contenido asistido por IA.",
  },
];

const steps = [
  {
    number: "1",
    title: "Crea tu Academia",
    description:
      "Registra tu cuenta, elige tu dominio personalizado y configura tu marca en minutos.",
  },
  {
    number: "2",
    title: "Sube tu Contenido",
    description:
      "Carga videos, crea módulos interactivos, configura quizzes y define tus precios.",
  },
  {
    number: "3",
    title: "Genera Ingresos",
    description:
      "Publica tu academia, atrae estudiantes y cobra automáticamente por cada venta.",
  },
];

const pricingFeatures = [
  "Cursos y módulos ilimitados",
  "Estudiantes ilimitados",
  "Dominio personalizado",
  "Certificados automáticos",
  "Pasarela de pagos integrada",
  "Soporte por correo y chat",
  "Panel de analíticas",
  "IA para transcripciones y resúmenes",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-heading text-2xl font-extrabold text-primary-600">
            PROL
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-text-secondary transition-colors hover:text-primary-600">
              Características
            </a>
            <a href="#pricing" className="text-sm font-medium text-text-secondary transition-colors hover:text-primary-600">
              Precios
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-text-secondary transition-colors hover:text-primary-600">
              Cómo Funciona
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-700"
            >
              Crear Academia
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-surface-secondary">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.12),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-pill bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
              <Sparkles className="h-4 w-4" />
              Sin costos iniciales &mdash; Solo pagas cuando vendes
            </div>

            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Tu Academia Online,{" "}
              <span className="text-primary-600">Lista en Minutos</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-text-secondary sm:text-xl">
              Crea, gestiona y monetiza tus cursos online con PROL. La plataforma
              todo-en-uno para creadores de contenido educativo en Latinoamérica.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-8 py-3.5 text-base font-semibold text-text-inverse shadow-md transition-all hover:bg-primary-700 hover:shadow-lg"
              >
                Comenzar Gratis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-8 py-3.5 text-base font-semibold text-text-primary transition-colors hover:bg-surface-tertiary"
              >
                <PlayCircle className="h-5 w-5" />
                Ver Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="bg-surface py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Todo lo que Necesitas para Enseñar Online
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Herramientas poderosas diseñadas para creadores de contenido educativo.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary-50 p-3 text-primary-600 transition-colors group-hover:bg-primary-100">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-surface-secondary py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Comienza en 3 Simples Pasos
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              De la idea a generar ingresos en menos de un día.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-text-inverse shadow-md">
                  {step.number}
                </div>
                <h3 className="font-heading text-xl font-bold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-surface py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Simple y Transparente
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Sin planes complicados. Empieza gratis y crece con nosotros.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-lg">
            <div className="rounded-2xl border border-primary-200 bg-surface p-8 shadow-lg ring-1 ring-primary-100 sm:p-10">
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
                  Modelo de Comisión
                </p>
                <div className="mt-4 flex items-baseline justify-center gap-2">
                  <span className="font-heading text-5xl font-extrabold text-text-primary">
                    $0
                  </span>
                  <span className="text-lg text-text-secondary">para empezar</span>
                </div>
                <p className="mt-4 text-base text-text-secondary">
                  Solo cobramos{" "}
                  <span className="font-bold text-primary-600">30% de cada venta</span>.
                  Tú te quedas con el 70%.
                </p>
              </div>

              <ul className="mt-8 space-y-4">
                {pricingFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                    <span className="text-sm text-text-primary">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className="mt-10 block w-full rounded-lg bg-primary-600 px-6 py-3.5 text-center text-base font-semibold text-text-inverse shadow-sm transition-colors hover:bg-primary-700"
              >
                Crear mi Academia Gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-950 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-text-inverse sm:text-4xl">
              Empieza a Enseñar Hoy
            </h2>
            <p className="mt-4 text-lg text-primary-200">
              Únete a cientos de creadores que ya monetizan su conocimiento con PROL.
            </p>
            <Link
              href="/sign-up"
              className="mt-10 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-8 py-3.5 text-base font-semibold text-text-primary shadow-md transition-all hover:bg-accent-400 hover:shadow-lg"
            >
              Comenzar Ahora
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-secondary">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" className="font-heading text-2xl font-extrabold text-primary-600">
                PROL
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-secondary">
                La plataforma todo-en-uno para crear, gestionar y monetizar tu academia online.
              </p>
            </div>

            {/* Producto */}
            <div>
              <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-text-primary">
                Producto
              </h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <a href="#features" className="text-sm text-text-secondary transition-colors hover:text-primary-600">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-text-secondary transition-colors hover:text-primary-600">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-sm text-text-secondary transition-colors hover:text-primary-600">
                    Cómo Funciona
                  </a>
                </li>
              </ul>
            </div>

            {/* Compañía */}
            <div>
              <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-text-primary">
                Legal
              </h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <a href="#" className="text-sm text-text-secondary transition-colors hover:text-primary-600">
                    Términos de Servicio
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-text-secondary transition-colors hover:text-primary-600">
                    Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-text-secondary transition-colors hover:text-primary-600">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>

            {/* Soporte */}
            <div>
              <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-text-primary">
                Soporte
              </h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <a href="#" className="text-sm text-text-secondary transition-colors hover:text-primary-600">
                    Centro de Ayuda
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-text-secondary transition-colors hover:text-primary-600">
                    Documentación
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-text-secondary transition-colors hover:text-primary-600">
                    API
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-8 text-center">
            <p className="text-sm text-text-tertiary">
              &copy; {new Date().getFullYear()} PROL. Todos los derechos reservados. Powered by{" "}
              <span className="font-semibold text-text-secondary">ProSuite</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
