import { Router } from "express";
import BudgetRepository from "../data/repositories/BudgetRepository";

export const budgetsRouter = Router();
const budgetRepository = new BudgetRepository();

budgetsRouter.get("/", async (_req, res) => {
  try {
    const budgets = await budgetRepository.findAll();
    res.json(budgets);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch budgets";
    res.status(500).json({ error: message });
  }
});

budgetsRouter.post("/", async (req, res) => {
  try {
    const budget = await budgetRepository.create(req.body);
    res.status(201).json(budget);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create budget";
    res.status(400).json({ error: message });
  }
});

budgetsRouter.patch("/:id", async (req, res) => {
  try {
    const budget = await budgetRepository.update(req.params.id, req.body);
    res.json(budget);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update budget";
    res.status(400).json({ error: message });
  }
});

budgetsRouter.delete("/:id", async (req, res) => {
  try {
    await budgetRepository.delete(req.params.id);
    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete budget";
    res.status(400).json({ error: message });
  }
});
