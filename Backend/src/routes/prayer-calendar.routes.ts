
import { Router } from "express";

import {
  getPrayerTimes,
  getPrayerMethods,
  getMonthlyPrayerTimes,
  getQibla,
  getTodayHijri,
  convertToHijri,
  convertToGregorian,
  getIslamicMonths,
  getIslamicEvents,
} from "../controllers/prayer-calendar.controller.js";

const router = Router();

// Horaires de prière
router.get("/prayer-times/methods", getPrayerMethods);
router.get("/prayer-times/month", getMonthlyPrayerTimes);
router.get("/prayer-times", getPrayerTimes);

// Direction de la Qibla
router.get("/qibla", getQibla);

// Calendrier hégirien
router.get("/today-hijri", getTodayHijri);
router.get("/hijri-date", convertToHijri);
router.get("/gregorian-date", convertToGregorian);
router.get("/islamic-months", getIslamicMonths);
router.get("/islamic-events", getIslamicEvents);

export default router;
