const express = require("express");
const { body, query } = require("express-validator");
const controller = require("../controllers/userController");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * Admin only - list all users
 */
router.get(
  "/",
  requireRole("admin"),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("role").optional().isIn(["viewer", "analyst", "admin"]),
    query("status").optional().isIn(["active", "inactive"]),
  ],
  validate,
  controller.listUsers
);

/**
 * GET /api/users/:id
 * Admin can view any user; others can only view themselves
 */
router.get("/:id", controller.getUser);

/**
 * POST /api/users
 * Admin only - create a new user
 */
router.post(
  "/",
  requireRole("admin"),
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters."),
    body("role")
      .optional()
      .isIn(["viewer", "analyst", "admin"])
      .withMessage("Role must be viewer, analyst, or admin."),
  ],
  validate,
  controller.createUser
);

/**
 * PATCH /api/users/:id
 * Admin can update any user; others can update their own profile (excluding role)
 */
router.patch(
  "/:id",
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty."),
    body("role")
      .optional()
      .isIn(["viewer", "analyst", "admin"])
      .withMessage("Invalid role."),
    body("status")
      .optional()
      .isIn(["active", "inactive"])
      .withMessage("Status must be active or inactive."),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters."),
  ],
  validate,
  controller.updateUser
);

/**
 * DELETE /api/users/:id
 * Admin only - deactivate a user (soft delete)
 */
router.delete("/:id", requireRole("admin"), controller.deleteUser);

module.exports = router;
