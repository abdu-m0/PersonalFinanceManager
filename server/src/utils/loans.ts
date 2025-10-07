import { AmortizationEntry } from "../types";

export function buildAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDateIso: string
): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = [];
  if (principal <= 0 || termMonths <= 0) {
    return schedule;
  }

  const monthlyRate = annualRate > 0 ? annualRate / 100 / 12 : 0;
  const payment = calculateMonthlyPayment(principal, monthlyRate, termMonths);
  const startDate = new Date(startDateIso);
  let balance = principal;

  for (let period = 1; period <= termMonths; period += 1) {
    const interest = monthlyRate > 0 ? Number((balance * monthlyRate).toFixed(2)) : 0;
    let principalPortion = Number((payment - interest).toFixed(2));
    if (monthlyRate === 0) {
      principalPortion = Number((principal / termMonths).toFixed(2));
    }

    if (principalPortion > balance) {
      principalPortion = balance;
    }

    balance = Number((balance - principalPortion).toFixed(2));

    const dueDate = addMonths(startDate, period - 1);

    schedule.push({
      period,
      dueDate: dueDate.toISOString(),
      interest,
      principal: principalPortion,
      balance: balance < 0.01 ? 0 : balance
    });
  }

  if (schedule.length) {
    schedule[schedule.length - 1].balance = 0;
  }

  return schedule;
}

function calculateMonthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
  if (monthlyRate === 0) {
    return Number((principal / termMonths).toFixed(2));
  }
  const numerator = principal * monthlyRate * (1 + monthlyRate) ** termMonths;
  const denominator = (1 + monthlyRate) ** termMonths - 1;
  return Number((numerator / denominator).toFixed(2));
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}
