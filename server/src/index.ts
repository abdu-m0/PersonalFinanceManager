import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { transactionsRouter } from "./routes/transactions";
import { accountsRouter } from "./routes/accounts";
import { contactsRouter } from "./routes/contacts";
import { loansRouter } from "./routes/loans";
import { billSplitsRouter } from "./routes/billSplits";
import { overviewRouter } from "./routes/overview";
import { budgetsRouter } from "./routes/budgets";
import { savingsRouter } from "./routes/savings";
import { recurringRouter } from "./routes/recurring";
import { analyticsRouter } from "./routes/analytics";
import { settingsRouter } from "./routes/settings";
import { categoriesRouter } from "./routes/categories";
import { receivablesRouter } from "./routes/receivables";
import { favoritesRouter } from "./routes/favorites";
// Legacy in-memory store removed; use DB-backed snapshot service
import { buildSnapshot } from "./services/snapshot";
import { ensureSelfContact } from "./init/selfContact";

export function healthHandler(_req: Request, res: Response) {
  res.json({ status: "ok" });
}

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", healthHandler);
  app.use("/api/overview", overviewRouter);
  app.use("/api/accounts", accountsRouter);
  app.use("/api/contacts", contactsRouter);
  app.use("/api/loans", loansRouter);
  app.use("/api/bill-splits", billSplitsRouter);
  app.use("/api/budgets", budgetsRouter);
  app.use("/api/savings", savingsRouter);
  app.use("/api/recurring", recurringRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/receivables", receivablesRouter);
  app.use("/api/favorites", favoritesRouter);
  app.use("/api/transactions", transactionsRouter);
  app.get("/api/snapshot", async (_req, res) => {
    try {
      const snapshot = await buildSnapshot();
      res.json(snapshot);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to build snapshot";
      res.status(500).json({ error: message });
    }
  });

  return app;
}

if (require.main === module) {
  const app = createServer();
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  (async () => {
    // Ensure the permanent 'self' contact exists before accepting requests
    await ensureSelfContact();
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })();
}
