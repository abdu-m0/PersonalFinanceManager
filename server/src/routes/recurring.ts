import { Router } from "express";
import RecurringItemRepository from "../data/repositories/RecurringItemRepository";

export const recurringRouter = Router();
const recurringItemRepository = new RecurringItemRepository();

recurringRouter.get("/", async (_req, res) => {
  try {
    const items = await recurringItemRepository.findAll();
    res.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch recurring items";
    res.status(500).json({ error: message });
  }
});

recurringRouter.post("/", async (req, res) => {
  try {
    const item = await recurringItemRepository.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create recurring item";
    res.status(400).json({ error: message });
  }
});

recurringRouter.patch("/:id", async (req, res) => {
  try {
    const item = await recurringItemRepository.update(req.params.id, req.body);
    res.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update recurring item";
    res.status(400).json({ error: message });
  }
});

recurringRouter.delete("/:id", async (req, res) => {
  try {
    await recurringItemRepository.delete(req.params.id);
    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete recurring item";
    res.status(400).json({ error: message });
  }
});
