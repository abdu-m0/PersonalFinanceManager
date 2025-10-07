import { TransactionType } from "../types";

export type CsvRow = {
  [key: string]: string;
};

export function parseTransactionCsv(csv: string, delimiter = ","): CsvRow[] {
  const trimmed = csv.trim();
  if (!trimmed) {
    return [];
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) {
    return [];
  }

  const header = splitCsvLine(lines[0], delimiter).map((h) => normaliseHeader(h));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = splitCsvLine(line, delimiter);
    const row: CsvRow = {};
    header.forEach((key, index) => {
      if (!key) return;
      row[key] = cells[index] !== undefined ? cells[index].trim() : "";
    });
    rows.push(row);
  }

  return rows;
}

export function toTransactionType(value: string | undefined, fallback: TransactionType): TransactionType {
  if (!value) return fallback;
  const normalised = value.toLowerCase();
  if (normalised === "income" || normalised === "expense" || normalised === "transfer") {
    return normalised;
  }
  return fallback;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function normaliseHeader(header: string): string {
  return header.trim().toLowerCase();
}
