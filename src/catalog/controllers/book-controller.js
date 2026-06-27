import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../shared/app-error.js";
import { asyncHandler } from "../../shared/http.js";

const idSchema = z.coerce.number().int().positive();
const bookSchema = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
  isbn: z.string().regex(/^\d{13}$/, "ISBN à 13 chiffres requis"),
  stock: z.number().int().min(0).max(10_000),
});
const stockSchema = z.object({
  delta: z
    .number()
    .int()
    .min(-1000)
    .max(1000)
    .refine((value) => value !== 0),
});

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

export const createBookRouter = (bookService) => {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      response.json({ data: await bookService.listBooks() });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (request, response) => {
      response.json({
        data: await bookService.getBook(parse(idSchema, request.params.id)),
      });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const book = await bookService.createBook(
        parse(bookSchema, request.body),
      );
      response.status(201).json({ data: book });
    }),
  );

  router.patch(
    "/:id/stock",
    asyncHandler(async (request, response) => {
      const book = await bookService.adjustStock(
        parse(idSchema, request.params.id),
        parse(stockSchema, request.body).delta,
      );
      response.json({ data: book });
    }),
  );

  return router;
};
