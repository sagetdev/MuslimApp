
import type { ErrorRequestHandler } from "express";
import { UmmahApiError } from "../services/ummah.service.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof UmmahApiError) {
    res.status(error.statusCode).json({
      error: {
        code: "QURAN_API_ERROR",
        message: error.message,
      },
    });
    return;
  }

  console.error("Unhandled API error:", error);

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
};
