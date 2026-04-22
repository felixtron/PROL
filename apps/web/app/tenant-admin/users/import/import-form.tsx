"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { bulkImportUsers } from "@/lib/actions/tenant-users";

interface CsvRow {
  email: string;
  name: string;
  role?: string;
  companyName?: string;
}

interface RowStatus {
  row: number;
  email?: string;
  reason: string;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: RowStatus[];
}

const VALID_ROLES = new Set(["STUDENT", "PROFESSOR", "ADMIN"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ROWS = 500;

export function ImportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [previewErrors, setPreviewErrors] = useState<RowStatus[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (!headers.includes("email") || !headers.includes("name")) {
          setError(
            "El CSV debe contener al menos las columnas 'email' y 'name' en la primera fila."
          );
          setRows([]);
          return;
        }

        const parsed: CsvRow[] = [];
        const errors: RowStatus[] = [];

        results.data.slice(0, MAX_ROWS + 1).forEach((r, i) => {
          const rowNum = i + 2;
          const email = (r.email ?? "").trim().toLowerCase();
          const name = (r.name ?? "").trim();
          const role = (r.role ?? "").trim().toUpperCase();
          const companyName = (r.companyname ?? r["company name"] ?? "").trim();

          if (!email || !EMAIL_RE.test(email)) {
            errors.push({ row: rowNum, email, reason: "Email inválido" });
            return;
          }
          if (!name || name.length < 2) {
            errors.push({ row: rowNum, email, reason: "Nombre inválido" });
            return;
          }
          if (role && !VALID_ROLES.has(role)) {
            errors.push({
              row: rowNum,
              email,
              reason: `Rol inválido: ${role}`,
            });
            return;
          }

          parsed.push({
            email,
            name,
            role: role || "STUDENT",
            companyName: companyName || undefined,
          });
        });

        if (results.data.length > MAX_ROWS) {
          setError(`El archivo tiene ${results.data.length} filas. Límite: ${MAX_ROWS}. Divide el archivo.`);
          setRows([]);
          setPreviewErrors([]);
          return;
        }

        // Check duplicates within the CSV itself
        const seen = new Set<string>();
        const uniqueRows: CsvRow[] = [];
        parsed.forEach((r, i) => {
          if (seen.has(r.email)) {
            errors.push({ row: i + 2, email: r.email, reason: "Duplicado en el CSV" });
            return;
          }
          seen.add(r.email);
          uniqueRows.push(r);
        });

        setRows(uniqueRows);
        setPreviewErrors(errors);
      },
      error: (err) => {
        setError(`Error al leer el CSV: ${err.message}`);
      },
    });
  }

  function handleImport() {
    if (rows.length === 0) {
      setError("No hay filas válidas para importar.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const r = await bulkImportUsers(rows);
        setResult(r);
        if (r.created > 0) {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error durante la importación");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File input */}
      <div className="rounded-xl border border-dashed border-border bg-surface p-6">
        <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="hidden"
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50">
            <Upload className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {fileName ? fileName : "Selecciona un archivo CSV"}
            </p>
            <p className="text-xs text-text-tertiary">Max {MAX_ROWS} filas por archivo</p>
          </div>
        </label>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div>
              <h3 className="font-heading text-base font-semibold text-text-primary">
                Vista previa
              </h3>
              <p className="text-xs text-text-tertiary">
                {rows.length} filas válidas
                {previewErrors.length > 0 &&
                  ` · ${previewErrors.length} filas con errores (se omitirán)`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Importando..." : `Importar ${rows.length} usuarios`}
            </button>
          </div>

          <div className="max-h-80 overflow-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-text-tertiary">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-text-tertiary">
                    Nombre
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-text-tertiary">
                    Rol
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-text-tertiary">
                    Empresa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-text-primary">{r.email}</td>
                    <td className="px-4 py-2 text-text-primary">{r.name}</td>
                    <td className="px-4 py-2 text-text-tertiary">{r.role}</td>
                    <td className="px-4 py-2 text-text-tertiary">
                      {r.companyName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && (
              <p className="px-4 py-2 text-center text-xs text-text-tertiary">
                ...y {rows.length - 50} filas mas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Preview errors */}
      {previewErrors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50">
          <div className="border-b border-amber-200 px-5 py-3">
            <h3 className="font-heading text-sm font-semibold text-amber-900">
              Filas que se omitirán ({previewErrors.length})
            </h3>
          </div>
          <div className="max-h-48 overflow-auto">
            <ul className="divide-y divide-amber-200 text-sm">
              {previewErrors.slice(0, 20).map((e, i) => (
                <li key={i} className="px-5 py-2 text-amber-800">
                  Fila {e.row} · {e.email ?? "—"} · {e.reason}
                </li>
              ))}
            </ul>
            {previewErrors.length > 20 && (
              <p className="px-5 py-2 text-xs text-amber-700">
                ...y {previewErrors.length - 20} errores mas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            {result.created > 0 ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-600" />
            )}
            <div>
              <h3 className="font-heading text-base font-semibold text-text-primary">
                Importación completada
              </h3>
              <p className="text-sm text-text-secondary">
                {result.created} creados · {result.skipped} omitidos · {result.errors.length} errores
              </p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-48 overflow-auto">
              <ul className="divide-y divide-border text-sm">
                {result.errors.map((e, i) => (
                  <li key={i} className="px-5 py-2 text-text-secondary">
                    <FileText className="mr-1 inline h-3 w-3 text-amber-600" />
                    Fila {e.row} · {e.email ?? "—"} · {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
