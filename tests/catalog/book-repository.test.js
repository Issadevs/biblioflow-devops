import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookRepository } from "../../src/catalog/data/book-repository.js";

describe("BookRepository", () => {
  let pool;
  let repository;

  beforeEach(() => {
    pool = { query: vi.fn() };
    repository = new BookRepository(pool);
  });

  it("initialise et alimente la table", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await repository.initialize();
    await repository.seed();
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][0]).toContain(
      "CREATE TABLE IF NOT EXISTS books",
    );
    expect(pool.query.mock.calls[1][0]).toContain(
      "ON CONFLICT (isbn) DO NOTHING",
    );
  });

  it("liste les livres", async () => {
    const books = [{ id: 1, title: "Clean Code" }];
    pool.query.mockResolvedValue({ rows: books });
    await expect(repository.findAll()).resolves.toBe(books);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY id"),
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("id::int AS id"),
    );
  });

  it("trouve un livre ou renvoie null", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(repository.findById(1)).resolves.toEqual({ id: 1 });
    await expect(repository.findById(2)).resolves.toBeNull();
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("WHERE id = $1"),
      [1],
    );
  });

  it("crée un livre", async () => {
    const input = {
      title: "DDD",
      author: "Eric Evans",
      isbn: "9780321125217",
      stock: 2,
    };
    pool.query.mockResolvedValue({ rows: [{ id: 8, ...input }] });
    await expect(repository.create(input)).resolves.toEqual({
      id: 8,
      ...input,
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO books"),
      [input.title, input.author, input.isbn, input.stock],
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("RETURNING id::int AS id"),
      expect.any(Array),
    );
  });

  it("ajuste le stock de façon atomique", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, stock: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(repository.adjustStock(1, -1)).resolves.toEqual({
      id: 1,
      stock: 1,
    });
    await expect(repository.adjustStock(1, -2)).resolves.toBeNull();
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("stock + $2 >= 0"),
      [1, -1],
    );
  });
});
