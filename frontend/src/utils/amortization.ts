import type { Loan } from "../types";

export type AmortizationEntry = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
  dueDate: Date;
  isPaid: boolean;
};

/**
 * Calculates the monthly payment for a loan.
 * M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1 ]
 * @param principal The principal loan amount.
 * @param annualInterestRate The annual interest rate (e.g., 5 for 5%).
 * @param termMonths The loan term in months.
 * @returns The monthly payment amount.
 */
function calculateMonthlyPayment(principal: number, annualInterestRate: number, termMonths: number): number {
  if (annualInterestRate <= 0) {
    return principal / termMonths;
  }
  const monthlyInterestRate = annualInterestRate / 100 / 12;
  const numerator = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths);
  const denominator = Math.pow(1 + monthlyInterestRate, termMonths) - 1;
  return numerator / denominator;
}

/**
 * Generates an amortization schedule for a given loan.
 * @param loan The loan object.
 * @returns An array of amortization entries.
 */
export function generateAmortizationSchedule(loan: Loan): AmortizationEntry[] {
  if (loan.horizon !== 'long-term' || !loan.termMonths || loan.interestRate === undefined) {
    return [];
  }

  const { principal, interestRate, termMonths, payments, startDate } = loan;
  const monthlyPayment = calculateMonthlyPayment(principal, interestRate, termMonths);

  const schedule: AmortizationEntry[] = [];
  let remainingBalance = principal;
  const loanStartDate = new Date(startDate);

  for (let month = 1; month <= termMonths; month++) {
    const dueDate = new Date(loanStartDate);
    dueDate.setMonth(loanStartDate.getMonth() + month);

    const interestPayment = remainingBalance * (interestRate / 100 / 12);
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;

    const isPaid = payments.some(p => {
      const paymentDate = new Date(p.date);
      return paymentDate.getFullYear() === dueDate.getFullYear() && paymentDate.getMonth() === dueDate.getMonth();
    });

    // Ensure the last payment clears the balance exactly
    if (month === termMonths && remainingBalance > 0.001) {
        const lastPrincipalPayment = principalPayment + remainingBalance;
        remainingBalance = 0;
        schedule.push({
            month,
            payment: lastPrincipalPayment + interestPayment,
            principal: lastPrincipalPayment,
            interest: interestPayment,
            remainingBalance: 0,
            dueDate,
            isPaid,
        });
    } else {
        schedule.push({
            month,
            payment: monthlyPayment,
            principal: principalPayment,
            interest: interestPayment,
            remainingBalance: remainingBalance < 0 ? 0 : remainingBalance,
            dueDate,
            isPaid,
        });
    }
  }

  return schedule;
}
