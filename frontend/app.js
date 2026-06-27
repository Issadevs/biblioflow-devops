const state = { books: [], loans: [] };

const elements = {
  alert: document.querySelector("#alert"),
  systemStatus: document.querySelector("#system-status"),
  systemStatusLabel: document.querySelector("#system-status-label"),
  bookCount: document.querySelector("#book-count"),
  stockCount: document.querySelector("#stock-count"),
  loanCount: document.querySelector("#loan-count"),
  bookGrid: document.querySelector("#book-grid"),
  loanList: document.querySelector("#loan-list"),
  bookSelect: document.querySelector("#book"),
  loanForm: document.querySelector("#loan-form"),
  bookForm: document.querySelector("#book-form"),
  refreshButton: document.querySelector("#refresh-button"),
};

const request = async (url, options) => {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error?.message ?? "La requête a échoué");
  return payload.data;
};

const setConnectivity = (connected) => {
  elements.systemStatus.classList.toggle("offline", !connected);
  elements.systemStatusLabel.textContent = connected
    ? "Services connectés"
    : "Services indisponibles";
};

const showMessage = (message, success = false) => {
  elements.alert.textContent = message;
  elements.alert.classList.toggle("success", success);
  elements.alert.hidden = false;
};

const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const renderBooks = () => {
  elements.bookGrid.replaceChildren();
  elements.bookSelect.replaceChildren(new Option("Choisir un livre", ""));

  if (!state.books.length) {
    elements.bookGrid.append(
      createElement("p", "empty-state", "Aucun livre dans le catalogue."),
    );
    return;
  }

  state.books.forEach((book) => {
    const card = createElement("article", "book-card");
    card.append(
      createElement("h3", "", book.title),
      createElement("p", "", book.author),
    );
    const meta = createElement("div", "book-meta");
    meta.append(createElement("span", "", `ISBN ${book.isbn}`));
    meta.append(
      createElement(
        "span",
        `stock${book.stock === 0 ? " empty" : ""}`,
        `${book.stock} disponible${book.stock > 1 ? "s" : ""}`,
      ),
    );
    card.append(meta);
    elements.bookGrid.append(card);

    if (book.stock > 0)
      elements.bookSelect.append(
        new Option(`${book.title} (${book.stock})`, book.id),
      );
  });
};

const renderLoans = () => {
  elements.loanList.replaceChildren();
  if (!state.loans.length) {
    elements.loanList.append(
      createElement("p", "empty-state", "Aucun emprunt enregistré."),
    );
    return;
  }

  state.loans.forEach((loan) => {
    const book = state.books.find(
      (item) => String(item.id) === String(loan.book_id),
    );
    const row = createElement("article", "loan-row");
    const identity = createElement("div");
    identity.append(
      createElement("strong", "", loan.borrower_name),
      createElement("small", "", book?.title ?? `Livre #${loan.book_id}`),
    );
    row.append(
      identity,
      createElement(
        "span",
        `status ${loan.status}`,
        loan.status === "active" ? "En cours" : "Rendu",
      ),
    );
    if (loan.status === "active") {
      const button = createElement("button", "return-button", "Marquer rendu");
      button.type = "button";
      button.addEventListener("click", () => returnLoan(loan.id));
      row.append(button);
    } else {
      row.append(createElement("span", "", ""));
    }
    elements.loanList.append(row);
  });
};

const render = () => {
  elements.bookCount.textContent = state.books.length;
  elements.stockCount.textContent = state.books.reduce(
    (sum, book) => sum + book.stock,
    0,
  );
  elements.loanCount.textContent = state.loans.filter(
    (loan) => loan.status === "active",
  ).length;
  renderBooks();
  renderLoans();
};

const load = async ({ clearMessage = true } = {}) => {
  try {
    [state.books, state.loans] = await Promise.all([
      request("/api/books"),
      request("/api/loans"),
    ]);
    if (clearMessage) elements.alert.hidden = true;
    setConnectivity(true);
    render();
    return true;
  } catch (error) {
    setConnectivity(false);
    showMessage(error.message);
    return false;
  }
};

const returnLoan = async (id) => {
  try {
    await request(`/api/loans/${id}/return`, { method: "POST" });
    if (await load({ clearMessage: false }))
      showMessage("Retour enregistré.", true);
  } catch (error) {
    showMessage(error.message);
  }
};

elements.loanForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  try {
    await request("/api/loans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bookId: Number(data.get("bookId")),
        borrowerName: data.get("borrowerName"),
      }),
    });
    form.reset();
    if (await load({ clearMessage: false }))
      showMessage("Emprunt enregistré.", true);
  } catch (error) {
    showMessage(error.message);
  }
});

elements.bookForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  try {
    await request("/api/books", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        author: data.get("author"),
        isbn: data.get("isbn"),
        stock: Number(data.get("stock")),
      }),
    });
    form.reset();
    if (await load({ clearMessage: false }))
      showMessage("Livre ajouté au catalogue.", true);
  } catch (error) {
    showMessage(error.message);
  }
});

elements.refreshButton.addEventListener("click", () => load());
load();
