import { AppError } from "../../shared/app-error.js";

export class BookService {
  constructor(repository) {
    this.repository = repository;
  }

  listBooks() {
    return this.repository.findAll();
  }

  async getBook(id) {
    const book = await this.repository.findById(id);
    if (!book) {
      throw new AppError(404, "BOOK_NOT_FOUND", "Livre introuvable");
    }
    return book;
  }

  async createBook(input) {
    try {
      return await this.repository.create(input);
    } catch (error) {
      if (error?.code === "23505") {
        throw new AppError(409, "ISBN_ALREADY_EXISTS", "Cet ISBN existe déjà");
      }
      throw error;
    }
  }

  async adjustStock(id, delta) {
    const book = await this.repository.adjustStock(id, delta);
    if (book) return book;

    const existingBook = await this.repository.findById(id);
    if (!existingBook) {
      throw new AppError(404, "BOOK_NOT_FOUND", "Livre introuvable");
    }
    throw new AppError(409, "INSUFFICIENT_STOCK", "Stock insuffisant");
  }
}
