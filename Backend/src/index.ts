import path from "node:path";
import express from "express";
import cors from "cors";
import compression from "compression";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";

import quranRoutes from "./routes/quran.routes.js";
import islamicRoutes from "./routes/islamic.routes.js";
import prayerCalendarRoutes from "./routes/prayer-calendar.routes.js";
import mushafRoutes from "./routes/mushaf.routes.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "muslimapp-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/quran", quranRoutes);
app.use("/api", islamicRoutes);
app.use("/api", prayerCalendarRoutes);
app.use("/api/mushaf", mushafRoutes);

// Frontend web (build Expo copié dans Backend/public)
const publicDir = path.join(process.cwd(), "public");

app.use(
  express.static(publicDir, {
    // Les bundles Expo sont hachés : cache long. index.html reste toujours revalidé.
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (/[\\/]_expo[\\/]|[\\/]assets[\\/]/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

app.get("/{*splat}", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();

  res.sendFile(path.join(publicDir, "index.html"), (error) => {
    if (error) next();
  });
});

app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
    },
  });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`MuslimApp API running at http://localhost:${env.PORT}`);
});