import React from "react";
import type { Contact, Loan } from "../types";
import { Button } from "./common/Button";
import { formatAmount } from "../utils/formatting";

type ContactListProps = {
  contacts: Contact[];
  payableLoans: Loan[];
  receivables: Loan[];
  defaultCurrency: string;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onShowLoans?: (contactId: string, type: 'payable' | 'receivable') => void;
  favourites?: Record<string, boolean>;
  onToggleFavourite?: (id: string, value: boolean) => void;
};

export default function ContactList({ contacts, onEdit, onDelete, payableLoans, receivables, defaultCurrency, onShowLoans, favourites, onToggleFavourite }: ContactListProps) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {contacts.map((contact) => (
        <div key={contact.id} className="border border-slate-200 rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{contact.name}</h3>
              {contact.label && (
                <p className="text-slate-500 text-sm mt-1">{contact.label}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Favourite star */}
              <button
                type="button"
                onClick={() => onToggleFavourite && onToggleFavourite(contact.id, !((favourites && favourites[contact.id]) || false))}
                className="text-yellow-500"
                aria-label={((favourites && favourites[contact.id]) || false) ? 'Unfavourite' : 'Favourite'}
              >
                {((favourites && favourites[contact.id]) || false) ? '★' : '☆'}
              </button>
              <Button 
                variant="secondary"
                onClick={() => onEdit(contact)}
              >
                Edit
              </Button>
              <Button 
                variant="danger"
                onClick={() => onDelete(contact)}
              >
                Delete
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="text-blue-600 text-sm hover:underline"
              >
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="text-blue-600 text-sm hover:underline"
              >
                {contact.email}
              </a>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex gap-4">
            <div>
              <div className="text-xs text-slate-500">You Owe</div>
              <div className="mt-1 text-red-600 font-medium text-sm">
                <button
                  type="button"
                  className="underline decoration-dotted"
                  onClick={() => onShowLoans?.(contact.id, 'payable')}
                >
                  {formatAmount(
                    payableLoans
                      .filter((loan) => loan.contactId === contact.id)
                      .reduce((sum, loan) => sum + (loan.principal - loan.payments.reduce((paid, p) => paid + p.amount, 0)), 0),
                    defaultCurrency
                  )}
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">They Owe</div>
              <div className="mt-1 text-green-600 font-medium text-sm">
                <button
                  type="button"
                  className="underline decoration-dotted"
                  onClick={() => onShowLoans?.(contact.id, 'receivable')}
                >
                  {formatAmount(
                    receivables
                      .filter((loan) => loan.contactId === contact.id)
                      .reduce((sum, loan) => sum + (loan.principal - loan.payments.reduce((paid, p) => paid + p.amount, 0)), 0),
                    defaultCurrency
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}