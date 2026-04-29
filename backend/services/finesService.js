const pool = require('../db');

/** Matches CompleteReservation / schema: $15 per started hour past reservation end. */
const FINE_RATE_PER_HOUR = 15.0;

async function issueNoCheckoutFines() {
  await pool.execute(
    `
      INSERT INTO Fine (reservation_id, user_id, amount, reason, status)
      SELECT
        r.reservation_id,
        r.user_id,
        (? * CEIL(TIMESTAMPDIFF(MINUTE, r.end_time, NOW()) / 60.0)) AS amount,
        CONCAT(
          'No checkout after end time: ',
          CEIL(TIMESTAMPDIFF(MINUTE, r.end_time, NOW()) / 60.0),
          ' hour(s) @ $15/hr'
        ) AS reason,
        'pending' AS status
      FROM Reservation r
      WHERE r.reservation_status = 'active'
        AND r.end_time < NOW()
        AND NOT EXISTS (
          SELECT 1
          FROM Fine f
          WHERE f.reservation_id = r.reservation_id
        )
    `,
    [FINE_RATE_PER_HOUR]
  );
}

module.exports = { issueNoCheckoutFines, FINE_RATE_PER_HOUR };
