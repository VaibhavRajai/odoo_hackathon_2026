import express from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { createExpense, getExpenses } from "./expense.controller.js";

const router = express.Router();

/** POST /api/expenses — log a toll/parking/fine/other vehicle expense. */
router.post("/", authenticate, requireRole("Dispatcher", "Fleet Manager"), createExpense);

/** GET /api/expenses — optional ?vehicleId=, ?tripId=, ?type= filters. Any authenticated role (Financial Analyst reads these for reporting). */
router.get("/", authenticate, getExpenses);

export default router;
