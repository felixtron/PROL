"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { createCourse } from "@/lib/actions/course";
import { AICourseForm } from "./ai-course-form";

const CATEGORIES = [
  "Desarrollo Personal",
  "Marketing Digital",
  "Diseño",
  "Programación",
  "Negocios",
  "Idiomas",
  "Otro",
];

export default function NewCoursePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAI, setShowAI] = useState(false);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 3) {
      newErrors.title = "El titulo debe tener al menos 3 caracteres.";
    }

    if (description.length > 5000) {
      newErrors.description =
        "La descripcion no puede exceder 5000 caracteres.";
    }

    if (!isFree) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        newErrors.price = "Ingresa un precio valido.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("description", description.trim());
      formData.set("category", category);

      const priceInCents = isFree
        ? 0
        : Math.round(parseFloat(price) * 100);
      formData.set("priceInCents", String(priceInCents));

      const result = await createCourse(formData);

      if (result.success) {
        router.push(`/professor/courses/${result.courseId}/edit`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Ocurrio un error inesperado.";
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/professor/courses"
          className="rounded-lg border border-border bg-surface p-2 text-text-secondary transition-colors hover:bg-surface-tertiary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Crear Nuevo Curso
        </h1>
      </div>

      {/* Creation Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowAI(false)}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            !showAI
              ? "bg-primary-600 text-white"
              : "border border-border bg-surface text-text-secondary hover:bg-surface-tertiary"
          }`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => setShowAI(true)}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            showAI
              ? "bg-violet-600 text-white"
              : "border border-border bg-surface text-text-secondary hover:bg-surface-tertiary"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Crear con IA
        </button>
      </div>

      {showAI ? (
        <AICourseForm onClose={() => setShowAI(false)} />
      ) : (
      /* Form Card */
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        {errors.form && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{errors.form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titulo del Curso */}
          <div>
            <label
              htmlFor="title"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Titulo del Curso <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Introduccion al Marketing Digital"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {errors.title && (
              <p className="mt-1.5 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Descripcion */}
          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Descripcion
            </label>
            <textarea
              id="description"
              rows={4}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe de que trata tu curso..."
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="mt-1.5 flex justify-end">
              <span className="text-xs text-text-tertiary">
                {description.length}/5000
              </span>
            </div>
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label
              htmlFor="category"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Categoria
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Selecciona una categoria</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Curso Gratuito Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isFree}
              onClick={() => {
                setIsFree(!isFree);
                if (!isFree) {
                  setPrice("");
                  setErrors((prev) => {
                    const { price: _, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isFree ? "bg-primary-600" : "bg-surface-tertiary"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  isFree ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <label className="text-sm font-medium text-text-primary">
              Curso Gratuito
            </label>
          </div>

          {/* Precio */}
          <div>
            <label
              htmlFor="price"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Precio (MXN)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">
                $
              </span>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                disabled={isFree}
                value={isFree ? "" : price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-surface py-2.5 pl-8 pr-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {isFree && (
              <p className="mt-1.5 text-xs text-text-tertiary">
                El curso sera gratuito para todos los alumnos.
              </p>
            )}
            {errors.price && (
              <p className="mt-1.5 text-sm text-red-600">{errors.price}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
            <Link
              href="/professor/courses"
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creando..." : "Crear Curso"}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
