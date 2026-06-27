import { createDatabasePool } from "../shared/database.js";
import { readPort, requireConfig } from "../shared/config.js";
import { LoanRepository } from "./data/loan-repository.js";
import { CatalogClient } from "./services/catalog-client.js";
import { LoanService } from "./services/loan-service.js";
import { createLoanApp } from "./app.js";

const port = readPort(process.env.PORT ?? process.env.LOAN_PORT, 3002);
const databaseUrl = requireConfig(
  "DATABASE_URL",
  process.env.DATABASE_URL ?? process.env.LOAN_DATABASE_URL,
);
const catalogUrl = requireConfig(
  "CATALOG_SERVICE_URL",
  process.env.CATALOG_SERVICE_URL,
);
const pool = createDatabasePool(databaseUrl);
const repository = new LoanRepository(pool);

await repository.initialize();

const loanService = new LoanService(repository, new CatalogClient(catalogUrl));
const server = createLoanApp({ loanService }).listen(port, () => {
  console.info(`Emprunts disponibles sur le port ${port}`);
});

const shutdown = () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
