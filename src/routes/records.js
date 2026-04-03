const express = require("express");
const { body, query, param } = require("express-validator");
const controller = require("../controllers/recordController");
const { authenticate, requireMinRole, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { VALID_CATEGORIES } = require("../services/recordService");

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/records
 * Viewer, Analyst, Admin - list records with optional filters
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("type").optional().isIn(["income", "expense"]),
    query("category").optional().isIn(VALID_CATEGORIES),
    query("from").optional().isDate().withMessage("from must be a valid date (YYYY-MM-DD)."),
    query("to").optional().isDate().withMessage("to must be a valid date (YYYY-MM-DD)."),
  ],
  validate,
  controller.listRecords
);

/**
 * GET /api/records/:id
 * Viewer, Analyst, Admin - get single record
 */
router.get("/:id", controller.getRecord);

/**
 * POST /api/records
 * Analyst, Admin only - create a record
 */
router.post(
  "/",
  requireMinRole("analyst"),
  [
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("Amount must be a positive number."),
    body("type")
      .isIn(["income", "expense"])
      .withMessage("Type must be income or expense."),
    body("category")
      .isIn(VALID_CATEGORIES)
      .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(", ")}.`),
    body("date")
      .isDate()
      .withMessage("Date must be a valid date (YYYY-MM-DD)."),
    body("notes").optional().isString().isLength({ max: 500 }),
  ],
  validate,
  controller.createRecord
);

/**
 * PATCH /api/records/:id
 * Admin only - update a record
 */
router.patch(
  "/:id",
  requireRole("admin"),
  [
    body("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be a positive number."),
    body("type").optional().isIn(["income", "expense"]),
    body("category").optional().isIn(VALID_CATEGORIES),
    body("date").optional().isDate(),
    body("notes").optional().isString().isLength({ max: 500 }),
  ],
  validate,
  controller.updateRecord
);

/**
 * DELETE /api/records/:id
 * Admin only - soft delete a record
 */
router.delete("/:id", requireRole("admin"), controller.deleteRecord);

module.exports = router;
