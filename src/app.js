require('dotenv').config();

const express = require("express");
const { initDatabase } = require("./config/database");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const recordRoutes = require("./routes/records");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (_req, res) =>
  res.json({ message: "Finance Backend API", version: "1.0.0", status: "running" })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found." }));

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

// ── Start ────────────────────────────────────────────────────────────────────
async function start(port = 3000) {
  await initDatabase();
  app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
}

if (require.main === module) {
  start(process.env.PORT || 3000);
}

module.exports = { app, start };
