import { AppError } from "../../shared/app-error.js";

export class CatalogClient {
  constructor(baseUrl, { timeoutMs = 3000, fetchImplementation = fetch } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImplementation;
  }

  getBook(id) {
    return this.request(`/books/${id}`);
  }

  adjustStock(id, delta) {
    return this.request(`/books/${id}/stock`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delta }),
    });
  }

  async request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new AppError(
          response.status,
          payload.error?.code ?? "CATALOG_ERROR",
          payload.error?.message ?? "Le catalogue a refusé la requête",
        );
      }
      return payload.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        503,
        "CATALOG_UNAVAILABLE",
        "Le catalogue est indisponible",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
