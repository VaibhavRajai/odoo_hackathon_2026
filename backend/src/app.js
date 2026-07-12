import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./modules/auth/auth.routes.js";
import vehicleRouter from "./modules/vehicle/vehicle.routes.js";

const app = express();

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true, // Required for cookies
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/vehicles", vehicleRouter);


// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Service is healthy.", timestamp: new Date().toISOString() });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = (err.status || err.statusCode) ? err.message : "An unexpected error occurred. Please try again later.";

  // Never leak internal error details in production
  if (!err.status && !err.statusCode) {
    console.error("[App] Unhandled error:", err);
  }

  res.status(status).json({ success: false, message });
});

export default app;
