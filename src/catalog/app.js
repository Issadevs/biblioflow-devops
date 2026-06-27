import express from "express";
import helmet from "helmet";
import { createBookRouter } from "./controllers/book-controller.js";
import { errorHandler, notFoundHandler } from "../shared/http.js";

export const createCatalogApp = ({ bookService }) => {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", (_request, response) =>
    response.json({ status: "ok", service: "catalog" }),
  );
  app.use("/api/books", createBookRouter(bookService));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
