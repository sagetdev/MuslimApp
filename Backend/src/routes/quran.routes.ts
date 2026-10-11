
import { Router } from "express";

import {
  getAyah,
  getSurahs,
  getSurah,
  getPage,
  searchQuranController,
} from "../controllers/quran.controller.js";

const router = Router();

router.get("/surahs", getSurahs);
router.get("/surahs/:number", getSurah);
router.get("/pages/:number", getPage);
router.get("/search", searchQuranController);

router.get("/:surah/:ayah", getAyah);

export default router;
