const { v4: uuidv4 } = require("uuid");
const { getDb, persistDb } = require("../config/database");

const VALID_CATEGORIES = [
  "salary", "freelance", "investment", "rent", "utilities",
  "groceries", "transport", "healthcare", "entertainment", "education", "other"
];

function listRecords({ page = 1, limit = 20, type, category, from, to, search } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const conditions = ["is_deleted = 0"];
  const params = [];

  if (type) { conditions.push("type = ?"); params.push(type); }
  if (category) { conditions.push("category = ?"); params.push(category); }
  if (from) { conditions.push("date >= ?"); params.push(from); }
  if (to) { conditions.push("date <= ?"); params.push(to); }
  if (search) {
    conditions.push("(notes LIKE ? OR category LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM financial_records ${where}`);
  countStmt.bind(params);
  countStmt.step();
  const { total } = countStmt.getAsObject();
  countStmt.free();

  const stmt = db.prepare(
    `SELECT r.*, u.name as created_by_name FROM financial_records r
     LEFT JOIN users u ON r.created_by = u.id
     ${where} ORDER BY r.date DESC, r.created_at DESC LIMIT ? OFFSET ?`
  );
  stmt.bind([...params, limit, offset]);

  const records = [];
  while (stmt.step()) records.push(stmt.getAsObject());
  stmt.free();

  return { data: records, total, page, limit, pages: Math.ceil(total / limit) };
}

function getRecordById(id) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT r.*, u.name as created_by_name FROM financial_records r
     LEFT JOIN users u ON r.created_by = u.id
     WHERE r.id = ? AND r.is_deleted = 0`
  );
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const record = stmt.getAsObject();
  stmt.free();
  return record;
}

function createRecord({ amount, type, category, date, notes }, userId) {
  const db = getDb();
  const id = uuidv4();

  db.run(
    `INSERT INTO financial_records (id, amount, type, category, date, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, amount, type, category, date, notes || null, userId]
  );
  persistDb();
  return getRecordById(id);
}

function updateRecord(id, updates) {
  const db = getDb();
  const record = getRecordById(id);
  if (!record) throw Object.assign(new Error("Record not found."), { status: 404 });

  const allowed = ["amount", "type", "category", "date", "notes"];
  const fields = [];
  const values = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (!fields.length) throw Object.assign(new Error("No valid fields to update."), { status: 400 });

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.run(`UPDATE financial_records SET ${fields.join(", ")} WHERE id = ?`, values);
  persistDb();
  return getRecordById(id);
}

function deleteRecord(id, soft = true) {
  const db = getDb();
  const record = getRecordById(id);
  if (!record) throw Object.assign(new Error("Record not found."), { status: 404 });

  if (soft) {
    db.run("UPDATE financial_records SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?", [id]);
  } else {
    db.run("DELETE FROM financial_records WHERE id = ?", [id]);
  }
  persistDb();
  return { message: "Record deleted." };
}

module.exports = { listRecords, getRecordById, createRecord, updateRecord, deleteRecord, VALID_CATEGORIES };
