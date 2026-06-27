import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoanService } from "../../src/loans/services/loan-service.js";

describe("LoanService", () => {
  const now = new Date("2026-06-20T10:00:00Z");
  const loanId = "9cda25a8-7a0d-4a1e-8fb2-68ee9430263d";
  let repository;
  let catalogClient;
  let service;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      markReturned: vi.fn(),
    };
    catalogClient = { getBook: vi.fn(), adjustStock: vi.fn() };
    service = new LoanService(repository, catalogClient, {
      clock: () => now,
      idGenerator: () => loanId,
    });
  });

  it("liste les emprunts", async () => {
    repository.findAll.mockResolvedValue([{ id: loanId }]);
    await expect(service.listLoans()).resolves.toEqual([{ id: loanId }]);
  });

  it("crée un emprunt et réserve un exemplaire", async () => {
    catalogClient.getBook.mockResolvedValue({ id: 2, stock: 3 });
    catalogClient.adjustStock.mockResolvedValue({ stock: 2 });
    repository.create.mockImplementation((loan) => loan);

    await expect(
      service.createLoan({ bookId: 2, borrowerName: "Ada" }),
    ).resolves.toEqual({
      id: loanId,
      bookId: 2,
      borrowerName: "Ada",
      status: "active",
      loanedAt: now,
    });
    expect(catalogClient.adjustStock).toHaveBeenCalledWith(2, -1);
  });

  it("refuse un livre indisponible", async () => {
    catalogClient.getBook.mockResolvedValue({ id: 2, stock: 0 });
    await expect(
      service.createLoan({ bookId: 2, borrowerName: "Ada" }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
    expect(catalogClient.adjustStock).not.toHaveBeenCalled();
  });

  it("compense le stock si la sauvegarde échoue", async () => {
    const databaseError = new Error("database down");
    catalogClient.getBook.mockResolvedValue({ id: 2, stock: 1 });
    catalogClient.adjustStock.mockResolvedValue({});
    repository.create.mockRejectedValue(databaseError);
    await expect(
      service.createLoan({ bookId: 2, borrowerName: "Ada" }),
    ).rejects.toBe(databaseError);
    expect(catalogClient.adjustStock).toHaveBeenNthCalledWith(1, 2, -1);
    expect(catalogClient.adjustStock).toHaveBeenNthCalledWith(2, 2, 1);
  });

  it("rend un emprunt et restitue le stock", async () => {
    const loan = { id: loanId, book_id: 2, status: "active" };
    repository.findById.mockResolvedValue(loan);
    repository.markReturned.mockResolvedValue({
      ...loan,
      status: "returned",
      returned_at: now,
    });
    await expect(service.returnLoan(loanId)).resolves.toMatchObject({
      status: "returned",
    });
    expect(catalogClient.adjustStock).toHaveBeenCalledWith(2, 1);
    expect(repository.markReturned).toHaveBeenCalledWith(loanId, now);
  });

  it("refuse un emprunt absent ou déjà rendu", async () => {
    repository.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: loanId, status: "returned" });
    await expect(service.returnLoan(loanId)).rejects.toMatchObject({
      code: "LOAN_NOT_FOUND",
    });
    await expect(service.returnLoan(loanId)).rejects.toMatchObject({
      code: "LOAN_ALREADY_RETURNED",
    });
  });

  it.each([
    ["une mise à jour concurrente", null],
    ["une panne de base", new Error("database down")],
  ])("compense le stock après %s", async (_label, result) => {
    const loan = { id: loanId, book_id: 3, status: "active" };
    repository.findById.mockResolvedValue(loan);
    if (result instanceof Error)
      repository.markReturned.mockRejectedValue(result);
    else repository.markReturned.mockResolvedValue(result);

    await expect(service.returnLoan(loanId)).rejects.toBeTruthy();
    expect(catalogClient.adjustStock).toHaveBeenNthCalledWith(1, 3, 1);
    expect(catalogClient.adjustStock).toHaveBeenNthCalledWith(2, 3, -1);
  });
});
