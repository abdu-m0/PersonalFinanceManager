import React, { useState } from 'react';
import type { Loan, Account } from '../../types';
import { Modal } from './Modal';
import { LoanForm, type LoanFormState } from './LoanForm';
import { LoanPaymentForm } from './LoanPaymentForm';
import { formatAmount, formatDate, capitalize } from '../../utils/formatting';
import { Button } from './Button';

type LoanSectionProps = {
  title: string;
  loans: Loan[];
  accounts: Account[];
  contacts: any[];
  defaultCurrency: string;
  direction: 'borrowed' | 'lent';
  onCreateLoan: (loan: LoanFormState & { direction: 'borrowed' | 'lent' }) => Promise<void>;
  onCreatePayment: (loanId: string, payment: { amount: number; date: string; currency: string; accountId: string }) => Promise<void>;
  onSelectLoanForSchedule: (loan: Loan) => void;
  onDeleteLoan: (loanId: string) => Promise<void>;
};

export function LoanSection({
  title,
  loans,
  accounts,
  contacts,
  defaultCurrency,
  direction,
  onCreateLoan,
  onCreatePayment,
  onSelectLoanForSchedule,
  onDeleteLoan,
}: LoanSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [status, setStatus] = useState('');

  const handleCreateLoan = async (loanData: LoanFormState) => {
    try {
      setStatus('Saving...');
      await onCreateLoan({ ...loanData, direction });
      setStatus('');
      setShowAddForm(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to save loan');
    }
  };

  const handleCreatePayment = async (paymentData: any) => {
    if (!payingLoan) return;
    try {
      setStatus('Recording...');
      await onCreatePayment(payingLoan.id, {
        amount: Number(paymentData.amount),
        date: paymentData.date,
        currency: payingLoan.currency,
        accountId: paymentData.accountId,
      });
      setStatus('');
      setPayingLoan(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to record payment');
    }
  };

  return (
    <section className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button onClick={() => setShowAddForm(true)}>
          Add New {direction === 'borrowed' ? 'Loan' : 'Receivable'}
        </Button>
      </div>

      <Modal isOpen={showAddForm} onClose={() => setShowAddForm(false)} title={`Add New ${direction === 'borrowed' ? 'Loan' : 'Receivable'}`}>
        <LoanForm
          onSubmit={handleCreateLoan}
          defaultCurrency={defaultCurrency}
          contacts={contacts}
          accounts={accounts}
          status={status}
          submitText={`Save ${direction === 'borrowed' ? 'Loan' : 'Receivable'}`}
          direction={direction}
        />
      </Modal>

      {loans.length === 0 ? (
        <p className="text-slate-500 text-sm">No active {direction === 'borrowed' ? 'loans' : 'receivables'}.</p>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => (
            <div key={loan.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{loan.label}</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Started {formatDate(loan.startDate)} · {capitalize(loan.horizon)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {loan.horizon === 'long-term' && (
                    <Button variant="secondary" onClick={() => onSelectLoanForSchedule(loan)}>
                      Schedule
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setPayingLoan(loan)}>
                    Record {direction === 'borrowed' ? 'Payment' : 'Collection'}
                  </Button>
                  <Button variant="danger" onClick={() => onDeleteLoan(loan.id)}>
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex gap-6 text-sm">
                <div>
                  <div className="text-slate-500">Principal</div>
                  <div className="font-semibold mt-1">{formatAmount(loan.principal, loan.currency)}</div>
                </div>
                {loan.horizon === 'long-term' && (
                  <>
                    <div>
                      <div className="text-slate-500">Interest Rate</div>
                      <div className="mt-1">{loan.interestRate}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Term</div>
                      <div className="mt-1">{loan.termMonths} months</div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4">
                <div className="text-sm text-slate-500 mb-2">
                  {direction === 'borrowed' ? 'Payment' : 'Collection'} History
                </div>
                {loan.payments.length === 0 ? (
                  <p className="text-slate-400 text-xs">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {loan.payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-sm">
                        <span className="text-slate-600">{formatDate(payment.date)}</span>
                        <span className="font-medium">{formatAmount(payment.amount, payment.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {payingLoan && (
        <Modal isOpen={!!payingLoan} onClose={() => setPayingLoan(null)} title={`Record ${direction === 'borrowed' ? 'Payment' : 'Collection'} for ${payingLoan.label}`}>
          <LoanPaymentForm
            onSubmit={handleCreatePayment}
            onCancel={() => setPayingLoan(null)}
            loanId={payingLoan.id}
            accounts={accounts}
            status={status}
            direction={direction === 'borrowed' ? 'payment' : 'collection'}
          />
        </Modal>
      )}
    </section>
  );
}
