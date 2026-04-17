#!/bin/bash
# ============================================================
# UCOS First-Time Setup Script
# ============================================================

set -e

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   UCOS — Universal Course Opting System   ║"
echo "║          First-Time Setup Script           ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ── Step 1: Check dependencies ────────────────────────────────
echo "▶ Checking dependencies..."
command -v node >/dev/null 2>&1 || { echo "✗ Node.js not found. Install from nodejs.org"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "✗ npm not found."; exit 1; }
command -v mysql>/dev/null 2>&1 || { echo "✗ MySQL CLI not found. Install MySQL 8.0+"; exit 1; }
echo "  ✓ Node $(node --version)"
echo "  ✓ npm  $(npm --version)"
echo ""

# ── Step 2: Configure .env ─────────────────────────────────────
if [ ! -f "backend/.env" ]; then
  echo "▶ Creating backend/.env from template..."
  cp backend/.env.example backend/.env 2>/dev/null || true
  echo "  ⚠ Edit backend/.env with your MySQL credentials before continuing."
  echo ""
fi

# ── Step 3: Database setup ─────────────────────────────────────
echo "▶ Setting up database..."
read -p "  MySQL root password: " -s MYSQL_PASS
echo ""
mysql -u root -p"$MYSQL_PASS" < backend/database/schema.sql 2>/dev/null \
  && echo "  ✓ Database schema created (ucos_db)" \
  || echo "  ⚠ DB setup failed. Run manually: mysql -u root -p < backend/database/schema.sql"
echo ""

# ── Step 4: Install backend deps ──────────────────────────────
echo "▶ Installing backend dependencies..."
cd backend && npm install --silent && cd ..
echo "  ✓ Backend ready"
echo ""

# ── Step 5: Install frontend deps ─────────────────────────────
echo "▶ Installing frontend dependencies..."
cd frontend && npm install --silent && cd ..
echo "  ✓ Frontend ready"
echo ""

# ── Done ──────────────────────────────────────────────────────
echo "╔═══════════════════════════════════════════╗"
echo "║              Setup Complete!              ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "  Start backend:   cd backend && npm run dev"
echo "  Start frontend:  cd frontend && npm start"
echo ""
echo "  Or run both:     npm start  (from root, needs concurrently)"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo "  Health:   http://localhost:3001/health"
echo ""
