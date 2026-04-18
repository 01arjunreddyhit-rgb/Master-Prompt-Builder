import pool from './server/config/db.ts';

async function migrateReasons() {
  console.log("Starting Reasons Repository migration...");
  const conn = await pool.getConnection();
  try {
    // 1. Create unified reasons repository table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS reasons_repository (
        reason_id SERIAL PRIMARY KEY,
        admin_id TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        reason_type VARCHAR(50) DEFAULT 'GENERAL', -- 'REMOVAL', 'BURST', 'STOP', 'FREEZE'
        related_domain VARCHAR(100),
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("Created reasons_repository table.");

    // Migrate old burst reasons if they exist
    try {
      const [bursts] = await conn.execute('SELECT * FROM burst_reason_repository');
      for (const b of bursts) {
        await conn.execute(
          'INSERT INTO reasons_repository (admin_id, name, reason_type, is_default) VALUES (?, ?, ?, ?)',
          ['ADMIN_MIGRATE', b.reason_text, 'BURST', b.is_default || false]
        );
      }
      console.log(`Migrated ${bursts.length} burst reasons.`);
    } catch (err) {
      console.log("No old burst reasons to migrate or table missing.");
    }

    // Migrate old stop reasons if they exist
    try {
      const [stops] = await conn.execute('SELECT * FROM stop_reason_repository');
      for (const s of stops) {
        await conn.execute(
          'INSERT INTO reasons_repository (admin_id, name, description, reason_type) VALUES (?, ?, ?, ?)',
          [s.admin_id, s.reason_name, s.description, 'STOP']
        );
      }
      console.log(`Migrated ${stops.length} stop reasons.`);
    } catch (err) {
      console.log("No old stop reasons to migrate or table missing.");
    }

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrateReasons();
