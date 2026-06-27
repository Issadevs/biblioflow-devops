import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoanRepository } from "../../src/loans/data/loan-repository.js";

describe("LoanRepository", () => {
  let pool;
  let repository;

  beforeEach(() => {
    pool = { query: vi.fn() };
    repository = new LoanRepository(pool);
  });

  it("initialise la table", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await repository.initialize();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS loans"),
    );
  });

  it("liste les emprunts", async () => {
    const loans = [{ id: "loan-1" }];
    pool.query.mockResolvedValue({ rows: loans });
    await expect(repository.findAll()).resolves.toBe(loans);
  });

  it("trouve un emprunt ou renvoie null", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: "loan-1" }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(repository.findById("loan-1")).resolves.toEqual({
      id: "loan-1",
    });
    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("crée un emprunt", async () => {
    const loan = {
      id: "9cda25a8-7a0d-4a1e-8fb2-68ee9430263d",
      bookId: 2,
      borrowerName: "Ada",
      status: "active",
      loanedAt: new Date("2026-06-20T10:00:00Z"),
    };
    pool.query.mockResolvedValue({ rows: [{ id: loan.id }] });
    await expect(repository.create(loan)).resolves.toEqual({ id: loan.id });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO loans"),
      [loan.id, loan.bookId, loan.borrowerName, loan.status, loan.loanedAt],
    );
  });

  it("marque un retour ou renvoie null", async () => {
    const date = new Date("2026-06-21T10:00:00Z");
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: "loan-1", status: "returned" }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(
      repository.markReturned("loan-1", date),
    ).resolves.toMatchObject({ status: "returned" });
    await expect(repository.markReturned("loan-2", date)).resolves.toBeNull();
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("status = 'active'"),
      ["loan-1", date],
    );
  });
});
