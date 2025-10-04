import request from "supertest";
import express from "express";

const app = express();
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

describe("GET /api/health", () => {
  it("returns status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
