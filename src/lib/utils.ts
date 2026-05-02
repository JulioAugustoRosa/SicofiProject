import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte uma Date para "YYYY-MM-DD" no fuso LOCAL do usuário.
 *
 * Diferente de `date.toISOString().split("T")[0]`, que usa UTC e pode
 * "pular" um dia para usuários em fusos negativos (ex: BRT/UTC-3) quando
 * a hora local está entre ~21h e 23h59. Use esta função sempre que for
 * gravar/filtrar a coluna `date` (tipo DATE) no banco para garantir
 * consistência entre inserção e leitura.
 */
export function toLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
