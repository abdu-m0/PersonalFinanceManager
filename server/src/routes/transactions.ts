import { Router } from "express";
import TransactionRepository from "../data/repositories/TransactionRepository";
import { createBillSplit } from "../services/billSplits";
import LoanRepository from "../data/repositories/LoanRepository";

const SELF_CONTACT_ID = 'self';

export const transactionsRouter = Router();
const transactionRepository = new TransactionRepository();
const loanRepository = new LoanRepository();

transactionsRouter.get("/", async (req, res) => {
  try {
    const transactions = await transactionRepository.findAll({
      take: Number(req.query.limit) || 50,
      skip: Number(req.query.offset) || 0
    });
    res.json(transactions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch transactions";
    res.status(500).json({ error: message });
  }
});

transactionsRouter.get("/:id", async (req, res) => {
  try {
    const tx = await transactionRepository.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json(tx);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch transaction";
    res.status(500).json({ error: message });
  }
});

transactionsRouter.post("/", async (req, res) => {
  try {
    const payload = { ...req.body } as any;

    // Handle optional billSplit payload. Ensure payer defaults to the user ('self')
    // and that the payer is included among the participants.
    const billSplitPayload = payload.billSplit;
  if (billSplitPayload && Array.isArray(billSplitPayload.people)) {
      // Remove the billSplit key before creating the transaction record
      delete payload.billSplit;
      // Ensure payer presence: if payer is provided, it must be included among people
      const payer = billSplitPayload.payerContactId || SELF_CONTACT_ID;
      if (!billSplitPayload.people.includes(payer)) {
        return res.status(400).json({ error: 'Payer must be included among participants' });
      }
    }

  const created = await transactionRepository.create(payload);
  const createdLoans: any[] = [];

    // If a billSplit was requested, create the BillSplit record.
    if (billSplitPayload && Array.isArray(billSplitPayload.people)) {
      try {
        const totalAmount = Number(req.body.amount || req.body.amount === 0 ? req.body.amount : created.amount) || 0;
        const currency = req.body.currency || created.currency || 'MVR';
  const payer = billSplitPayload.payerContactId || SELF_CONTACT_ID; // prefer provided payer, default to 'self'

  const uniquePeople = Array.from(new Set(billSplitPayload.people.filter(Boolean)));
        const count = uniquePeople.length;
        const share = count > 0 ? Math.round((totalAmount / count) * 100) / 100 : 0;

        const participants = (uniquePeople as string[]).map((id: string) => ({
          contactId: id,
          share: share,
          // mark payer as having paid the full amount (so others owe the payer)
          paid: id === payer ? Math.round(totalAmount * 100) / 100 : 0
        }));

        await createBillSplit({
          description: req.body.description || req.body.notes || 'Bill Split',
          date: req.body.date || new Date().toISOString(),
          currency,
          totalAmount: totalAmount,
          payerContactId: payer,
          participants
        });
        // After creating the bill split, create receivable/loan records as requested:
        // - If payer is 'self': create a receivable (loan with direction 'lent') for each other participant for their share.
        // - If payer is another contact: create a short-term loan (direction 'borrowed') for the user's share owed to the payer.
  try {
          const label = req.body.description || req.body.notes || 'Bill split';
          const date = req.body.date || new Date().toISOString().slice(0, 10);

          if (payer === SELF_CONTACT_ID) {
            // create receivable loans for each non-self participant
            for (const part of participants) {
              if (!part.contactId || part.contactId === SELF_CONTACT_ID) continue;
              const principal = Number(part.share || 0);
              if (!(principal > 0)) continue;
              const loan = await loanRepository.create({
                label: `${label}`,
                contactId: part.contactId,
                direction: 'lent',
                horizon: 'short-term',
                principal,
                currency,
                interestRate: 0,
                termMonths: 0,
                startDate: date,
                schedule: '[]'
              } as any);
              createdLoans.push(loan);
            }
          } else {
            // payer is another contact: create a loan for the user's share owed to payer
            const selfPart = participants.find((p) => p.contactId === SELF_CONTACT_ID);
            if (selfPart && Number(selfPart.share) > 0) {
              const loan = await loanRepository.create({
                label: `${label}`,
                contactId: payer,
                direction: 'borrowed',
                horizon: 'short-term',
                principal: Number(selfPart.share),
                currency,
                interestRate: 0,
                termMonths: 0,
                startDate: date,
                schedule: '[]'
              } as any);
              createdLoans.push(loan);
            }
          }
        } catch (loanErr) {
          // Log and continue; do not fail transaction creation if loan creation fails
          // eslint-disable-next-line no-console
          console.error('Failed to create receivable/loan for bill split:', loanErr instanceof Error ? loanErr.message : loanErr);
        }
      } catch (e) {
        // don't fail the transaction creation if bill split creation fails, but log
        // eslint-disable-next-line no-console
        console.error('Failed to create bill split for transaction:', e instanceof Error ? e.message : e);
      }
    }

    // Return created transaction and any created loans so frontend can notify the user
    res.status(201).json({ transaction: created, createdLoans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create transaction";
    res.status(400).json({ error: message });
  }
});

transactionsRouter.patch("/:id", async (req, res) => {
  try {
    const tx = await transactionRepository.update(req.params.id, req.body);
    return res.json(tx);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update";
    res.status(400).json({ error: message });
  }
});

transactionsRouter.delete("/:id", async (req, res) => {
  try {
    await transactionRepository.delete(req.params.id);
    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete transaction";
    res.status(404).json({ error: message });
  }
});
