const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../config/database");
const { JWT_SECRET } = require("../middleware/auth");

function login(email, password) {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  stmt.bind([email]);
  if (!stmt.step()) {
    stmt.free();
    throw Object.assign(new Error("Invalid credentials."), { status: 401 });
  }
  const user = stmt.getAsObject();
  stmt.free();

  if (user.status === "inactive") {
    throw Object.assign(new Error("Account is inactive."), { status: 403 });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) throw Object.assign(new Error("Invalid credentials."), { status: 401 });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

module.exports = { login };
