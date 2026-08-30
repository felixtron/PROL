"use client";

import { useMemo, useRef, useState } from "react";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { normalize } from "@/lib/normalize";
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  LayoutGrid,
  Laptop,
  LifeBuoy,
  ListChecks,
  Lock,
  Mail,
  PauseCircle,
  Play,
  Search,
  Settings,
  Sparkles,
  Stamp,
  ToggleLeft,
  Upload,
  UserCog,
  Users,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Mapa de iconos por nombre — mismo truco que `sidebar-shell`: las páginas de
// documentación son Server Components y no pueden pasar un componente React
// a través del límite servidor/cliente.
const ICONS = {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  LayoutGrid,
  Laptop,
  LifeBuoy,
  ListChecks,
  Lock,
  Mail,
  PauseCircle,
  Play,
  Settings,
  Sparkles,
  Stamp,
  ToggleLeft,
  Upload,
  UserCog,
  Users,
  Video,
} satisfies Record<string, LucideIcon>;

export type DocsIcon = keyof typeof ICONS;

/** Distintivo de un artículo tocado por los últimos cambios de producto. */
export type DocsBadge = "nuevo" | "actualizado";

export interface DocsCategory {
  id: string;
  label: string;
  icon: DocsIcon;
  /** Una línea que explica de qué va la categoría. */
  summary?: string;
}

export interface DocsArticle {
  /** `id` de la categoría a la que pertenece. */
  category: string;
  title: string;
  description: string;
  steps: string[];
  notes?: string;
  /**
   * Sinónimos y términos que el usuario podría teclear pero que no aparecen
   * en el texto del artículo ("factura", "cobro", "diploma"…).
   */
  keywords?: string[];
  badge?: DocsBadge;
}

interface KnowledgeBaseProps {
  title: string;
  subtitle: string;
  categories: DocsCategory[];
  articles: DocsArticle[];
  supportEmail?: string;
}

function articleKey(article: DocsArticle): string {
  return `${article.category}::${article.title}`;
}

/** Un filtro, independiente de cómo se pinte: píldora u opción del rail. */
interface FilterEntry {
  id: string;
  label: string;
  icon?: DocsIcon;
  count: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const BADGE_STYLES: Record<DocsBadge, string> = {
  nuevo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  actualizado: "bg-amber-50 text-amber-700 ring-amber-200",
};

/**
 * Base de conocimientos de un panel: buscador, filtro por categoría y
 * artículos plegables con sus pasos.
 *
 * Todo el filtrado es en cliente sobre un arreglo estático — son unas decenas
 * de artículos, no hay nada que consultar al servidor y así la búsqueda
 * responde en cada tecla.
 */
export function KnowledgeBase({
  title,
  subtitle,
  categories,
  articles,
  supportEmail = "soporte@prol.prosuite.pro",
}: KnowledgeBaseProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [onlyNews, setOnlyNews] = useState(false);
  // Sólo guarda los artículos que el usuario abrió o cerró a mano; el resto
  // sigue el criterio por defecto (abiertos cuando hay una búsqueda activa).
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});

  // La barra de filtros de móvil se retira al bajar y vuelve al subir, salvo
  // mientras se escribe en el buscador.
  const mobileBarRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const barHidden = useHideOnScroll(mobileBarRef, { disabled: searchFocused });

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // Texto indexado de cada artículo, calculado una sola vez.
  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const article of articles) {
      const category = categoryById.get(article.category);
      map.set(
        articleKey(article),
        normalize(
          [
            article.title,
            article.description,
            article.notes ?? "",
            article.steps.join(" "),
            (article.keywords ?? []).join(" "),
            category?.label ?? "",
            category?.summary ?? "",
          ].join(" "),
        ),
      );
    }
    return map;
  }, [articles, categoryById]);

  const tokens = useMemo(
    () => normalize(query).split(/\s+/).filter(Boolean),
    [query],
  );

  const matchesQuery = useMemo(() => {
    return (article: DocsArticle) => {
      if (tokens.length === 0) return true;
      const haystack = haystacks.get(articleKey(article)) ?? "";
      return tokens.every((token) => haystack.includes(token));
    };
  }, [tokens, haystacks]);

  // Conteos por categoría con la búsqueda aplicada pero sin el filtro de
  // categoría: son los números que se pintan en los propios botones, y tienen
  // que decir cuántos resultados daría pulsarlos.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const article of articles) {
      if (!matchesQuery(article)) continue;
      if (onlyNews && !article.badge) continue;
      map.set(article.category, (map.get(article.category) ?? 0) + 1);
      total += 1;
    }
    return { byCategory: map, total };
  }, [articles, matchesQuery, onlyNews]);

  const newsCount = useMemo(
    () => articles.filter((a) => a.badge && matchesQuery(a)).length,
    [articles, matchesQuery],
  );

  const results = useMemo(() => {
    const visible = articles.filter(
      (article) =>
        matchesQuery(article) &&
        (activeCategory === null || article.category === activeCategory) &&
        (!onlyNews || Boolean(article.badge)),
    );

    // Se agrupa respetando el orden en que se declararon las categorías.
    return categories
      .map((category) => ({
        category,
        items: visible.filter((a) => a.category === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [articles, categories, matchesQuery, activeCategory, onlyNews]);

  const hasFilters = query.trim() !== "" || activeCategory !== null || onlyNews;
  const searching = tokens.length > 0;

  function clearFilters() {
    setQuery("");
    setActiveCategory(null);
    setOnlyNews(false);
    setManualOpen({});
  }

  function toggleArticle(key: string, current: boolean) {
    setManualOpen((prev) => ({ ...prev, [key]: !current }));
  }

  // Una sola descripción de los filtros para las dos presentaciones: fila de
  // píldoras desplazable en móvil y lista vertical en el rail de escritorio.
  const filters: FilterEntry[] = [
    {
      id: "__all__",
      label: "Todo",
      count: counts.total,
      active: activeCategory === null && !onlyNews,
      onClick: () => {
        setActiveCategory(null);
        setOnlyNews(false);
      },
    },
    ...(newsCount > 0
      ? [
          {
            id: "__news__",
            label: "Novedades",
            icon: "Sparkles" as DocsIcon,
            count: newsCount,
            active: onlyNews,
            onClick: () => setOnlyNews((v) => !v),
          },
        ]
      : []),
    ...categories.map((category) => {
      const count = counts.byCategory.get(category.id) ?? 0;
      return {
        id: category.id,
        label: category.label,
        icon: category.icon,
        count,
        disabled: count === 0,
        active: activeCategory === category.id,
        onClick: () =>
          setActiveCategory((prev) =>
            prev === category.id ? null : category.id,
          ),
      };
    }),
  ];

  const resultSummary =
    counts.total === 0
      ? "Sin resultados"
      : `${counts.total} ${counts.total === 1 ? "artículo" : "artículos"}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          {title}
        </h1>
        <p className="mt-1 text-text-secondary">{subtitle}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* ─── Filtros: rail fijo en escritorio ─── */}
        <aside className="hidden lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-2rem)] lg:flex-col lg:gap-3 lg:rounded-xl lg:border lg:border-border lg:bg-surface lg:p-3 lg:shadow-sm">
          <SearchField
            value={query}
            onChange={setQuery}
            onClear={() => setQuery("")}
          />

          {/* El scroll vive aquí: con doce categorías la lista supera el alto
              del rail y no debe estirar la columna. */}
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {filters.map((filter) => (
              <FilterRow key={filter.id} {...filter} />
            ))}
          </div>

          {hasFilters && (
            <div className="shrink-0 border-t border-border pt-2 text-xs text-text-tertiary">
              <p className="px-1">
                {resultSummary}
                {query.trim() !== "" && ` para “${query.trim()}”`}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-1 inline-flex items-center gap-1 rounded-md px-1 py-1 font-medium transition-colors hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar filtros
              </button>
            </div>
          )}
        </aside>

        {/* ─── Filtros: barra que se retira al bajar en móvil y tablet ─── */}
        <div
          ref={mobileBarRef}
          className={`sticky top-0 z-20 bg-surface-secondary pb-3 pt-1 transition-transform duration-200 motion-reduce:transition-none lg:hidden ${
            barHidden ? "-translate-y-[110%]" : "translate-y-0"
          }`}
        >
          <div className="space-y-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
            <SearchField
              value={query}
              onChange={setQuery}
              onClear={() => setQuery("")}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />

            {/* Fila única desplazable: con doce categorías el `flex-wrap`
                anterior envolvía a cinco líneas y se comía media pantalla. */}
            <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filters.map((filter) => (
                <FilterPill key={filter.id} {...filter} />
              ))}
            </div>

            {hasFilters && (
              <div className="flex items-center justify-between gap-3 text-xs text-text-tertiary">
                <span>
                  {resultSummary}
                  {query.trim() !== "" && ` para “${query.trim()}”`}
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors hover:bg-surface-secondary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Resultados ─── */}
        <div className="mt-5 space-y-6 lg:mt-0">
          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
              <LifeBuoy className="mx-auto h-8 w-8 text-text-tertiary" />
              <p className="mt-3 font-heading text-base font-semibold text-text-primary">
                No encontramos nada con esos términos
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">
                Prueba con una palabra más corta o revisa las categorías. Si el
                tema no está cubierto, escríbenos a{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-primary-700 underline hover:no-underline"
                >
                  {supportEmail}
                </a>
                .
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {results.map(({ category, items }) => {
                const CategoryIcon = ICONS[category.icon];
                return (
                  <section key={category.id} className="space-y-3">
                    <div className="flex items-start gap-2 border-b border-border pb-2">
                      <CategoryIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                      <div className="min-w-0">
                        <h2 className="font-heading text-lg font-semibold text-text-primary">
                          {category.label}
                        </h2>
                        {category.summary && (
                          <p className="text-sm text-text-tertiary">
                            {category.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {items.map((article) => {
                        const key = articleKey(article);
                        const open = manualOpen[key] ?? searching;
                        return (
                          <ArticleCard
                            key={key}
                            article={article}
                            open={open}
                            onToggle={() => toggleArticle(key, open)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div className="rounded-xl border border-primary-200 bg-primary-50 p-5">
            <p className="text-sm font-medium text-primary-800">
              ¿No encontraste lo que buscabas? Escribe a{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="underline hover:no-underline"
              >
                {supportEmail}
              </a>{" "}
              y te ayudamos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Buscador. Se usa en las dos presentaciones del filtro. */
function SearchField({
  value,
  onChange,
  onClear,
  onFocus,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <div className="relative shrink-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Buscar por palabra clave…"
        aria-label="Buscar en la documentación"
        className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-9 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Presentación vertical del filtro, para el rail de escritorio. */
function FilterRow({
  active,
  disabled,
  count,
  icon,
  label,
  onClick,
}: FilterEntry) {
  const Icon = icon ? ICONS[icon] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-primary-50 font-medium text-primary-700"
          : disabled
            ? "cursor-not-allowed text-text-tertiary opacity-50"
            : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
      }`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={`shrink-0 rounded-pill px-1.5 text-[10px] font-semibold ${
          active
            ? "bg-primary-600 text-white"
            : "bg-surface-secondary text-text-tertiary"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/** Presentación en píldora, para la fila desplazable de móvil. */
function FilterPill({
  active,
  disabled,
  count,
  icon,
  label,
  onClick,
}: FilterEntry) {
  const Icon = icon ? ICONS[icon] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex shrink-0 snap-start items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? "border-primary-600 bg-primary-600 text-white"
          : disabled
            ? "cursor-not-allowed border-border bg-surface text-text-tertiary opacity-50"
            : "border-border bg-surface text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <span
        className={`rounded-pill px-1.5 text-[10px] font-semibold ${
          active
            ? "bg-white/20 text-white"
            : "bg-surface-secondary text-text-tertiary"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ArticleCard({
  article,
  open,
  onToggle,
}: {
  article: DocsArticle;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface-secondary md:p-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-text-primary">
              {article.title}
            </h3>
            {article.badge && (
              <span
                className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${BADGE_STYLES[article.badge]}`}
              >
                {article.badge}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
            {article.description}
          </p>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-text-tertiary transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-4 md:px-5 md:pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Pasos
          </p>
          <Steps steps={article.steps} />

          {article.notes && (
            <div className="mt-4 rounded-lg bg-surface-secondary px-3 py-2">
              <p className="text-xs leading-relaxed text-text-tertiary">
                <span className="font-semibold">Notas:</span> {article.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pinta los pasos numerados. Un paso que empieza por "-" es un detalle del
 * paso anterior y se pinta como viñeta indentada, sin consumir número.
 */
function Steps({ steps }: { steps: string[] }) {
  let counter = 0;
  return (
    <ol className="mt-2 space-y-1.5">
      {steps.map((step, i) => {
        const trimmed = step.trim();
        const isDetail = trimmed.startsWith("-");
        if (isDetail) {
          return (
            <li key={i} className="ml-7 flex gap-2 text-sm text-text-secondary">
              <span className="text-text-tertiary">•</span>
              <span>{trimmed.replace(/^-\s*/, "")}</span>
            </li>
          );
        }
        counter += 1;
        return (
          <li key={i} className="flex gap-2 text-sm text-text-secondary">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
              {counter}
            </span>
            <span>{trimmed}</span>
          </li>
        );
      })}
    </ol>
  );
}
