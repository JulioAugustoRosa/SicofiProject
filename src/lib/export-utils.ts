import { toLocalISODate } from "@/lib/utils";

export interface ExportTransaction {
  date: string;
  description: string;
  type: "income" | "expense";
  frequency: string;
  amount: number;
}

const FREQUENCY_LABELS: Record<string, string> = {
  once: "Única",
  monthly: "Mensal",
  weekly: "Semanal",
  yearly: "Anual",
};

const escapeCsvField = (value: string): string => {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Filtra transações por intervalo (inclusivo) usando comparação de strings
 * "YYYY-MM-DD" — funciona com a coluna `date` do Supabase (tipo DATE).
 */
export const filterTransactionsByDateRange = <T extends { date: string }>(
  transactions: T[],
  from?: string,
  to?: string,
): T[] => {
  return transactions.filter((t) => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    return true;
  });
};

export const transactionsToCsv = (transactions: ExportTransaction[]): string => {
  const header = ["Data", "Descrição", "Tipo", "Frequência", "Valor"];
  const rows = transactions.map((t) => [
    new Date(`${t.date}T00:00:00`).toLocaleDateString("pt-BR"),
    t.description,
    t.type === "income" ? "Receita" : "Despesa",
    FREQUENCY_LABELS[t.frequency] ?? t.frequency,
    t.amount.toFixed(2).replace(".", ","),
  ]);

  return [header, ...rows]
    .map((row) => row.map((field) => escapeCsvField(String(field))).join(";"))
    .join("\r\n");
};

interface DownloadOptions {
  from?: string;
  to?: string;
  filename?: string;
}

/**
 * Gera um arquivo CSV a partir das transações e dispara o download no navegador.
 * Aceita filtro opcional por intervalo de datas (formato "YYYY-MM-DD").
 */
export const downloadTransactionsCsv = (
  transactions: ExportTransaction[],
  options: DownloadOptions = {},
): void => {
  const filtered = filterTransactionsByDateRange(transactions, options.from, options.to);

  const filename = options.filename ?? buildFilename(options.from, options.to);
  const csv = transactionsToCsv(filtered);
  // BOM para que o Excel reconheça UTF-8 e exiba acentos corretamente.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildFilename = (from?: string, to?: string): string => {
  const today = toLocalISODate();
  if (from && to) return `planilha-financeira-${from}-a-${to}.csv`;
  if (from) return `planilha-financeira-desde-${from}.csv`;
  if (to) return `planilha-financeira-ate-${to}.csv`;
  return `planilha-financeira-${today}.csv`;
};
