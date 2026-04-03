const jwt = require("jsonwebtoken");
const { getDb } = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET || "finance_secret_key_dev";

// Verify JWT and attach user to request
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required. Provide a Bearer token." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Confirm user still exists and is active
    const db = getDb();
    const stmt = db.prepare("SELECT id, role, status FROM users WHERE id = ?");
    stmt.bind([decoded.userId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ error: "User not found." });
    }
    const user = stmt.getAsObject();
    stmt.free();

    if (user.status === "inactive") {
      return res.status(403).json({ error: "Account is inactive." });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Role hierarchy: admin > analyst > viewer
const ROLE_LEVELS = { viewer: 1, analyst: 2, admin: 3 };

// Require minimum role level
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required." });

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(", ")}. Your role: ${req.user.role}.`,
      });
    }
    next();
  };
}

// Require at least a minimum role level
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required." });

    if (ROLE_LEVELS[req.user.role] < ROLE_LEVELS[minRole]) {
      return res.status(403).json({
        error: `Access denied. Minimum required role: ${minRole}. Your role: ${req.user.role}.`,
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, requireMinRole, JWT_SECRET };
