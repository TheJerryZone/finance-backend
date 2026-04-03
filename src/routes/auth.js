const express = require("express");
const { body } = require("express-validator");
const { loginHandler, meHandler } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

/**
 * POST /api/auth/login
 * Public - get JWT token
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  validate,
  loginHandler
);

/**
 * GET /api/auth/me
 * Authenticated - get current user profile
 */
router.get("/me", authenticate, meHandler);

module.exports = router;
