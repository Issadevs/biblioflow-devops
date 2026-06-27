import { createDatabasePool } from "../shared/database.js";
import { readPort, requireConfig } from "../shared/config.js";
import { BookRepository } from "./data/book-repository.js";
import { BookService } from "./services/book-service.js";
import { createCatalogApp } from "./app.js";

const port = readPort(process.env.PORT ?? process.env.CATALOG_PORT, 3001);
const databaseUrl = requireConfig(
  "DATABASE_URL",
  process.env.DATABASE_URL ?? process.env.CATALOG_DATABASE_URL,
);
const pool = createDatabasePool(databaseUrl);
const repository = new BookRepository(pool);

await repository.initialize();
await repository.seed();

const server = createCatalogApp({
  bookService: new BookService(repository),
}).listen(port, () => {
  console.info(`Catalogue disponible sur le port ${port}`);
});

const shutdown = () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
