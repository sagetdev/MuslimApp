// src/routes/mushaf.routes.ts
import { Router } from "express";
import {
  getMushafPage,
  getAllMushafPages,
} from "../controllers/mushaf.controller.js";

const router = Router();

// ⚠️ Doit venir AVANT /pages/:number
router.get("/all-pages", getAllMushafPages);

router.get("/pages/:number", getMushafPage);

export default router;