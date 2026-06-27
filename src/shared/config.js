import { AppError } from "./app-error.js";

export const readPort = (value, fallback) => {
  const port = Number(value ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new AppError(500, "INVALID_CONFIG", `Port invalide: ${value}`);
  }
  return port;
};

export const requireConfig = (name, value) => {
  if (!value) {
    throw new AppError(500, "INVALID_CONFIG", `Variable ${name} manquante`);
  }
  return value;
};
