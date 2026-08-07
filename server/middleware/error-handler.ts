import type { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";

export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const message =
    env.nodeEnv === "production"
      ? "Si è verificato un errore imprevisto. Riprova più tardi."
      : err instanceof Error
        ? err.message
        : "Unknown error";
  res.status(500).json({ error: message });
};
