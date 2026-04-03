const request = require("supertest");
const path = require("path");
const fs = require("fs");

// Use a test DB
process.env.NODE_ENV = "test";

// Override DB path for tests
jest.mock("../src/config/database", () => {
  const initSqlJs = require("sql.js");
  let db = null;

  async function initDatabase() {
    const SQL = await initSqlJs();
    db = new SQL.Database();

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('viewer', 'analyst', 'admin')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS financial_records (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        created_by TEXT NOT NULL,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);

    // Seed admin
    const bcrypt = require("bcryptjs");
    const { v4: uuidv4 } = require("uuid");
    const hash = bcrypt.hashSync("Admin@123", 10);
    db.run("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [uuidv4(), "System Admin", "admin@finance.com", hash, "admin"]);

    return db;
  }

  function getDb() {
    if (!db) throw new Error("DB not initialized");
    return db;
  }

  function persistDb() {} // no-op in tests

  return { initDatabase, getDb, persistDb };
});

const { app, start } = require("../src/app");

let adminToken;
let analystToken;
let viewerToken;
let createdRecordId;
let createdUserId;

beforeAll(async () => {
  await start(0); // port 0 = random (not actually used, supertest handles it)
});

// ─── Auth Tests ──────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  it("should login with valid admin credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@finance.com", password: "Admin@123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.role).toBe("admin");
    adminToken = res.body.token;
  });

  it("should reject invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@finance.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("should fail validation with missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("details");
  });
});

// ─── User Management Tests ───────────────────────────────────────────────────
describe("User Management", () => {
  it("Admin can create an analyst user", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Alice Analyst",
        email: "alice@finance.com",
        password: "Pass@123",
        role: "analyst",
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("analyst");
    createdUserId = res.body.id;

    // Login as analyst
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@finance.com", password: "Pass@123" });
    analystToken = login.body.token;
  });

  it("Admin can create a viewer user", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Victor Viewer",
        email: "victor@finance.com",
        password: "Pass@123",
        role: "viewer",
      });

    expect(res.status).toBe(201);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "victor@finance.com", password: "Pass@123" });
    viewerToken = login.body.token;
  });

  it("Non-admin cannot create users", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ name: "Test", email: "test@x.com", password: "Pass@123" });

    expect(res.status).toBe(403);
  });

  it("Admin can list users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("Viewer cannot list all users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it("Should reject duplicate email", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Dup", email: "alice@finance.com", password: "Pass@123" });
    expect(res.status).toBe(409);
  });
});

// ─── Financial Records Tests ─────────────────────────────────────────────────
describe("Financial Records", () => {
  it("Analyst can create a record", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({
        amount: 5000,
        type: "income",
        category: "salary",
        date: "2024-03-15",
        notes: "March salary",
      });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(5000);
    createdRecordId = res.body.id;
  });

  it("Viewer cannot create a record", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ amount: 100, type: "expense", category: "groceries", date: "2024-03-15" });

    expect(res.status).toBe(403);
  });

  it("Should validate amount > 0", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: -50, type: "expense", category: "groceries", date: "2024-03-15" });

    expect(res.status).toBe(400);
  });

  it("Should validate date format", async () => {
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: 50, type: "expense", category: "groceries", date: "not-a-date" });

    expect(res.status).toBe(400);
  });

  it("All roles can list records", async () => {
    for (const token of [adminToken, analystToken, viewerToken]) {
      const res = await request(app)
        .get("/api/records")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
    }
  });

  it("Can filter records by type", async () => {
    const res = await request(app)
      .get("/api/records?type=income")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((r) => expect(r.type).toBe("income"));
  });

  it("Admin can update a record", async () => {
    const res = await request(app)
      .patch(`/api/records/${createdRecordId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: 5500, notes: "Updated salary" });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(5500);
  });

  it("Analyst cannot update a record", async () => {
    const res = await request(app)
      .patch(`/api/records/${createdRecordId}`)
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: 999 });

    expect(res.status).toBe(403);
  });

  it("Admin can soft-delete a record", async () => {
    const res = await request(app)
      .delete(`/api/records/${createdRecordId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // Record should no longer appear in list
    const check = await request(app)
      .get(`/api/records/${createdRecordId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(check.status).toBe(404);
  });
});

// ─── Dashboard Tests ─────────────────────────────────────────────────────────
describe("Dashboard APIs", () => {
  beforeAll(async () => {
    // Seed some data for dashboard tests
    await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: 3000, type: "income", category: "freelance", date: "2024-04-01" });

    await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${analystToken}`)
      .send({ amount: 800, type: "expense", category: "rent", date: "2024-04-02" });
  });

  it("All roles can view summary", async () => {
    for (const token of [adminToken, analystToken, viewerToken]) {
      const res = await request(app)
        .get("/api/dashboard/summary")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("total_income");
      expect(res.body).toHaveProperty("total_expense");
      expect(res.body).toHaveProperty("net_balance");
    }
  });

  it("Viewer cannot access category breakdown", async () => {
    const res = await request(app)
      .get("/api/dashboard/categories")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it("Analyst can access category breakdown", async () => {
    const res = await request(app)
      .get("/api/dashboard/categories")
      .set("Authorization", `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it("Analyst can access monthly trend", async () => {
    const res = await request(app)
      .get("/api/dashboard/trends/monthly?year=2024")
      .set("Authorization", `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it("All roles can view recent activity", async () => {
    const res = await request(app)
      .get("/api/dashboard/recent")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
});

// ─── Auth Guard Tests ────────────────────────────────────────────────────────
describe("Auth Guards", () => {
  it("Returns 401 without token", async () => {
    const res = await request(app).get("/api/records");
    expect(res.status).toBe(401);
  });

  it("Returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/records")
      .set("Authorization", "Bearer invalidtoken");
    expect(res.status).toBe(401);
  });

  it("Returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});
