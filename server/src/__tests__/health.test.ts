import { healthHandler } from "../index";

describe("GET /api/health", () => {
  it("returns status ok", () => {
    const req = {} as unknown;
    const res = createMockResponse();
    healthHandler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };
}
