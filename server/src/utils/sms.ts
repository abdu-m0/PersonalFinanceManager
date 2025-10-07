import { CurrencyCode, Transaction } from "../types";

export type ParsedSmsResult = {
  accountLabel: string;
  date: string;
  currency: CurrencyCode;
  amount: number;
  merchant: string;
  referenceNo: string;
  approvalCode: string;
};

const SMS_REGEX = /Transaction from\s+(\w+)\s+on\s+(\d{2})\/(\d{2})\/(\d{2})\s+at\s+(\d{2}):(\d{2}):(\d{2})\s+for\s+([A-Z]{3})([\d,.]+)\s+at\s+([^.]*)\.\s*Reference No:\s*(\w+),\s*Approval Code:\s*(\w+)/i;

export function parseBankSms(message: string): ParsedSmsResult {
  const match = message.match(SMS_REGEX);
  if (!match) {
    throw new Error("Unable to parse SMS message");
  }

  const [_, accountLabel, day, month, year, hour, minute, second, currency, amtStr, merchant, referenceNo, approvalCode] = match;
  const amount = Number(amtStr.replace(/,/g, ""));
  const date = toIsoDate(day, month, year, hour, minute, second);

  return {
    accountLabel,
    date,
    currency,
    amount,
    merchant: merchant.trim(),
    referenceNo,
    approvalCode
  };
}

function toIsoDate(day: string, month: string, year: string, hour: string, minute: string, second: string): string {
  const fullYear = Number(year) + 2000;
  const date = new Date(Date.UTC(fullYear, Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  return date.toISOString();
}

export function buildTransactionFromSms(parsed: ParsedSmsResult, overrides: Partial<Transaction>): Omit<Transaction, "id"> {
  const status = overrides.status ?? "posted";
  const base: Omit<Transaction, "id"> = {
    type: "expense",
    date: parsed.date,
    amount: parsed.amount,
    currency: parsed.currency,
    status,
    merchant: parsed.merchant,
    description: `Card purchase at ${parsed.merchant}`,
    referenceNo: parsed.referenceNo,
    approvalCode: parsed.approvalCode,
    source: "sms"
  };

  return { ...base, ...overrides, status };
}
