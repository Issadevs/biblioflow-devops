import express from "express";
import helmet from "helmet";
import { createLoanRouter } from "./controllers/loan-controller.js";
import { errorHandler, notFoundHandler } from "../shared/http.js";

export const createLoanApp = ({ loanService }) => {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", (_request, response) =>
    response.json({ status: "ok", service: "loans" }),
  );
  app.use("/api/loans", createLoanRouter(loanService));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
