import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLoanApp } from "../../src/loans/app.js";

describe("API emprunts", () => {
  const loanId = "9cda25a8-7a0d-4a1e-8fb2-68ee9430263d";
  let loanService;
  let app;

  beforeEach(() => {
    loanService = {
      listLoans: vi.fn(),
      createLoan: vi.fn(),
      returnLoan: vi.fn(),
    };
    app = createLoanApp({ loanService });
  });

  it("expose la santé du service", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body.service).toBe("loans");
  });

  it("liste les emprunts", async () => {
    loanService.listLoans.mockResolvedValue([{ id: loanId }]);
    const response = await request(app).get("/api/loans").expect(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("crée un emprunt validé", async () => {
    loanService.createLoan.mockImplementation((loan) => ({
      id: loanId,
      ...loan,
    }));
    const response = await request(app)
      .post("/api/loans")
      .send({ bookId: 2, borrowerName: "  Ada Lovelace " })
      .expect(201);
    expect(loanService.createLoan).toHaveBeenCalledWith({
      bookId: 2,
      borrowerName: "Ada Lovelace",
    });
    expect(response.body.data.id).toBe(loanId);
  });

  it("enregistre un retour", async () => {
    loanService.returnLoan.mockResolvedValue({
      id: loanId,
      status: "returned",
    });
    const response = await request(app)
      .post(`/api/loans/${loanId}/return`)
      .expect(200);
    expect(loanService.returnLoan).toHaveBeenCalledWith(loanId);
    expect(response.body.data.status).toBe("returned");
  });

  it.each([
    ["/api/loans", { bookId: 0, borrowerName: "A" }],
    ["/api/loans/not-a-uuid/return", undefined],
  ])("refuse les données invalides sur %s", async (path, body) => {
    const call = path.endsWith("/return")
      ? request(app).post(path)
      : request(app).post(path).send(body);
    const response = await call.expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
