import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookService } from "../../src/catalog/services/book-service.js";

describe("BookService", () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      adjustStock: vi.fn(),
    };
    service = new BookService(repository);
  });

  it("liste les livres", async () => {
    repository.findAll.mockResolvedValue([{ id: 1 }]);
    await expect(service.listBooks()).resolves.toEqual([{ id: 1 }]);
  });

  it("récupère un livre existant", async () => {
    repository.findById.mockResolvedValue({ id: 1 });
    await expect(service.getBook(1)).resolves.toEqual({ id: 1 });
  });

  it("signale un livre absent", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getBook(1)).rejects.toMatchObject({
      status: 404,
      code: "BOOK_NOT_FOUND",
    });
  });

  it("crée un livre", async () => {
    const book = { title: "Refactoring" };
    repository.create.mockResolvedValue({ id: 2, ...book });
    await expect(service.createBook(book)).resolves.toEqual({ id: 2, ...book });
  });

  it("traduit le conflit ISBN", async () => {
    repository.create.mockRejectedValue({ code: "23505" });
    await expect(service.createBook({})).rejects.toMatchObject({
      status: 409,
      code: "ISBN_ALREADY_EXISTS",
    });
  });

  it("conserve les erreurs de création inconnues", async () => {
    const error = new Error("db down");
    repository.create.mockRejectedValue(error);
    await expect(service.createBook({})).rejects.toBe(error);
  });

  it("ajuste le stock", async () => {
    repository.adjustStock.mockResolvedValue({ id: 1, stock: 3 });
    await expect(service.adjustStock(1, 1)).resolves.toEqual({
      id: 1,
      stock: 3,
    });
  });

  it("distingue un livre absent d’un stock insuffisant", async () => {
    repository.adjustStock.mockResolvedValue(null);
    repository.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, stock: 0 });
    await expect(service.adjustStock(9, -1)).rejects.toMatchObject({
      code: "BOOK_NOT_FOUND",
    });
    await expect(service.adjustStock(1, -1)).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
  });
});
