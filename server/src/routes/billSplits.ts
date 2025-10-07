import { Router } from "express";
import { listBillSplits, createBillSplit, recordBillSplitPayment } from "../services/billSplits";

export const billSplitsRouter = Router();

billSplitsRouter.get("/", async (_req, res) => {
  try {
    const splits = await listBillSplits();
    res.json(splits);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch bill splits';
    res.status(500).json({ error: message });
  }
});

billSplitsRouter.post("/", async (req, res) => {
  try {
    const split = await createBillSplit(req.body);
    res.status(201).json(split);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create bill split";
    res.status(400).json({ error: message });
  }
});

billSplitsRouter.post("/:id/payments", async (req, res) => {
  try {
    const split = await recordBillSplitPayment({ splitId: req.params.id, ...req.body });
    res.json(split);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record payment";
    res.status(400).json({ error: message });
  }
});
