import { Router } from "express";
import { getMushafPage } from "../controllers/mushaf.controller.js";

const router = Router();

router.get("/pages/:number", getMushafPage);

export default router;