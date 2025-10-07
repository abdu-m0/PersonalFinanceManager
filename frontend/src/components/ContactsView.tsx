import React, { useState } from "react";
import ContactList from "./ContactList";
import PageHeader from "./common/PageHeader";
import { Button } from "./common/Button";
import { Modal } from "./common/Modal";
import type { Contact, Account, Loan } from "../types";
import { ContactForm } from "./common/ContactForm";
import { formatAmount } from "../utils/formatting";
import { getFavourites, setFavourite } from '../utils/favorites';

type ContactsViewProps = {
  contacts: Contact[];
  payableLoans: any[];
  receivables: any[];
  defaultCurrency: string;
  onAddContact: (contact: Omit<Contact, "id">) => Promise<void>;
  onEditContact?: (contact: Contact) => void;
  onDeleteContact?: (contact: Contact) => Promise<void>;
  accounts?: Account[];
  onRecordLoanPayment?: (loanId: string, payment: { amount: number; date: string; currency: string; accountId: string }) => Promise<void>;
};

export default function ContactsView({
  contacts,
  payableLoans,
  receivables,
  defaultCurrency,
  onAddContact,
  onEditContact,
  onDeleteContact
  , accounts, onRecordLoanPayment
}: ContactsViewProps) {
  const [status, setStatus] = useState("");
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanModalContact, setLoanModalContact] = useState<null | { contactId: string; type: 'payable' | 'receivable' }>(null);
  const [favourites, setFavourites] = useState<Record<string, boolean>>({});

  async function handleAddContact(contactData: Omit<Contact, "id">) {
    try {
      setStatus("Saving...");
      await onAddContact(contactData);
      setStatus("");
      setShowAddContactForm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add contact";
      setStatus(message);
    }
  }

  async function handleEdit(contact: Contact) {
    if (onEditContact) {
      try {
        await onEditContact(contact);
        setEditingContact(null);
      } catch (err) {
        console.error("Failed to edit contact:", err);
      }
    }
  }

  async function handleDelete(contact: Contact) {
    if (onDeleteContact && window.confirm("Are you sure you want to delete this contact?")) {
      try {
        await onDeleteContact(contact);
      } catch (err) {
        console.error("Failed to delete contact:", err);
      }
    }
  }

  function handleShowLoans(contactId: string, type: 'payable' | 'receivable') {
    setLoanModalContact({ contactId, type });
    setLoanModalOpen(true);
  }

  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccount, setPaymentAccount] = useState<string | undefined>(undefined);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0,10));

  React.useEffect(() => {
    if (!paymentAccount && accounts && accounts.length > 0) setPaymentAccount(accounts[0].id);
  }, [accounts]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const favs = await getFavourites();
        if (mounted) setFavourites(favs || {});
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleRecordPaymentForLoan(loan: Loan) {
    if (!onRecordLoanPayment) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentStatus('Enter a valid amount');
      return;
    }
    try {
      setPaymentStatus('Recording...');
      await onRecordLoanPayment(loan.id, { amount, date: paymentDate, currency: loan.currency, accountId: paymentAccount || '' });
      setPaymentStatus('Recorded');
      setPaymentAmount('');
    } catch (err) {
      setPaymentStatus('Failed to record payment');
    }
  }

  function goToLoan(loanId: string) {
    // Navigate to loans view and include query param for selection
    window.location.href = `/loans?loanId=${encodeURIComponent(loanId)}`;
  }

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Manage your contacts and shared expenses"
      />

      <section className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Your Contacts</h2>
          <Button onClick={() => { setEditingContact(null); setShowAddContactForm(true); }}>
            Add New Contact
          </Button>
        </div>
        {contacts.length === 0 ? (
          <p className="text-gray-500 text-sm">No contacts yet. Add your first contact below.</p>
        ) : (
          <ContactList
            contacts={contacts}
            payableLoans={payableLoans}
            receivables={receivables}
            defaultCurrency={defaultCurrency}
            onEdit={(contact) => { setEditingContact(contact); setShowAddContactForm(true); }}
            onDelete={handleDelete}
            onShowLoans={handleShowLoans}
            favourites={favourites}
            onToggleFavourite={async (id: string, value: boolean) => {
              try {
                await setFavourite(id, value);
                setFavourites((prev) => ({ ...prev, [id]: value }));
              } catch (e) {
                // ignore
              }
            }}
          />
        )}
      </section>

      <Modal isOpen={showAddContactForm} onClose={() => { setShowAddContactForm(false); setEditingContact(null); }} title={editingContact ? "Edit Contact" : "Add New Contact"}>
        <ContactForm
          onSubmit={editingContact ? (data) => handleEdit({ ...editingContact, ...data }) : handleAddContact}
          onCancel={() => { setShowAddContactForm(false); setEditingContact(null); }}
          contact={editingContact}
          status={status}
          submitText={editingContact ? "Save Changes" : "Add Contact"}
        />
      </Modal>

      <Modal isOpen={loanModalOpen} onClose={() => { setLoanModalOpen(false); setLoanModalContact(null); }} title={loanModalContact ? (loanModalContact.type === 'payable' ? 'Loans You Owe' : 'Loans They Owe') : 'Loans'}>
        {loanModalContact ? (
          <div className="space-y-4">
            {(loanModalContact.type === 'payable' ? payableLoans : receivables)
              .filter((l: Loan) => l.contactId === loanModalContact.contactId)
              .map((loan: Loan) => (
                <div key={loan.id} className="border rounded p-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{loan.label || 'Loan'}</div>
                      <div className="text-sm text-slate-500">Principal: {formatAmount(loan.principal, defaultCurrency)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">Remaining: {formatAmount(loan.principal - loan.payments.reduce((acc, p) => acc + p.amount, 0), defaultCurrency)}</div>
                      <div className="text-xs text-slate-500">Payments: {loan.payments.length}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-xs text-slate-600">Amount</label>
                      <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full input" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">Account</label>
                      <select value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} className="w-full input">
                        {accounts?.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">Date</label>
                      <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full input" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="btn btn-primary" onClick={() => handleRecordPaymentForLoan(loan)}>Record payment</button>
                    <button className="btn btn-ghost" onClick={() => goToLoan(loan.id)}>Open loan</button>
                    <div className="text-sm text-slate-500">{paymentStatus}</div>
                  </div>
                </div>
              ))}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

