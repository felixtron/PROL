/**
 * Minúsculas y sin acentos, para que "consultoria" encuentre "Consultoría"
 * y "lopez" encuentre "López".
 */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
