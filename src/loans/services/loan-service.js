import { randomUUID } from "node:crypto";
import { AppError } from "../../shared/app-error.js";

export class LoanService {
  constructor(
    repository,
    catalogClient,
    { clock = () => new Date(), idGenerator = randomUUID } = {},
  ) {
    this.repository = repository;
    this.catalogClient = catalogClient;
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  listLoans() {
    return this.repository.findAll();
  }

  async createLoan({ bookId, borrowerName }) {
    const book = await this.catalogClient.getBook(bookId);
    if (book.stock < 1) {
      throw new AppError(
        409,
        "INSUFFICIENT_STOCK",
        "Aucun exemplaire disponible",
      );
    }

    await this.catalogClient.adjustStock(bookId, -1);
    try {
      return await this.repository.create({
        id: this.idGenerator(),
        bookId,
        borrowerName,
        status: "active",
        loanedAt: this.clock(),
      });
    } catch (error) {
      await this.catalogClient.adjustStock(bookId, 1);
      throw error;
    }
  }

  async returnLoan(id) {
    const loan = await this.repository.findById(id);
    if (!loan) {
      throw new AppError(404, "LOAN_NOT_FOUND", "Emprunt introuvable");
    }
    if (loan.status === "returned") {
      throw new AppError(
        409,
        "LOAN_ALREADY_RETURNED",
        "Cet emprunt est déjà rendu",
      );
    }

    await this.catalogClient.adjustStock(loan.book_id, 1);
    try {
      const returnedLoan = await this.repository.markReturned(id, this.clock());
      if (!returnedLoan) {
        throw new AppError(
          409,
          "LOAN_ALREADY_RETURNED",
          "Cet emprunt est déjà rendu",
        );
      }
      return returnedLoan;
    } catch (error) {
      await this.catalogClient.adjustStock(loan.book_id, -1);
      throw error;
    }
  }
}
