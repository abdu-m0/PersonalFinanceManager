import { Router } from "express";
import { getCashflowForecastFor, getReportSummary } from "../services/analytics";

export const analyticsRouter = Router();

analyticsRouter.get("/cashflow", async (req, res) => {
  try {
    const horizon = req.query.horizonDays ? Number(req.query.horizonDays) : undefined;
    const forecast = await getCashflowForecastFor(horizon);
    res.json(forecast);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch cashflow forecast';
    res.status(500).json({ error: message });
  }
});

analyticsRouter.get("/reports", async (_req, res) => {
  try {
    const reports = await getReportSummary();
    res.json(reports);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch reports';
    res.status(500).json({ error: message });
  }
});
