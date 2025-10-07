import { Router } from "express";
import LoanRepository from "../data/repositories/LoanRepository";
import { buildAmortizationSchedule } from "../utils/loans";
import { LoanPayment } from "@prisma/client";

export const loansRouter = Router();
const loanRepository = new LoanRepository();

loansRouter.get("/", async (_req, res) => {
  try {
    const loans = await loanRepository.findAll();
    res.json(loans);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch loans";
    res.status(500).json({ error: message });
  }
});

loansRouter.post("/", async (req, res) => {
  try {
    // Ensure schedule (JSON string) is present because the Prisma schema requires it.
    const createData: any = { ...req.body };
    if (!createData.schedule) {
      try {
        const principal = Number(createData.principal || 0);
        const interestRate = Number(createData.interestRate || 0);
        const termMonths = Number(createData.termMonths || 0);
        const startDate = createData.startDate || new Date().toISOString().slice(0, 10);
        if (Number.isFinite(principal) && principal > 0 && Number.isFinite(termMonths) && termMonths > 0) {
          const schedule = buildAmortizationSchedule(principal, interestRate, termMonths, startDate);
          createData.schedule = JSON.stringify(schedule);
        } else {
          createData.schedule = JSON.stringify([]);
        }
      } catch (e) {
        createData.schedule = JSON.stringify([]);
      }
    }
    // Prisma Loan model does not include accountId; remove any client-supplied accountId
    if (createData.accountId !== undefined) delete createData.accountId;

    const loan = await loanRepository.create(createData);
    res.status(201).json(loan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create loan";
    res.status(400).json({ error: message });
  }
});

loansRouter.post("/:id/payments", async (req, res) => {
  try {
    const loan = await loanRepository.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }
    const payment = req.body as LoanPayment;
    const updatedLoan = await loanRepository.update(req.params.id, {
      payments: {
        create: payment
      }
    });
    res.json(updatedLoan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record payment";
    res.status(400).json({ error: message });
  }
});

loansRouter.get('/:id', async (req, res) => {
  try {
    const loan = await loanRepository.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Not found' });
    res.json(loan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch loan";
    res.status(500).json({ error: message });
  }
});

loansRouter.delete('/:id', async (req, res) => {
  try {
    await loanRepository.delete(req.params.id);
    res.status(204).end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete loan";
    res.status(400).json({ error: message });
  }
});
