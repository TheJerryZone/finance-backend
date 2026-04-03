const express = require("express");
const { query } = require("express-validator");
const controller = require("../controllers/dashboardController");
const { authenticate, requireMinRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

// All dashboard routes require at least viewer role (any authenticated user)
router.use(authenticate);

/**
 * GET /api/dashboard/summary
 * All roles - total income, expenses, net balance
 * Query: from, to (optional date filters)
 */
router.get(
  "/summary",
  [
    query("from").optional().isDate(),
    query("to").optional().isDate(),
  ],
  validate,
  controller.getSummary
);

/**
 * GET /api/dashboard/categories
 * Analyst, Admin - category-wise breakdown
 * Query: from, to, type
 */
router.get(
  "/categories",
  requireMinRole("analyst"),
  [
    query("from").optional().isDate(),
    query("to").optional().isDate(),
    query("type").optional().isIn(["income", "expense"]),
  ],
  validate,
  controller.getCategoryBreakdown
);

/**
 * GET /api/dashboard/trends/monthly
 * Analyst, Admin - monthly income/expense trend
 * Query: year (optional)
 */
router.get(
  "/trends/monthly",
  requireMinRole("analyst"),
  [query("year").optional().isInt({ min: 2000, max: 2100 })],
  validate,
  controller.getMonthlyTrend
);

/**
 * GET /api/dashboard/trends/weekly
 * Analyst, Admin - last 12 weeks trend
 */
router.get("/trends/weekly", requireMinRole("analyst"), controller.getWeeklyTrend);

/**
 * GET /api/dashboard/recent
 * All roles - recent activity feed
 * Query: limit (default 10, max 50)
 */
router.get(
  "/recent",
  [query("limit").optional().isInt({ min: 1, max: 50 })],
  validate,
  controller.getRecentActivity
);

module.exports = router;
