import { Router } from "express";

export const transactionsRouter = Router();

// Simple in-memory demo data
let transactions = [
  { id: 1, date: "2025-01-15", description: "Grocery", amount: -54.23 },
  { id: 2, date: "2025-01-20", description: "Salary", amount: 2500.0 },
  { id: 3, date: "2025-01-22", description: "Electric bill", amount: -120.5 }
];

transactionsRouter.get("/", (_req, res) => {
  res.json(transactions);
});

transactionsRouter.post("/", (req, res) => {
  const { date, description, amount } = req.body;
  const id = transactions.length ? transactions[transactions.length - 1].id + 1 : 1;
  const tx = { id, date, description, amount };
  transactions.push(tx);
  res.status(201).json(tx);
});

transactionsRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  transactions = transactions.filter((t) => t.id !== id);
  res.status(204).end();
});
