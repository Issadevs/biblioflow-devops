import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://localhost:8080";
const headers = { "content-type": "application/json" };

const call = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload.data;
};

const front = await fetch(`${baseUrl}/`);
if (!front.ok) throw new Error(`Front indisponible: HTTP ${front.status}`);

const book = await call("/api/books", {
  method: "POST",
  headers,
  body: JSON.stringify({
    title: "Accelerate - Test E2E",
    author: "Nicole Forsgren",
    isbn: `900${String(Date.now()).slice(-10)}`,
    stock: 2,
  }),
});
if (!Number.isInteger(book.id))
  throw new Error(`Identifiant de livre non numérique: ${book.id}`);

const loan = await call("/api/loans", {
  method: "POST",
  headers,
  body: JSON.stringify({
    bookId: Number(book.id),
    borrowerName: "Test intégration",
  }),
});

const afterLoan = await call(`/api/books/${book.id}`);
if (afterLoan.stock !== 1)
  throw new Error(`Stock après emprunt incorrect: ${afterLoan.stock}`);

const loans = await call("/api/loans");
const persistedLoan = loans.find((item) => item.id === loan.id);
if (!persistedLoan || !Number.isInteger(persistedLoan.book_id)) {
  throw new Error("Référence de livre non numérique dans l'emprunt");
}

const returnedLoan = await call(`/api/loans/${loan.id}/return`, {
  method: "POST",
});
const afterReturn = await call(`/api/books/${book.id}`);
if (returnedLoan.status !== "returned" || afterReturn.stock !== 2) {
  throw new Error("Retour ou restauration du stock incorrect");
}

const result = {
  status: "passed",
  baseUrl,
  frontStatus: front.status,
  bookId: book.id,
  loanId: loan.id,
  stockAfterLoan: afterLoan.stock,
  loanStatus: returnedLoan.status,
  stockAfterReturn: afterReturn.stock,
  executedAt: new Date().toISOString(),
};

await mkdir("reports", { recursive: true });
await writeFile(
  "reports/integration.json",
  `${JSON.stringify(result, null, 2)}\n`,
);
console.info(JSON.stringify(result, null, 2));
