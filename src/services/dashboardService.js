const { getDb } = require("../config/database");

function getSummary({ from, to } = {}) {
  const db = getDb();
  const conditions = ["is_deleted = 0"];
  const params = [];

  if (from) { conditions.push("date >= ?"); params.push(from); }
  if (to) { conditions.push("date <= ?"); params.push(to); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  // Total income & expense
  const totalsStmt = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
      COUNT(*) as total_records
    FROM financial_records ${where}
  `);
  totalsStmt.bind(params);
  totalsStmt.step();
  const totals = totalsStmt.getAsObject();
  totalsStmt.free();

  return {
    total_income: totals.total_income,
    total_expense: totals.total_expense,
    net_balance: totals.total_income - totals.total_expense,
    total_records: totals.total_records,
  };
}

function getCategoryBreakdown({ from, to, type } = {}) {
  const db = getDb();
  const conditions = ["is_deleted = 0"];
  const params = [];

  if (from) { conditions.push("date >= ?"); params.push(from); }
  if (to) { conditions.push("date <= ?"); params.push(to); }
  if (type) { conditions.push("type = ?"); params.push(type); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const stmt = db.prepare(`
    SELECT category, type,
           SUM(amount) as total,
           COUNT(*) as count
    FROM financial_records ${where}
    GROUP BY category, type
    ORDER BY total DESC
  `);
  stmt.bind(params);

  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function getMonthlyTrend({ year } = {}) {
  const db = getDb();
  const conditions = ["is_deleted = 0"];
  const params = [];

  if (year) {
    conditions.push("strftime('%Y', date) = ?");
    params.push(String(year));
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const stmt = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense,
      COUNT(*) as count
    FROM financial_records ${where}
    GROUP BY month
    ORDER BY month ASC
  `);
  stmt.bind(params);

  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({ ...row, net: row.income - row.expense });
  }
  stmt.free();
  return rows;
}

function getRecentActivity(limit = 10) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT r.id, r.amount, r.type, r.category, r.date, r.notes,
           u.name as created_by_name
    FROM financial_records r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.is_deleted = 0
    ORDER BY r.created_at DESC
    LIMIT ?
  `);
  stmt.bind([limit]);

  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function getWeeklyTrend() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      strftime('%Y-W%W', date) as week,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM financial_records
    WHERE is_deleted = 0 AND date >= date('now', '-12 weeks')
    GROUP BY week
    ORDER BY week ASC
  `);

  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({ ...row, net: row.income - row.expense });
  }
  stmt.free();
  return rows;
}

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrend, getRecentActivity, getWeeklyTrend };
