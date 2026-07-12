import * as expenseService from "./expense.service.js";

/** @route POST /api/expenses */
export async function createExpense(req, res, next) {
  try {
    const expense = await expenseService.createExpense(req.body);
    return res.status(201).json({ success: true, message: "Expense recorded.", data: expense });
  } catch (error) {
    next(error);
  }
}

/** @route GET /api/expenses — optional ?vehicleId=, ?tripId=, ?type= filters. */
export async function getExpenses(req, res, next) {
  try {
    const expenses = await expenseService.getExpenses({
      vehicleId: req.query.vehicleId,
      tripId: req.query.tripId,
      type: req.query.type,
    });
    return res.status(200).json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    next(error);
  }
}
