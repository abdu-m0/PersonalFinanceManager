import React, { useEffect, useState } from "react";

type Transaction = { id: number; date: string; description: string; amount: number };

export default function App() {
  const [health, setHealth] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHealth(d.status))
      .catch(() => setHealth(null));

    fetch("/api/transactions")
      .then((r) => r.json())
      .then((d) => setTransactions(d))
      .catch(() => setTransactions([]));
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 20 }}>
      <h1>Personal Finance Manager</h1>
      <p>API health: {health ?? "unreachable"}</p>

      <h2>Transactions</h2>
      <ul>
        {transactions.map((t) => (
          <li key={t.id}>
            {t.date} — {t.description}: ${t.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}
