# ParkEase — Parking Slot Reservation System

**COP 4710 — Online Parking Management System* · Database design course project

## 1. Project Title & Overview

**ParkEase** is a web-based parking reservation system for a campus-style enterprise (multiple parking facilities, numbered slots, time-bound bookings). It simulates **centralized parking operations**: customers reserve slots for registered vehicles; administrators monitor occupancy, users, and fines.

**Enterprise domain modeled:** parking inventory (lots and slots), vehicle-linked bookings, and enforcement (fines for overstays or failure to check out after the reservation window).

**Target users**

- **Customers:** browse availability, manage vehicles, create and manage reservations, pay or view fines.
- **Administrators:** view system-wide statistics, all reservations and users, toggle slot availability, and manage fines.

---

## 2. Features

### Core functionalities (course alignment)

| Requirement | How ParkEase satisfies it |
|---------------|---------------------------|
| **DBMS** | **MySQL** — all persistent data lives in relational tables. |
| **≥ 3 relations** | **Six** tables: `User`, `Vehicle`, `ParkingLot`, `ParkingSlot`, `Reservation`, `Fine`. |
| **≥ 8 SQL operations** | Multiple **SELECT** (including joins and aggregations), **INSERT**, **UPDATE**, **DELETE**, plus **stored procedure** calls and **INSERT…SELECT** — see [§5](#5-sql-queries-implemented). |
| **User interface** | **Web UI** — React (Vite) with customer and admin dashboards. |
| **Application logic** | **Node.js / Express** — validation, sessions, transactions, and orchestration of SQL and procedures. |
| **Database connectivity** | **`mysql2`** (promise pool) from the backend — standard **API/driver** access to MySQL (same role as JDBC/ODBC in other stacks). |

### Extra features (grading / demonstration value)

- **Stored procedures:** `CreateReservation`, `CompleteReservation`, `AdminDeleteReservation` — transactional rules enforced in the database.
- **SQL view:** `ReservationSummaryView` — denormalized reservation list for customers and admins.
- **Triggers:** on `ParkingSlot` insert/update/delete to keep **`ParkingLot.total_slots`** accurate.
- **Role-based access:** `customer` vs `admin` in `User.role`, enforced in API middleware.
- **Session-based auth** with **bcrypt** password hashing.
- **Automated no-checkout fines:** application logic (`issueNoCheckoutFines`) runs **`INSERT…SELECT`** before key reads so overdue active reservations get fines consistent with overstay rules.

---

## 3. System Architecture

ParkEase follows a **three-tier architecture**.

```
┌─────────────────────────────────────────────────────────────────┐
│  Presentation tier — React (Vite), React Router, Axios          │
│  Browser UI: landing, login, customer pages, admin pages         │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP (JSON) + session cookie
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Application tier — Node.js, Express                             │
│  REST API under /api/*, express-session, CORS, route handlers     │
│  Business validation + transactions + CALL stored procedures    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ mysql2 connection pool
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Data tier — MySQL                                             │
│  Tables, FKs, indexes, triggers, view, stored procedures        │
└─────────────────────────────────────────────────────────────────┘
```

**Typical API flow**

1. The **frontend** calls `GET`/`POST`/`PUT`/`DELETE` on the Express server (e.g. `GET /api/reservations/my`).
2. The **backend** authenticates the session, runs parameterized SQL or **`CALL Procedure(...)`**, and returns JSON.
3. **MySQL** enforces constraints, runs triggers on slot changes, and executes procedure bodies atomically where defined.

---

## 4. Database Design

**Schema definition:** `backend/schema.sql` (creates database `parkease`).

### Tables (6)

| Table | Purpose |
|--------|---------|
| **User** | Accounts: name, email (unique), phone, hashed password, **role** (`customer` / `admin`). |
| **Vehicle** | License plate (unique), type/brand/model/color; **belongs to** a user. |
| **ParkingLot** | Named facility, location, **total_slots** (maintained by triggers), opening/closing times. |
| **ParkingSlot** | Number and type per lot, **availability_status** (`available` / `unavailable`). |
| **Reservation** | Links user, vehicle, slot, date/times, **reservation_status** (`active` / `completed` / `cancelled`). |
| **Fine** | Amount, reason, status (`pending` / `paid` / `waived`); **at most one fine per reservation** (unique on `reservation_id`). |

### Relationships & constraints

- **Foreign keys** connect `Vehicle` → `User`; `ParkingSlot` → `ParkingLot`; `Reservation` → `User`, `Vehicle`, `ParkingSlot`; `Fine` → `Reservation` and `User`.
- **ON DELETE CASCADE** removes dependent rows when parents are deleted where appropriate.
- **UNIQUE** constraints: user email, vehicle license plate, `(lot_id, slot_number)` for slots, one fine per reservation.
- **ENUM** columns constrain roles, slot types, availability, reservation status, and fine status at the database level.

### Other objects

- **View:** `ReservationSummaryView` joins reservation, user, vehicle, slot, lot, and optional fine for listing screens.
- **Triggers:** recalculate `ParkingLot.total_slots` when slots are inserted, updated, or deleted.

---

## 5. SQL Queries Implemented

The application uses **many more than eight** distinct SQL patterns; below is a representative list mapped to **what the app does**.

| # | Query type | Example use in the app |
|---|------------|-------------------------|
| 1 | **SELECT** with `WHERE` | Login: load user by email (`routes/auth.js`). |
| 2 | **SELECT** with **JOIN** + filters | List slots with lot name/location; optional `lot_id` / status (`routes/slots.js`). |
| 3 | **SELECT** with **COUNT** + **GROUP BY** | Parking lots page: per-lot available vs total slots (`GET /api/lots`). |
| 4 | **SELECT** from **VIEW** | Customer and admin reservation lists from `ReservationSummaryView` (`routes/reservations.js`, `routes/admin.js`). |
| 5 | **INSERT** | Signup (`User`), add vehicle (`Vehicle`) (`routes/auth.js`, `routes/vehicles.js`). |
| 6 | **UPDATE** (single / multi-table) | Cancel reservation + free slot in one transaction; pay fine; admin toggle slot; admin update fine (`routes/reservations.js`, `routes/fines.js`, `routes/admin.js`). |
| 7 | **DELETE** | Remove vehicle (when safe); admin procedures delete reservations (`routes/vehicles.js`, `routes/reservations.js`). |
| 8 | **Aggregations** (`SUM`, `COUNT`, subqueries) | Admin dashboard: customers, reservation counts, slot counts, fine totals in **one** `SELECT` (`routes/admin.js`). |
| 9 | **`CALL` stored procedure** | `CreateReservation`, `CompleteReservation`, `AdminDeleteReservation` (`routes/reservations.js`). |
| 10 | **INSERT … SELECT** | Issue **no-checkout** fines for expired active reservations without an existing fine (`services/finesService.js`). |

---

## 6. Tech Stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | React 18, Vite 5, React Router 6, Axios |
| **Backend** | Node.js, Express 4, express-session, bcryptjs, cors, dotenv |
| **Database** | MySQL 8+ (recommended), **mysql2** / promise pool |
| **Tools / libraries** | npm, nodemon (dev), SQL scripts (`schema.sql`, optional `seed.js`) |

---

## 7. How to Run Locally

### Prerequisites

- **Node.js** 18+
- **MySQL** server running (typical port `3306`)
- **npm**

### Steps

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd parkease
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env`: set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (e.g. `parkease`), `SESSION_SECRET`, and optionally `PORT` (default `5000`) and `FRONTEND_URL` (e.g. `http://localhost:5173` for CORS).

4. **Create the database schema**

   From `backend/`:

   ```bash
   mysql -u YOUR_USER -p < schema.sql
   ```

5. **Optional: load demo data**

   ```bash
   node seed.js
   ```

   Expect `Seed completed successfully`.

6. **Start the API**

   ```bash
   npm run dev
   # or: npm start
   ```

   Server listens on `http://localhost:5000` (or your `PORT`). Health check: `GET http://localhost:5000/api/health`.

7. **Install and run the frontend** (new terminal)

   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

   Open the URL shown (typically `http://localhost:5173`).

The Axios client uses `http://localhost:5000` as the API base in `frontend/src/api/axios.js`; keep the backend port in sync or adjust that file for your environment.

Additional database notes: see `backend/DATABASE.md`.

---

## 8. Demo Flow (~10 minutes)

Use this order to show **UI + database-backed behavior** clearly.

| Time | What to show |
|------|----------------|
| **0–1 min** | Open the **landing** page; mention **3-tier** stack and **MySQL** as the system of record. |
| **1–3 min** | **Customer:** Log in as **John** (see credentials below). Open **My Reservations** — data comes from **`ReservationSummaryView`**. Point out statuses (upcoming, active, completed). Open **My Vehicles** — list from **`Vehicle`**. |
| **3–5 min** | **New booking:** **Make reservation** — pick lot → available slot → vehicle and **start/end within rules** — creates row via **`CALL CreateReservation`** and marks slot unavailable. **Or** **Check out** an in-progress reservation — **`CALL CompleteReservation`** completes booking and may insert an **overstay** fine. |
| **5–6 min** | **Cancel** an **upcoming** active reservation (before start) — **transactional** `UPDATE` on `Reservation` + `ParkingSlot`. |
| **6–7 min** | **Fines:** Open **My Fines** — joins `Fine` with reservation/lot/slot; **pay** a pending fine — **`UPDATE Fine`**. Mention **no-checkout** fines from **`INSERT…SELECT`** when reservations pass end time without checkout. |
| **7–9 min** | **Admin:** Log in as **admin**. **Overview** — dashboard **`SELECT`** with multiple **scalar subqueries** (counts and `SUM`). **Reservations** — list from view; **delete** one reservation — **`CALL AdminDeleteReservation`**. **Users** — list from **`User`**. **Slots** — toggle availability — **`UPDATE ParkingSlot`** with business rule for active bookings. **Admin fines** — filter / mark paid or waived. |
| **9–10 min** | Summarize **schema**: **six tables**, **FKs**, **view**, **three procedures**, **triggers** on slots for **`total_slots`**. Offer to show `schema.sql` or ER narrative if asked. |

### Demo credentials (after `node seed.js`)

| Role | Email | Password |
|------|--------|----------|
| Customer (seeded data) | `john@example.com` | `password123` |
| Admin | `admin@parkease.com` | `admin123` |

---

## 9. Future Improvements

- **Deployment:** containerize (Docker) or host API + MySQL on a cloud provider; use environment-based API base URL for the frontend build.
- **Migrations:** optional migration tool (e.g. Flyway-style or npm scripts) instead of only full `schema.sql` resets.
- **Observability:** structured logging, request IDs, and health checks tied to DB connectivity.
- **Payments:** integrate a real payment gateway if the course or product scope expands beyond simulated fine settlement.
- **Testing:** API integration tests against a disposable MySQL instance; minimal E2E for critical flows.

---

## Repository layout (high level)

```
parkease/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── schema.sql
│   ├── seed.js
│   ├── routes/          # auth, slots, reservations, vehicles, admin, fines
│   ├── middleware/
│   └── services/        # e.g. finesService (INSERT…SELECT)
├── frontend/
│   └── src/             # pages, components, api/axios, context
├── README.md
└── ...
```

---

*This README reflects the application as implemented in this repository: REST API + MySQL driver connectivity, relational schema with procedures and a view, and a React web front end.*
