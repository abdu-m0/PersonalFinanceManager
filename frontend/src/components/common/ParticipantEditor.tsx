import React, { useMemo, useState } from 'react';
import { parseInputAmount, formatAmount } from '../../utils/formatting';
import Button from '../ui/button';
import Input from '../ui/input';
import type { Contact } from '../../types';

type Participant = { contactId: string; share: string };

type Props = {
  participants: Participant[];
  contacts: Contact[];
  accountCurrency: string;
  billSplitMode: 'equal' | 'custom';
  amount: string;
  payerId?: string | null;
  onSetPayer: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateShare: (id: string, share: string) => void;
};

export default function ParticipantEditor({ participants, contacts, accountCurrency, billSplitMode, amount, payerId, onSetPayer, onRemove, onUpdateShare }: Props) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');

  const total = parseInputAmount(amount || '0');

  const rows = useMemo(() => participants.filter(p => p.contactId), [participants]);

  function parseShareValue(value: string, totalAmount: number): number {
    if (!value) return 0;
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
      const num = parseFloat(trimmed.slice(0, -1));
      if (!Number.isFinite(num)) return 0;
      return Math.round((totalAmount * (num / 100)) * 100) / 100;
    }
    return parseInputAmount(value);
  }

  function openEditor(id: string, currentShare: string) {
    setDraft(currentShare || '');
    setOpenFor(id);
  }

  function closeEditor() {
    setOpenFor(null);
    setDraft('');
  }

  function saveShare(id: string) {
    onUpdateShare(id, draft);
    closeEditor();
  }

  return (
    <div className="space-y-1">
      {rows.map((p, idx) => {
        const person = p.contactId === 'self' ? { id: 'self', name: 'You' } : contacts.find(c => c.id === p.contactId);
        const isPayer = (payerId || 'self') === p.contactId;
        const shareVal = billSplitMode === 'equal'
          ? (() => {
            const count = rows.length || 1;
            const share = count > 0 ? Math.round((total / count) * 100) / 100 : 0;
            return share;
          })()
          : parseShareValue(p.share || '', total);

        return (
          <div key={idx} className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button type="button" className="text-left" onClick={() => onSetPayer(p.contactId)} title="Set as payer">
                <span className="text-sm text-slate-800">{person ? person.name : 'Unknown'}</span>
                {isPayer && (
                  <span className={`text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded`}>Payer</span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium mr-2">{formatAmount(shareVal, accountCurrency)}</span>

              <button type="button" className="text-slate-500 hover:text-slate-800 text-xs px-2" onClick={() => openEditor(p.contactId, p.share || '')} title="Edit participant">Edit</button>

              <button
                type="button"
                onClick={() => onRemove(p.contactId)}
                aria-disabled={isPayer}
                className={`text-xs px-2 ${isPayer ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:underline'}`}
                title="Remove participant"
              >
                Remove
              </button>

              {openFor === p.contactId && (
                <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-white border rounded shadow-md p-3">
                  <div className="text-sm font-medium mb-2">Edit participant</div>
                  {billSplitMode === 'custom' ? (
                    <div className="mb-2">
                      <Input
                        label="Share"
                        value={draft}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                        placeholder="e.g. 25 or 25%"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600 mb-2">Equal split — share is computed automatically.</div>
                  )}
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="secondary" onClick={() => closeEditor()}>Cancel</Button>
                    <Button onClick={() => saveShare(p.contactId)}>Save</Button>
                  </div>
                  <div className="border-t mt-2 pt-2 flex items-center justify-between text-xs text-slate-500">
                    <button type="button" onClick={() => { onSetPayer(p.contactId); closeEditor(); }} className="underline">Set as payer</button>
                    <button type="button" onClick={() => { onRemove(p.contactId); closeEditor(); }} className="underline text-red-600">Remove</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
