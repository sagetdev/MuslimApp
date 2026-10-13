
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

  // Erreurs 4xx émises par Express/body-parser (JSON invalide, payload trop gros…).
  const status =
    typeof error?.status === "number" ? error.status : error?.statusCode;

  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({
      error: {
        code: "BAD_REQUEST",
        message:
          status === 413 ? "Request body is too large." : "Invalid request.",
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
