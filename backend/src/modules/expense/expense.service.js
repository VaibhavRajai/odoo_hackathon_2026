import * as expenseRepository from "./expense.repository.js";

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

/**
 * Record a miscellaneous vehicle expense — tolls, parking, fines, etc.
 * Separate from fuel logs and maintenance records (own entity per spec).
 */
export async function createExpense(data) {
  const { vehicleId, type, amount, date, description, tripId } = data;

  if (!vehicleId) fail("vehicleId is required.", 400);
  if (!type?.trim()) fail("Expense type is required.", 400);

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    fail("Amount must be a number greater than 0.", 400);
  }

  const vehicle = await expenseRepository.findVehicleById(vehicleId);
  if (!vehicle) fail("Vehicle not found.", 404);

  let parsedDate = new Date();
  if (date) {
    parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) fail("Date is invalid.", 400);
  }

  if (tripId) {
    const trip = await expenseRepository.findTripById(tripId);
    if (!trip) fail("Trip not found.", 404);
  }

  return expenseRepository.createExpense({
    vehicleId,
    type: type.trim(),
    amount: parsedAmount,
    date: parsedDate,
    description: description?.trim() || null,
    tripId: tripId || null,
  });
}

/**
 * List expenses, optionally filtered by vehicle/trip/type.
 */
export async function getExpenses(filters = {}) {
  const { vehicleId, tripId, type } = filters;
  const where = {};

  if (vehicleId) where.vehicleId = vehicleId;
  if (tripId) where.tripId = tripId;
  if (type?.trim() && type !== "All") where.type = { equals: type.trim(), mode: "insensitive" };

  return expenseRepository.findExpenses(where);
}
