# UCOS — Universal Course Opting System v3.1

## Overview
College elective course selection system using the PWFCFS-MRA (Priority Weighted First-Come-First-Served with Multi-Round Allocation) algorithm. Migrated from MySQL + CRA to PostgreSQL + Vite + TypeScript on Replit.

## Architecture
- **Frontend**: React 18 + Vite + JSX (23 pages, `client/src/`)
- **Backend**: Express + TypeScript ESM (`server/`)
- **Database**: PostgreSQL (Replit-managed, 17 tables via Drizzle)
- **Auth**: JWT (`JWT_SECRET` in `.env`, `SESSION_SECRET` in Replit Secrets)
- **Build**: esbuild (server CJS) + Vite (client), output → `dist/`

## Key Files
- `client/src/App.jsx` — All routing (NOT App.tsx — Vite resolves .jsx first)
- `client/src/services/api.js` — Axios instance, base URL `/api`, JWT from localStorage
- `server/index.ts` — Entry point, dotenv loaded first, cors + express setup
- `server/routes/index.ts` — All 60 API routes consolidated
- `server/config/db.ts` — PostgreSQL adapter (`?` → `$N`, `RETURNING *`, `insertId`)
- `server/controllers/` — 8 controllers (auth, admin, election, course, student, cav, allocation, result)
- `shared/schema.ts` — Drizzle schema for all 17 tables
- `.env` — JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_URL (loaded by dotenv at startup)

## Running
- Dev: `npm run dev` (tsx server/index.ts, Vite middleware on same port 5000)
- Build: `npm run build` (Vite frontend + esbuild server → dist/)
- Start: `npm run start` (node dist/index.cjs, production)

## Deployment
- Target: autoscale
- Build: `npm run build`
- Run: `npm run start`
- CAV join links auto-detect production domain via `REPLIT_DOMAINS` env var

## Test Accounts
| Role  | Email | Password | ID |
|-------|-------|----------|----|
| Admin | kmharik@gmail.com | (your registration password) | ADM-2026-001 |
| Admin | test@ucos.demo | Admin@1234 | ADM-2026-099 |
| Student | student@test.demo | Admin@1234 | election_id=1 |

## PostgreSQL Migration Notes
- `?` placeholders → `$1, $2...` (handled by db.ts adapter)
- `INSERT IGNORE` → `ON CONFLICT DO NOTHING`
- `GROUP_CONCAT` → `string_agg`
- `EXCLUDED.col` in ON CONFLICT must match exact column name
- `is_auto_assigned`, `is_active`, `is_burst` are boolean — use `=TRUE`/`=FALSE` not `=1`/`=0`
- `COUNT(*)` from pg driver returns string (bigint) — JS coercion handles comparisons
- `FOR UPDATE`/`FOR SHARE` work natively in PostgreSQL

## Full API Test Verified (end-to-end)
1. Admin login → JWT token
2. Create election → election_id
3. Add courses → course_id
4. Upload students (CSV via /admin/students/upload)
5. Init election → tokens + seats generated
6. Start election → ACTIVE status
7. Student login + dashboard → sees courses and token count
8. Student books courses → PWFCFS tokens assigned
9. Stop election → auto-assign remaining
10. Allocation confirm (per course) → CONFIRMED status
11. Results (admin) → summary + row data
12. Results (student) → confirmed courses
