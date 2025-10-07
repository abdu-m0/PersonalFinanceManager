import { Router } from "express";
import AccountRepository from "../data/repositories/AccountRepository";

export const accountsRouter = Router();
const accountRepository = new AccountRepository();

accountsRouter.get("/", async (_req, res) => {
  try {
    const accounts = await accountRepository.findAll();
    res.json(accounts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch accounts";
    res.status(500).json({ error: message });
  }
});

accountsRouter.post("/", async (req, res) => {
  try {
    const account = await accountRepository.create(req.body);
    res.status(201).json(account);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account";
    res.status(400).json({ error: message });
  }
});

accountsRouter.patch("/:id", async (req, res) => {
  try {
    const account = await accountRepository.update(req.params.id, req.body);
    res.json(account);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update account";
    res.status(400).json({ error: message });
  }
});

accountsRouter.delete("/:id", async (req, res) => {
  try {
    await accountRepository.delete(req.params.id);
    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete account";
    res.status(400).json({ error: message });
  }
});
