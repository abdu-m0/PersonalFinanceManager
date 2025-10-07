import { Router } from 'express';
import { listTransactions, createSimpleTransaction, deleteTransaction } from '../services/transactions';

export const receivablesRouter = Router();

// List receivables derived from transactions metadata
receivablesRouter.get('/', async (_req, res) => {
  try {
    const all = await listTransactions();
    const receivables = all.filter((t: any) => t.metadata && (t.metadata as any).receivable);
    res.json(receivables);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch receivables';
    res.status(500).json({ error: message });
  }
});

receivablesRouter.post('/', async (req, res) => {
  try {
    const { amount, currency, date, personId, description, accountId } = req.body;
    const tx = await createSimpleTransaction({ type: 'expense', amount: Number(amount), currency: currency || 'MVR', date: date || new Date().toISOString(), status: 'posted', accountId, description: description || 'Receivable', metadata: { receivable: true, personId } } as any);
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message || 'Unable to create receivable' });
  }
});

receivablesRouter.get('/:id', async (req, res) => {
  try {
    const all = await listTransactions();
    const tx = all.find((t: any) => t.id === req.params.id && (t.metadata as any)?.receivable);
    if (!tx) return res.status(404).json({ error: 'Not found' });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || 'Unable to fetch' });
  }
});

receivablesRouter.delete('/:id', async (req, res) => {
  try {
    await deleteTransaction(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message || 'Unable to delete' });
  }
});

export default receivablesRouter;
