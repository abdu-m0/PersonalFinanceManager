import { Router } from "express";
import { getSettings, updateSettings } from "../services/settings";

export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch settings';
    res.status(500).json({ error: message });
  }
});

settingsRouter.patch("/", async (req, res) => {
  try {
    const updated = await updateSettings(req.body);
    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update settings";
    res.status(400).json({ error: message });
  }
});
