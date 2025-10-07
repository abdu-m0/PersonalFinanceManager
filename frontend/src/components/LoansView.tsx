import React, { useState, Suspense, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import PageHeader from "./common/PageHeader";
import { Modal } from "./common/Modal";
const AmortizationScheduleView = React.lazy(() => import('./AmortizationScheduleView'));
import type { Loan, Contact, Account } from "../types";
import { LoanSection } from "./common/LoanSection";
import type { LoanFormState } from "./common/LoanForm";

type LoansViewProps = {
  payableLoans: Loan[];
  receivables: Loan[];
  contacts: Contact[];
  accounts: Account[];
  defaultCurrency: string;
  onCreateLoan: (loan: LoanFormState & { direction: "borrowed" | "lent" }) => Promise<void>;
  onCreatePayment: (loanId: string, payment: { amount: number; date: string; currency: string; accountId: string }) => Promise<void>;
  onDeleteLoan: (loanId: string) => Promise<void>;
};

export default function LoansView({
  payableLoans,
  receivables,
  contacts,
  accounts,
  defaultCurrency,
  onCreateLoan,
  onCreatePayment,
  onDeleteLoan
}: LoansViewProps) {
  const [selectedLoanForSchedule, setSelectedLoanForSchedule] = useState<Loan | null>(null);

  const [activeTab, setActiveTab] = useState<'loans' | 'receivables'>('loans');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const loanId = params.get('loanId');
    if (loanId) {
      const loan = payableLoans.concat(receivables).find((l) => l.id === loanId);
      if (loan) setSelectedLoanForSchedule(loan);
    }
  }, [location.search, payableLoans, receivables]);

  return (
    <>
      <PageHeader
        title="Loans & Receivables"
        description="Track borrowed money and payments"
      />

      <div className="mb-4 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center" role="tablist">
          <li className="mr-2" role="presentation">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === 'loans' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => setActiveTab('loans')}
              role="tab"
              aria-controls="loans"
              aria-selected={activeTab === 'loans'}
            >
              Your Loans (You Owe)
            </button>
          </li>
          <li className="mr-2" role="presentation">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === 'receivables' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => setActiveTab('receivables')}
              role="tab"
              aria-controls="receivables"
              aria-selected={activeTab === 'receivables'}
            >
              Receivables (They Owe)
            </button>
          </li>
        </ul>
      </div>

      <div id="tabContent">
        <div className={`${activeTab === 'loans' ? '' : 'hidden'}`} id="loans" role="tabpanel">
          <LoanSection
            title="Your Loans (You Owe)"
            loans={payableLoans}
            accounts={accounts}
            contacts={contacts}
            defaultCurrency={defaultCurrency}
            direction="borrowed"
            onCreateLoan={onCreateLoan}
            onCreatePayment={onCreatePayment}
            onSelectLoanForSchedule={setSelectedLoanForSchedule}
            onDeleteLoan={onDeleteLoan}
          />
        </div>
        <div className={`${activeTab === 'receivables' ? '' : 'hidden'}`} id="receivables" role="tabpanel">
          <LoanSection
            title="Receivables (They Owe)"
            loans={receivables}
            accounts={accounts}
            contacts={contacts}
            defaultCurrency={defaultCurrency}
            direction="lent"
            onCreateLoan={onCreateLoan}
            onCreatePayment={onCreatePayment}
            onSelectLoanForSchedule={setSelectedLoanForSchedule}
            onDeleteLoan={onDeleteLoan}
          />
        </div>
      </div>

      {selectedLoanForSchedule && (
        <Modal isOpen={!!selectedLoanForSchedule} onClose={() => setSelectedLoanForSchedule(null)} title="Amortization Schedule" maxWidth="900px">
          <Suspense fallback={<div>Loading...</div>}>
            <AmortizationScheduleView
              loan={selectedLoanForSchedule}
              accounts={accounts}
              onPay={(payment: { amount: number; date: string; currency: string; accountId: string }) => onCreatePayment(selectedLoanForSchedule.id, payment)}
            />
          </Suspense>
        </Modal>
      )}
    </>
  );
}