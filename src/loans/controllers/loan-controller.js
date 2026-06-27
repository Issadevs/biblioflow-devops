import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../shared/app-error.js";
import { asyncHandler } from "../../shared/http.js";

const loanSchema = z.object({
  bookId: z.number().int().positive(),
  borrowerName: z.string().trim().min(2).max(120),
});
const idSchema = z.string().uuid();

const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Données invalides",
      result.error.flatten(),
    );
  }
  return result.data;
};

export const createLoanRouter = (loanService) => {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      response.json({ data: await loanService.listLoans() });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      response.status(201).json({
        data: await loanService.createLoan(parse(loanSchema, request.body)),
      });
    }),
  );

  router.post(
    "/:id/return",
    asyncHandler(async (request, response) => {
      response.json({
        data: await loanService.returnLoan(parse(idSchema, request.params.id)),
      });
    }),
  );

  return router;
};
