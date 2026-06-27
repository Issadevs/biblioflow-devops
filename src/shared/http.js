import { AppError } from "./app-error.js";

export const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

export const notFoundHandler = (request, _response, next) => {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `Route ${request.method} ${request.path} inconnue`,
    ),
  );
};

export const errorHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    return response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({
      error: { code: "INVALID_JSON", message: "Le corps JSON est invalide" },
    });
  }

  console.error("Erreur inattendue", error);
  return response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Une erreur interne est survenue",
    },
  });
};
