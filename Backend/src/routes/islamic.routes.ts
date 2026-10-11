
import { Router } from "express";

import {
  hadithCollections,
  randomHadith,
  searchHadith,
  browseHadith,
  specificHadith,
  allDuas,
  duaCategories,
  randomDua,
  searchDuas,
  duasByCategory,
  specificDua,
  allNamesOfAllah,
  specificNameOfAllah,
  randomNameOfAllah,
  searchNamesOfAllah,
  dailyNamesOfAllah,
} from "../controllers/islamic.controller.js";

const router = Router();

// HADITHS
router.get("/hadith/collections", hadithCollections);
router.get("/hadith/random", randomHadith);
router.get("/hadith/search", searchHadith);
router.get("/hadith/:collection/:number", specificHadith);
router.get("/hadith/:collection", browseHadith);

// DUAS
router.get("/duas/categories", duaCategories);
router.get("/duas/random", randomDua);
router.get("/duas/search", searchDuas);
router.get("/duas/category/:category", duasByCategory);
router.get("/duas/:id", specificDua);
router.get("/duas", allDuas);

// 99 NOMS D'ALLAH
router.get("/asma-ul-husna/random", randomNameOfAllah);
router.get("/asma-ul-husna/search", searchNamesOfAllah);
router.get("/asma-ul-husna/daily/:day", dailyNamesOfAllah);
router.get("/asma-ul-husna/:number", specificNameOfAllah);
router.get("/asma-ul-husna", allNamesOfAllah);

export default router;