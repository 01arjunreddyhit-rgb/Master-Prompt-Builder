# UCOS — Universal Course Opting System
### v3.1 — Complete Fullstack Release

---

## What Is UCOS?

UCOS is a full-stack web application for running **PWFCFS-MRA** (Priority-Weighted First-Come First-Served with Multi-Round Allocation) elective course selection at colleges. It manages the complete lifecycle — from student registration and course opting to allocation, results, and notifications.

---

## Architecture

```
ucos-app/
├── backend/                    Node.js 18+ · Express 4 · MySQL 8
│   ├── src/
│   │   ├── app.js              Entry point, CORS, middleware
│   │   ├── controllers/
│   │   │   ├── authController.js       Admin OTP register/login, student register/login
│   │   │   ├── adminController.js      Students CSV upload, pending approvals, profile
│   │   │   ├── courseController.js     CRUD for elective courses
│   │   │   ├── electionController.js   Create/start/pause/stop election, checklist, init tokens
│   │   │   ├── studentController.js    Dashboard, FCFS seat booking (atomic), results
│   │   │   ├── allocationController.js Abacus allocation — confirm/burst/cascade, step history
│   │   │   ├── resultController.js     Two-store system — choice snapshot + allocation sessions
│   │   │   └── cavController.js        Join links, participant review, messages
│   │   ├── routes/index.js     All 60+ routes consolidated
│   │   ├── middleware/auth.js   JWT verify, adminOnly, studentOnly guards
│   │   └── config/
│   │       ├── db.js           MySQL2 connection pool
│   │       └── email.js        Nodemailer (OTP + results email)
│   └── database/
│       ├── schema.sql          Full schema — 17 tables
│       └── migrate_v3.sql      Migration from v2 → v3.1
│
├── frontend/                   React 18 · React Router 6 · Axios
│   └── src/
│       ├── pages/
│       │   ├── Landing.js              Public landing page
│       │   ├── JoinElection.js         Public join page (respects field_config visibility)
│       │   ├── admin/
│       │   │   ├── Dashboard.js        Animated stats, donut charts, election timeline
│       │   │   ├── ElectionControl.js  Create/edit/start/stop, field visibility config
│       │   │   ├── Courses.js          Course cards, seat fill bars, CRUD
│       │   │   ├── Students.js         CSV upload, search/filter, per-student token view
│       │   │   ├── Pending.js          Approve/reject student self-registrations
│       │   │   ├── CAVPanel.js         Join link management, participant confirmation
│       │   │   ├── AllocationPanel.js  Abacus table (Original/Allocated/Eliminated), burst modal,
│       │   │   │                       step history accordion, unallocated management
│       │   │   ├── Results.js          Two-store results — choice snapshot + named sessions
│       │   │   └── Profile.js          Admin name/college, change password
│       │   ├── student/
│       │   │   ├── Dashboard.js        Live course cards with seat grid, FCFS booking
│       │   │   ├── Bookings.js         All tokens with status, seat codes
│       │   │   ├── Results.js          Final allocation result with confetti, detail table
│       │   │   ├── Participation.js    Join elections by code, application status
│       │   │   ├── Messages.js         System notifications with read/unread state
│       │   │   └── Profile.js          Student info, change password
│       │   └── auth/
│       │       ├── Register.js         Admin registration + OTP verification
│       │       ├── AdminLogin.js
│       │       ├── StudentLogin.js
│       │       └── StudentRegister.js  Student self-registration flow
│       ├── components/ui/
│       │   ├── Sidebar.js      Admin + Student sidebars with live message badge
│       │   ├── index.js        Spinner, Modal, Badge, Alert, TokenChip, EmptyState, etc.
│       │   └── Charts.js       SVG Donut, Sparkline, Timeline components
│       ├── context/AuthContext.js  JWT storage, login/logout, role helpers
│       ├── hooks/useElection.js    Shared elections fetch with active-election detection
│       └── services/api.js         Axios with JWT interceptor + 401 auto-logout
│
├── setup.sh                    First-time setup script
└── package.json                Root — concurrently start both servers
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm 9+

### 1. Clone & Setup
```bash
git clone <repo> ucos-app
cd ucos-app
chmod +x setup.sh && ./setup.sh
```

### 2. Configure Backend
```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set DB_PASSWORD and SMTP credentials
```

### 3. Database
```bash
mysql -u root -p < backend/database/schema.sql
# For existing v2 install:
# mysql -u root -p ucos_db < backend/database/migrate_v3.sql
```

### 4. Run
```bash
npm start          # Starts both backend (:3001) and frontend (:3000) concurrently
# Or separately:
npm run dev:backend
npm run start:frontend
```

Open http://localhost:3000

---

## Feature Inventory

### Admin Features
| Feature | Description |
|---------|-------------|
| Multi-institution | Each admin is a separate institution with their own students + elections |
| Admin ID | Auto-generated code (e.g. `ADM-2026-001`) shared with students |
| Election lifecycle | NOT_STARTED → ACTIVE → PAUSED → STOPPED |
| Auto-assignment | On election stop, un-opted students get auto-assigned to remaining courses |
| Choice result lock | Immutable snapshot of all student preferences locked at election stop |
| Named sessions | Multiple allocation sessions per election for comparison |
| Abacus allocation | Confirm/Burst courses with gravity-cascade logic (T2→T1, T3→T2, etc.) |
| Burst reason | Editable reason stored per burst, shown in step history |
| Step history | Every confirm/burst is a numbered step with full distribution snapshot |
| Original vs Allocated | Dual-tracker: Original (locked) vs Allocated (live) per course |
| Self / Auto tags | FCFS self-bookings vs auto-assigned, tracked throughout |
| Field visibility | Configure which participant fields are public on the join page |
| CSV upload | Bulk import students from CSV; tokens auto-generated |
| Pending approvals | Review student self-registrations; approve creates student account |
| CAV (Join link) | Per-election join link with 8-char code; can regenerate |
| Result export | CSV export per session with seat + token details |
| Email results | Send allocation result email to all confirmed students |

### Student Features
| Feature | Description |
|---------|-------------|
| FCFS Booking | First-come-first-served seat booking; atomically claims lowest seat number |
| Token system | T1=highest priority, T5=lowest; automatically uses next token |
| Live seat grid | Visual seat availability per course (dot grid, urgency colors) |
| Join by code | Enter 8-char election code or paste join link to apply |
| Messages | System notifications — confirmation, result, info — with read state |
| Results view | Animated card reveal with confetti on allocation finalisation |
| Display name | Can update display name to match official records |

---

## Database Tables (17)
1. `admins` — Institution admin accounts
2. `elections` — Election config + lifecycle status + field_config
3. `students` — Student accounts (created by CSV or approved from pending)
4. `pending_registrations` — Student self-registration queue
5. `courses` — Elective courses per election
6. `seats` — Per-election seat pool (atomic FCFS)
7. `student_tokens` — T1–T5 tokens per student per election
8. `allocation_rounds` — Historical round tracking
9. `final_assignments` — Confirmed seat assignments
10. `assignment_details` — Per-course assignment breakdown
11. `election_cav` — Join link and code per election
12. `election_participants` — Students who applied via join link
13. `election_messages` — System messages per student per election
14. `election_choice_results` — Immutable T1–T5 demand snapshot (locked at stop)
15. `allocation_sessions` — Named admin allocation sessions
16. `allocation_overrides` — Manual seat overrides in sessions
17. `allocation_steps` — Numbered confirm/burst steps with full distribution snapshots

---

## API Reference (60 routes)

### Auth
- `POST /api/auth/admin/register` — Register admin + send OTP
- `POST /api/auth/admin/login`
- `POST /api/auth/student/register` — Student self-register (→ pending)
- `POST /api/auth/student/login`
- `POST /api/auth/verify-otp`
- `POST /api/auth/resend-otp`

### Admin
- `GET /api/admin/pending` — List student registrations
- `POST /api/admin/pending/:id` — Approve/reject
- `POST /api/admin/students/upload` — CSV bulk upload
- `GET /api/admin/students` — List with search/section filter
- `GET /api/admin/students/:id` — Student + token detail
- `DELETE /api/admin/students/:id`
- `PUT /api/admin/profile`
- `PUT /api/admin/password`

### Elections
- `POST /api/elections`
- `PUT /api/elections/:id`
- `GET /api/elections`
- `GET /api/elections/:id/status`
- `GET /api/elections/:id/checklist`
- `POST /api/elections/:id/init` — Generate seats + tokens
- `POST /api/elections/:id/start|pause|resume|stop`

### Student
- `GET /api/student/dashboard`
- `GET /api/student/bookings`
- `POST /api/student/book` — Atomic FCFS booking
- `GET /api/student/results`
- `PUT /api/student/password`

### Courses
- `POST /api/courses`
- `GET /api/courses`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`

### Allocation
- `GET /api/allocation/:id/pool`
- `POST /api/allocation/confirm`
- `POST /api/allocation/burst`
- `GET /api/allocation/:id/verify`
- `GET /api/allocation/:id/export`
- `POST /api/allocation/:id/email`
- `GET /api/allocation/:id/unallocated`
- `POST /api/allocation/:id/arrange`
- `GET /api/allocation/:id/steps`
- `GET /api/allocation/:id/abacus`

### Results
- `GET /api/results/:id/choices`
- `GET /api/results/:id/sessions`
- `POST /api/results/:id/sessions`
- `GET /api/results/sessions/:id`
- `POST /api/results/sessions/:id/finalize`
- `POST /api/results/sessions/:id/override`
- `GET /api/results/sessions/:id/export`

### CAV
- `GET /api/join/:code` — Public join page data
- `POST /api/cav/apply`
- `PUT /api/cav/name`
- `GET /api/cav/participation`
- `GET /api/cav/messages`
- `PUT /api/cav/messages/:id/read`
- `GET /api/cav/:id`
- `POST /api/cav/:id/regenerate`
- `GET /api/cav/:id/participants`
- `POST /api/cav/participants/:id/review`

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Axios |
| Backend | Node.js 18, Express 4 |
| Database | MySQL 8.0 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Email | Nodemailer (SMTP) |
| File upload | Multer (CSV in memory) |
| CSV parsing | csv-parser |
| CSV export | json2csv |
| Rate limiting | express-rate-limit |
| Dev tooling | nodemon, concurrently |

