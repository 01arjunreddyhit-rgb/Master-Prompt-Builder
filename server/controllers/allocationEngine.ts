import pool from '../config/db';

/**
 * The Promotion Engine ensures each student has N tokens active (BOOKED/CONFIRMED),
 * where N is the 'final_courses_per_student' for the election.
 * 
 * If a student falls below N (e.g. because a course was BURST), the engine
 * promotes their next UNUSED tokens to BOOKED status in their preferred courses.
 */
export async function runPromotion(conn, election_id, studentIds) {
  const [elections] = await conn.execute(
    'SELECT final_courses_per_student FROM elections WHERE election_id=?',
    [election_id]
  );
  if (!elections.length) return;
  const N = elections[0].final_courses_per_student;

  const sids = Array.isArray(studentIds) ? studentIds : [studentIds];
  if (!sids.length) return;

  for (const sid of sids) {
    // 1. Count currently active (BOOKED or CONFIRMED)
    const [active] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM student_tokens WHERE student_id=? AND election_id=? AND status IN ('BOOKED','CONFIRMED','AUTO')",
      [sid, election_id]
    );
    let currentCount = active[0].cnt;

    while (currentCount < N) {
      // 2. Find next UNUSED token
      const [nextTokens] = await conn.execute(
        "SELECT * FROM student_tokens WHERE student_id=? AND election_id=? AND status='UNUSED' ORDER BY token_number ASC LIMIT 1",
        [sid, election_id]
      );
      
      if (!nextTokens.length) break; // No more preferences left
      const token = nextTokens[0];

      // 3. Check if the course for this token is still active (not burst)
      const [courses] = await conn.execute(
        "SELECT is_active, is_burst FROM courses WHERE course_id=? AND election_id=?",
        [token.course_id, election_id]
      );
      
      if (courses.length && courses[0].is_active && !courses[0].is_burst) {
        // 4. Try to find an available seat
        const [seats] = await conn.execute(
          "SELECT seat_id FROM seats WHERE course_id=? AND election_id=? AND is_available=TRUE ORDER BY seat_number ASC LIMIT 1",
          [token.course_id, election_id]
        );

        if (seats.length) {
          const seat = seats[0];
          // BOOK IT
          await conn.execute(
            "UPDATE seats SET is_available=FALSE, student_token_id=?, booked_at=NOW() WHERE seat_id=?",
            [token.token_id, seat.seat_id]
          );
          await conn.execute(
            "UPDATE student_tokens SET status='BOOKED', seat_id=?, timestamp_booked=NOW() WHERE token_id=?",
            [seat.seat_id, token.token_id]
          );
          currentCount++;
        } else {
          // No seats? Mark as BURST (skipped) and move to next token tier
          await conn.execute(
            "UPDATE student_tokens SET status='BURST' WHERE token_id=?",
            [token.token_id]
          );
          // Loop will continue to try next UNUSED token
        }
      } else {
        // Course is inactive or burst? Skip it.
        await conn.execute(
          "UPDATE student_tokens SET status='BURST' WHERE token_id=?",
          [token.token_id]
        );
        // Loop will continue
      }
    }
  }
}
