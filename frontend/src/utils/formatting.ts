export function formatAmount(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(date: string): string {
  const dateObj = new Date(date);
  if (Number.isNaN(dateObj.getTime())) return date;
  return dateObj.toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function capitalize(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toDateInput(value?: string): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatInputAmount(value: string): string {
  // Remove all non-digit characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    parts.splice(2);
  }
  
  // Ensure two decimal places
  if (parts[1]) {
    parts[1] = parts[1].slice(0, 2);
  }
  
  // Add thousand separators
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return parts.join('.');
}

export function parseInputAmount(value: string): number {
  // Remove all non-digit characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? round2(num) : 0;
}