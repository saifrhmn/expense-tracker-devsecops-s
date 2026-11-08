import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";
import expenseRoutes from "./routes/expenses.js";


dotenv.config();

export const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN }));
app.use(express.json());
app.use(morgan("combined"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "expense-tracker-api",
    mongoState: mongoose.connection.readyState,
    timestamp: new Date().toISOString()
  });
});

app.use("/api/expenses", expenseRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Server error"
  });
});

