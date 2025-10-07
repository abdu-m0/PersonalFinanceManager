import { Router } from "express";
import { buildSnapshot } from "../services/snapshot";

export const overviewRouter = Router();

overviewRouter.get("/", async (_req, res) => {
  try {
    const snapshot = await buildSnapshot();
    res.json(snapshot);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to load overview";
    res.status(500).json({ error: message });
  }
});
