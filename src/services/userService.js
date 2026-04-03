const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getDb, persistDb } = require("../config/database");

function listUsers({ page = 1, limit = 20, role, status } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (role) { conditions.push("role = ?"); params.push(role); }
  if (status) { conditions.push("status = ?"); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM users ${where}`);
  countStmt.bind(params);
  countStmt.step();
  const { total } = countStmt.getAsObject();
  countStmt.free();

  const stmt = db.prepare(
    `SELECT id, name, email, role, status, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  );
  stmt.bind([...params, limit, offset]);

  const users = [];
  while (stmt.step()) users.push(stmt.getAsObject());
  stmt.free();

  return { data: users, total, page, limit, pages: Math.ceil(total / limit) };
}

function getUserById(id) {
  const db = getDb();
  const stmt = db.prepare("SELECT id, name, email, role, status, created_at FROM users WHERE id = ?");
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const user = stmt.getAsObject();
  stmt.free();
  return user;
}

function createUser({ name, email, password, role }) {
  const db = getDb();

  // Check duplicate email
  const check = db.prepare("SELECT id FROM users WHERE email = ?");
  check.bind([email]);
  const exists = check.step();
  check.free();
  if (exists) throw Object.assign(new Error("Email already registered."), { status: 409 });

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  db.run(
    "INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
    [id, name, email, password_hash, role || "viewer"]
  );
  persistDb();
  return getUserById(id);
}

function updateUser(id, updates) {
  const db = getDb();
  const user = getUserById(id);
  if (!user) throw Object.assign(new Error("User not found."), { status: 404 });

  const allowed = ["name", "role", "status"];
  const fields = [];
  const values = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (updates.password) {
    fields.push("password_hash = ?");
    values.push(bcrypt.hashSync(updates.password, 10));
  }

  if (!fields.length) throw Object.assign(new Error("No valid fields to update."), { status: 400 });

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.run(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  persistDb();
  return getUserById(id);
}

function deleteUser(id) {
  const db = getDb();
  const user = getUserById(id);
  if (!user) throw Object.assign(new Error("User not found."), { status: 404 });
  db.run("UPDATE users SET status = 'inactive', updated_at = datetime('now') WHERE id = ?", [id]);
  persistDb();
  return { message: "User deactivated." };
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
