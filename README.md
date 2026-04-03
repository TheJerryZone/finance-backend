# Finance Data Processing and Access Control Backend

A backend API for a finance dashboard system that supports user roles, financial records management, and analytics.
This project focuses on clean architecture, proper access control, and meaningful data processing.

---

## Tech Stack

Node.js + Express.js – Fast and minimal backend framework
SQLite (sql.js) – Lightweight database with zero setup
JWT Authentication – Secure, stateless login system
bcryptjs – Password hashing
express-validator – Input validation
Jest + Supertest – API testing

---

## Project Structure

finance-backend/
├── src/
│   ├── app.js                  # App entry point
│   ├── config/
│   │   └── database.js         # DB setup + seed admin
│   ├── middleware/
│   │   ├── auth.js             # Authentication & role checks
│   │   └── validate.js         # Validation handling
│   ├── controllers/            # Handle request/response
│   ├── services/               # Business logic
│   └── routes/                 # API routes
├── tests/                      # API tests
├── data/                       # SQLite database
├── package.json
└── README.md

---

## Getting Started

Prerequisites = Node.js v18+

Install = npm install

Run the server = npm start

Server starts at http://localhost:3000

---

##  default admin Account 

On first run, a default admin user is created:

Email : admin@finance.com
Password: Admin@123

---

## User Roles

The system supports three roles:

1. Viewer : Can view records and dashboard summary
2. Analyst : Can view data + create records + access  analytics
3. Admin : Full access (manage users, records, everything)

---

## API Base URL

http://localhost:3000/api

All protected routes require:
Authorization: Bearer <your_token>

---

## Authentication

Login: Post ``/api/auth/login``

Json
`` 
{
  "email": "admin@finance.com",
  "password": "Admin@123"
}
``

Response:

Json
``
{
  "token": "eyJ...",
  "user": {
    "email": "admin@finance.com",
    "role": "admin"
  }
}
``

---

## Financial Records

Create Record : POST /api/records

{
  "amount": 5000,
  "type": "income",
  "category": "salary",
  "date": "2026-04-01",
  "notes": "April salary"
}

Get Records : GET /api/records

Supports filters like:
1.type
2.category
3.from, to (date range)

---

## Dashboard APIs

These APIs provide aggregated insights (important for the assignment).

Summary: GET /api/dashboard/summary

Returns:

{
  "totalIncome": 5000,
  "totalExpenses": 0,
  "netBalance": 5000
}


Category Breakdown: GET /api/dashboard/categories

Monthly Trends: GET /api/dashboard/trends/monthly

Weekly Trends: GET /api/dashboard/trends/weekly

Recent Activity: GET /api/dashboard/recent

---

## Error Handling

All errors follow a simple format:

{
  "error": "Message describing the issue"
}

Common status codes:

200 – Success
201 – Created
400 – Bad request
401 – Unauthorized
403 – Forbidden
404 – Not found
500 – Server error

---

## Key Design Decisions

Used role-based access control to restrict actions
Implemented soft delete for records to preserve data
Separated logic into controllers and services for clean structure
Designed APIs to support filters and analytics

---

## Assumptions
Single-user environment (no multi-tenant support)
JWT token valid for 24 hours
SQLite used for simplicity and easy setup
Analysts can create but not modify records

---

## Screenshots

login.png
POST records.png
GET records.png
dashboard.png
dashboard_categories.png
monthly_trends_dashboard.png

Screenshots are provided to give an idea of API outputs

---

## Final Notes

This project demonstrates:
1. Clean backend architecture
2. Proper API design
3. Role-based authorization
4. Data aggregation for dashboards

The APIs return structured JSON data which can be easily consumed by a frontend application to build charts and dashboards.

---

## Author

N Harshith Raje Urs
