// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue({ data }),
});

describe("tableau de bord", () => {
  it("conserve les confirmations et reflète la disponibilité des services", async () => {
    globalThis.document.body.innerHTML = `
      <span id="system-status" class="system-status">
        <i></i><span id="system-status-label">Connexion…</span>
      </span>
      <div id="alert" hidden></div>
      <strong id="book-count"></strong>
      <strong id="stock-count"></strong>
      <strong id="loan-count"></strong>
      <div id="book-grid"></div>
      <div id="loan-list"></div>
      <form id="loan-form">
        <input name="borrowerName" />
        <select id="book" name="bookId"></select>
      </form>
      <form id="book-form">
        <input name="title" />
        <input name="author" />
        <input name="isbn" />
        <input name="stock" />
      </form>
      <button id="refresh-button" type="button"></button>
    `;

    const firstBook = {
      id: 1,
      title: "Clean Code",
      author: "Robert C. Martin",
      isbn: "9780132350884",
      stock: 2,
    };
    const secondBook = {
      id: 2,
      title: "Refactoring",
      author: "Martin Fowler",
      isbn: "9780134757599",
      stock: 1,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response([firstBook]))
      .mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    await import("../../frontend/app.js");

    await vi.waitFor(() => {
      expect(
        globalThis.document.querySelector("#system-status-label").textContent,
      ).toBe("Services connectés");
    });
    expect(globalThis.document.querySelector("#book-count").textContent).toBe(
      "1",
    );

    fetchMock
      .mockResolvedValueOnce(response(secondBook, 201))
      .mockResolvedValueOnce(response([firstBook, secondBook]))
      .mockResolvedValueOnce(response([]));

    const form = globalThis.document.querySelector("#book-form");
    form.elements.title.value = secondBook.title;
    form.elements.author.value = secondBook.author;
    form.elements.isbn.value = secondBook.isbn;
    form.elements.stock.value = String(secondBook.stock);
    form.dispatchEvent(
      new globalThis.Event("submit", { bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() => {
      expect(globalThis.document.querySelector("#alert").textContent).toBe(
        "Livre ajouté au catalogue.",
      );
    });
    expect(globalThis.document.querySelector("#alert").hidden).toBe(false);
    expect(globalThis.document.querySelector("#alert").classList).toContain(
      "success",
    );
    expect(globalThis.document.querySelector("#book-count").textContent).toBe(
      "2",
    );

    fetchMock
      .mockRejectedValueOnce(new Error("réseau indisponible"))
      .mockRejectedValueOnce(new Error("réseau indisponible"));
    globalThis.document.querySelector("#refresh-button").click();

    await vi.waitFor(() => {
      expect(
        globalThis.document.querySelector("#system-status-label").textContent,
      ).toBe("Services indisponibles");
    });
    expect(
      globalThis.document.querySelector("#system-status").classList,
    ).toContain("offline");
    expect(globalThis.document.querySelector("#alert").textContent).toBe(
      "réseau indisponible",
    );
  });
});
