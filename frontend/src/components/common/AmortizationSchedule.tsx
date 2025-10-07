import React from 'react';
import type { Loan, Account } from '../../types';
import { generateAmortizationSchedule, AmortizationEntry } from '../../utils/amortization';
import { formatAmount, formatDate, todayISO } from '../../utils/formatting';
import { ReusableTable } from './ReusableTable';
import { Modal } from './Modal';
import { FormInput, FormSelect } from './FormComponents';
import Switch from './Switch';
import { buttonClasses } from '../../styles/classes';

type AmortizationScheduleProps = {
  loan: Loan;
  accounts: Account[];
  onPay: (payment: { amount: number; date: string; currency: string; accountId: string }) => Promise<void>;
};

type PaymentState = {
  entry: AmortizationEntry;
  accountId: string;
  date: string;
};

export function AmortizationSchedule({ loan, accounts, onPay }: AmortizationScheduleProps) {
  const [schedule, setSchedule] = React.useState(() => generateAmortizationSchedule(loan).map(e => ({...e, id: String(e.month)})));
  const [paymentToConfirm, setPaymentToConfirm] = React.useState<PaymentState | null>(null);
  const [status, setStatus] = React.useState('');

  const handlePayClick = (entry: AmortizationEntry) => {
    if (entry.isPaid) return;
    setPaymentToConfirm({
      entry,
      accountId: '',
      date: todayISO(),
    });
  };

  const handleConfirmPayment = async () => {
    if (!paymentToConfirm || !paymentToConfirm.accountId) {
      setStatus('Please select an account.');
      return;
    }
    setStatus('Processing...');
    try {
      await onPay({
        amount: paymentToConfirm.entry.payment,
        date: paymentToConfirm.date,
        currency: loan.currency,
        accountId: paymentToConfirm.accountId,
      });
      setPaymentToConfirm(null);
      setStatus('Payment successful!');
      // Refresh schedule
      setSchedule(generateAmortizationSchedule({ ...loan, payments: [...loan.payments, { id: '', date: paymentToConfirm.date, amount: paymentToConfirm.entry.payment, currency: loan.currency }] }).map(e => ({...e, id: String(e.month)})));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Payment failed.');
    }
  };

  const columns = [
    { key: 'month', header: 'Month' },
    { key: 'dueDate', header: 'Due Date', render: (row: AmortizationEntry) => formatDate(row.dueDate.toISOString()) },
    { key: 'payment', header: 'Payment', render: (row: AmortizationEntry) => formatAmount(row.payment, loan.currency) },
    { key: 'principal', header: 'Principal', render: (row: AmortizationEntry) => formatAmount(row.principal, loan.currency) },
    { key: 'interest', header: 'Interest', render: (row: AmortizationEntry) => formatAmount(row.interest, loan.currency) },
    { key: 'remainingBalance', header: 'Remaining Balance', render: (row: AmortizationEntry) => formatAmount(row.remainingBalance, loan.currency) },
    {
      key: 'action',
      header: 'Action',
      render: (row: AmortizationEntry) => (
        <div>
          <Switch checked={row.isPaid} onChange={() => handlePayClick(row)} ariaLabel={`Mark month ${row.month} paid`} />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Amortization Schedule for {loan.label}</h3>
      <ReusableTable columns={columns} data={schedule} rowKey="month" />
      {paymentToConfirm && (
        <Modal isOpen={!!paymentToConfirm} onClose={() => setPaymentToConfirm(null)} title="Confirm Payment">
          <div className="space-y-4 p-4">
            <p>
              Pay <strong>{formatAmount(paymentToConfirm.entry.payment, loan.currency)}</strong> for month {paymentToConfirm.entry.month}?
            </p>
            <FormSelect
              label="From Account"
              value={paymentToConfirm.accountId}
              onChange={(value) => setPaymentToConfirm(prev => prev ? { ...prev, accountId: value } : null)}
              options={[{ value: '', label: 'Select Account' }, ...accounts.map(a => ({ value: a.id, label: a.name }))]}
            />
            <FormInput
              label="Payment Date"
              type="date"
              value={paymentToConfirm.date}
              onChange={(value) => setPaymentToConfirm(prev => prev ? { ...prev, date: value } : null)}
            />
            <div className="flex items-center gap-4">
              <button onClick={handleConfirmPayment} className={buttonClasses.primary}>
                Confirm Payment
              </button>
              <button onClick={() => setPaymentToConfirm(null)} className={buttonClasses.secondary}>
                Cancel
              </button>
            </div>
            {status && <p className="text-sm text-gray-600">{status}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
