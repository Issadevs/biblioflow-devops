import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCatalogApp } from "../../src/catalog/app.js";
import { AppError } from "../../src/shared/app-error.js";

describe("API catalogue", () => {
  let bookService;
  let app;

  beforeEach(() => {
    bookService = {
      listBooks: vi.fn(),
      getBook: vi.fn(),
      createBook: vi.fn(),
      adjustStock: vi.fn(),
    };
    app = createCatalogApp({ bookService });
  });

  it("expose la santé du service", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok", service: "catalog" });
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("liste les livres", async () => {
    bookService.listBooks.mockResolvedValue([{ id: 1 }]);
    const response = await request(app).get("/api/books").expect(200);
    expect(response.body.data).toEqual([{ id: 1 }]);
  });

  it("récupère un livre", async () => {
    bookService.getBook.mockResolvedValue({ id: 2 });
    const response = await request(app).get("/api/books/2").expect(200);
    expect(bookService.getBook).toHaveBeenCalledWith(2);
    expect(response.body.data.id).toBe(2);
  });

  it("crée un livre après validation", async () => {
    const payload = {
      title: "  Refactoring  ",
      author: " Martin Fowler ",
      isbn: "9780134757599",
      stock: 2,
    };
    bookService.createBook.mockImplementation((book) => ({ id: 3, ...book }));
    const response = await request(app)
      .post("/api/books")
      .send(payload)
      .expect(201);
    expect(bookService.createBook).toHaveBeenCalledWith({
      title: "Refactoring",
      author: "Martin Fowler",
      isbn: payload.isbn,
      stock: 2,
    });
    expect(response.body.data.id).toBe(3);
  });

  it("ajuste un stock", async () => {
    bookService.adjustStock.mockResolvedValue({ id: 1, stock: 1 });
    await request(app)
      .patch("/api/books/1/stock")
      .send({ delta: -1 })
      .expect(200);
    expect(bookService.adjustStock).toHaveBeenCalledWith(1, -1);
  });

  it.each([
    ["GET", "/api/books/nope", undefined],
    ["POST", "/api/books", { title: "", author: "A", isbn: "123", stock: -1 }],
    ["PATCH", "/api/books/1/stock", { delta: 0 }],
  ])("refuse une requête invalide %s %s", async (method, path, body) => {
    const call = request(app)[method.toLowerCase()](path);
    const response = await (body ? call.send(body) : call).expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("formate les erreurs métier", async () => {
    bookService.getBook.mockRejectedValue(
      new AppError(404, "BOOK_NOT_FOUND", "Absent", { id: 9 }),
    );
    const response = await request(app).get("/api/books/9").expect(404);
    expect(response.body.error).toEqual({
      code: "BOOK_NOT_FOUND",
      message: "Absent",
      details: { id: 9 },
    });
  });

  it("formate le JSON invalide et les routes absentes", async () => {
    const invalid = await request(app)
      .post("/api/books")
      .set("content-type", "application/json")
      .send("{")
      .expect(400);
    expect(invalid.body.error.code).toBe("INVALID_JSON");

    const missing = await request(app).get("/missing").expect(404);
    expect(missing.body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("masque une erreur interne", async () => {
    bookService.listBooks.mockRejectedValue(new Error("secret"));
    const response = await request(app).get("/api/books").expect(500);
    expect(response.body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Une erreur interne est survenue",
    });
  });
});
