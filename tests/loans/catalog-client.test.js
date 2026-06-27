import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogClient } from "../../src/loans/services/catalog-client.js";

describe("CatalogClient (mock HTTP)", () => {
  let fetchMock;
  let client;

  beforeEach(() => {
    fetchMock = vi.fn();
    client = new CatalogClient("http://catalog.test/api/", {
      fetchImplementation: fetchMock,
      timeoutMs: 100,
    });
  });

  it("récupère un livre via HTTP", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 4, stock: 2 } }), {
        status: 200,
      }),
    );
    await expect(client.getBook(4)).resolves.toEqual({ id: 4, stock: 2 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://catalog.test/api/books/4",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("modifie un stock via HTTP", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 2, stock: 1 } }), {
        status: 200,
      }),
    );
    await client.adjustStock(2, -1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://catalog.test/api/books/2/stock",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ delta: -1 }),
      }),
    );
  });

  it("propage une erreur structurée du catalogue", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "BOOK_NOT_FOUND", message: "Absent" },
        }),
        { status: 404 },
      ),
    );
    await expect(client.getBook(9)).rejects.toMatchObject({
      status: 404,
      code: "BOOK_NOT_FOUND",
      message: "Absent",
    });
  });

  it("utilise un message de repli pour une erreur HTTP non JSON", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 502 }));
    await expect(client.getBook(1)).rejects.toMatchObject({
      status: 502,
      code: "CATALOG_ERROR",
    });
  });

  it("traduit une panne réseau", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(client.getBook(1)).rejects.toMatchObject({
      status: 503,
      code: "CATALOG_UNAVAILABLE",
    });
  });
});
