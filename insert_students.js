import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import bcrypt from 'bcryptjs';
import pool from './server/config/db.js';

const P1_PATH = 'C:\\Users\\kmhar\\.gemini\\antigravity\\scratch\\CSE_Templates_Extract\\Phase_1_Combined.csv';
const P2A_PATH = 'C:\\Users\\kmhar\\.gemini\\antigravity\\scratch\\CSE_Templates_Extract\\Phase_2A_Combined.csv';
const P2B_PATH = 'C:\\Users\\kmhar\\.gemini\\antigravity\\scratch\\CSE_Templates_Extract\\Phase_2B_Combined.csv';

const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

const run = async () => {
  const conn = await pool.getConnection();
  try {
    console.log('Reading CSV files...');
    const p1 = await readCSV(P1_PATH);
    const p2a = await readCSV(P2A_PATH);
    const p2b = await readCSV(P2B_PATH);

    // Combine data by email
    const studentMap = new Map();
    
    // Process P1
    for (const row of p1) {
      if (!row.email) continue;
      studentMap.set(row.email.trim(), {
        register_number: row.register_number?.trim(),
        name: row.name?.trim(),
        email: row.email.trim(),
        section: row.section?.trim()
      });
    }

    // Process P2A
    for (const row of p2a) {
      if (!row.email) continue;
      const email = row.email.trim();
      if (studentMap.has(email)) {
        const s = studentMap.get(email);
        s.p_profile_id = row.p_profile_id?.trim() || null;
        s.p_username = row.p_username?.trim() || null;
      }
    }

    // Process P2B (which just overrides/adds section if any, but we already have it)
    
    console.log(`Found ${studentMap.size} unique students.`);

    // Get active election
    const [elections] = await conn.execute("SELECT election_id, admin_id FROM elections WHERE status='NOT_STARTED' ORDER BY created_at DESC LIMIT 1");
    if (elections.length === 0) {
      throw new Error("No NOT_STARTED election found.");
    }
    const election_id = elections[0].election_id;
    const admin_id = elections[0].admin_id;

    console.log(`Using election_id: ${election_id}, admin_id: ${admin_id}`);

    // Hash password
    const hashedPassword = await bcrypt.hash('Ptu@123', 12);
    console.log('Password hashed successfully.');

    // Insert into DB
    let inserted = 0;
    for (const s of studentMap.values()) {
      const { register_number, name, email, section, p_profile_id, p_username } = s;
      
      const query = `
        INSERT INTO students (admin_id, election_id, name, email, register_number, section, p_profile_id, p_username, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          name=VALUES(name), 
          register_number=VALUES(register_number), 
          section=VALUES(section), 
          p_profile_id=VALUES(p_profile_id), 
          p_username=VALUES(p_username),
          password_hash=VALUES(password_hash)
      `;
      
      await conn.execute(query, [
        admin_id, 
        election_id, 
        name || '', 
        email, 
        register_number || '', 
        section || '', 
        p_profile_id || null, 
        p_username || null,
        hashedPassword
      ]);
      inserted++;
    }

    console.log(`Successfully inserted/updated ${inserted} students.`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
};

run();
