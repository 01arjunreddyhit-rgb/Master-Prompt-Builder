import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the database pool from the server's config
import pool from './server/config/db.ts';

/**
 * This script injects simulated bookings.
 * It allocates 6 subjects for 1 student every 5 seconds.
 */
async function runInjection() {
  let electionId = 1; 
  const LIMIT = 63; // Set this to 63 to inject exactly half of the 126 students

  try {
    // Auto-detect latest election if needed
    const [elections] = await pool.execute('SELECT election_id, title FROM elections ORDER BY created_at DESC LIMIT 1');
    if (elections.length > 0) electionId = elections[0].election_id;

    console.log(`Starting simulated injection for Election: ${elections[0]?.title} (ID: ${electionId})`);
    
    // 1. Get the list of approved students for this election
    const [students] = await pool.execute(
      'SELECT student_id, register_number FROM students WHERE election_id = ? AND is_approved = TRUE LIMIT ?',
      [electionId, LIMIT]
    );

    if (students.length === 0) {
      console.error('No students found. Make sure the election is initialized and students are approved.');
      process.exit(1);
    }

    console.log(`Found ${students.length} students (Limited to ${LIMIT}). Will inject 6 tokens per student.`);

    // 2. Get active courses
    const [courses] = await pool.execute(
      'SELECT course_id, course_name FROM courses WHERE election_id = ? AND is_active = TRUE',
      [electionId]
    );

    if (courses.length === 0) {
      console.error('No active courses found.');
      process.exit(1);
    }

    // Shuffle helper to pick 6 random courses
    const shuffleArray = array => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    // 3. Start injecting
    let count = 0;
    
    const interval = setInterval(async () => {
      if (count >= students.length) {
        console.log('\n✅ Injection Complete!');
        clearInterval(interval);
        process.exit(0);
      }

      const s = students[count];
      let bookedCount = 0;
      
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        
        // Pick 6 random courses for this student
        const selectedCourses = shuffleArray([...courses]).slice(0, 6);

        // Get student's available tokens
        const [tokens] = await conn.execute(
          "SELECT token_id FROM student_tokens WHERE student_id = ? AND status = 'UNUSED' ORDER BY token_number ASC",
          [s.student_id]
        );

        for (let i = 0; i < selectedCourses.length; i++) {
          if (i >= tokens.length) break; // Out of tokens

          const course = selectedCourses[i];
          const token = tokens[i];

          // Find an available seat
          const [seats] = await conn.execute(
            'SELECT seat_id FROM seats WHERE election_id = ? AND is_available = TRUE LIMIT 1',
            [electionId]
          );

          if (seats.length > 0) {
            // Book the token and seat
            await conn.execute(
              'UPDATE seats SET is_available = FALSE, course_id = ?, student_token_id = ?, booked_at = NOW() WHERE seat_id = ?',
              [course.course_id, token.token_id, seats[0].seat_id]
            );
            await conn.execute(
              "UPDATE student_tokens SET status = 'STUDENT', course_id = ?, seat_id = ? WHERE token_id = ?",
              [course.course_id, seats[0].seat_id, token.token_id]
            );
            bookedCount++;
          }
        }
        await conn.commit();
      } catch (err) {
        console.error('Booking Error:', err);
        await conn.rollback();
      } finally {
        conn.release();
      }

      count++;
      console.log(`[${new Date().toLocaleTimeString()}] Simulated ${bookedCount} bookings for student ${s.register_number} (${count}/${students.length})`);

    }, 5000); // 5 seconds

  } catch (err) {
    console.error('Error during injection setup:', err);
    process.exit(1);
  }
}

runInjection();
