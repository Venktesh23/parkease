require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

/**
 * Demo seed: only John has vehicles/reservations/fines.
 * Admin account exists for the admin dashboard only (no vehicles/reservations).
 */
async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'parkease',
    multipleStatements: true
  });

  try {
    const hash = (pw) => bcrypt.hash(pw, 12);

    // -----------------------------
    // USERS — John (all sample data) + Admin (login only, no seeded customer rows)
    // -----------------------------
    const [rJohn] = await conn.execute(
      'INSERT INTO User (first_name, last_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['John', 'Doe', 'john@example.com', '5550000101', await hash('password123'), 'customer']
    );
    const johnId = rJohn.insertId;

    await conn.execute(
      'INSERT INTO User (first_name, last_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      ['Admin', 'User', 'admin@parkease.com', '5550000100', await hash('admin123'), 'admin']
    );

    // -----------------------------
    // VEHICLES — John only
    // -----------------------------
    const [v1] = await conn.execute(
      'INSERT INTO Vehicle (user_id, license_plate, vehicle_type, brand, model, color) VALUES (?, ?, ?, ?, ?, ?)',
      [johnId, 'ABC-001', 'sedan', 'Toyota', 'Camry', 'Silver']
    );
    const [v2] = await conn.execute(
      'INSERT INTO Vehicle (user_id, license_plate, vehicle_type, brand, model, color) VALUES (?, ?, ?, ?, ?, ?)',
      [johnId, 'ABC-002', 'sedan', 'Honda', 'Civic', 'Blue']
    );

    // -----------------------------
    // PARKING LOTS (USF campus)
    // -----------------------------
    const lots = [
      ['Beard Parking Facility', '12810 USF Beard Dr, Tampa, FL 33620', 18, '06:00:00', '23:59:00'],
      ['Collins Boulevard Garage', '3720 Collins Blvd, Tampa, FL 33620', 16, '06:00:00', '23:59:00'],
      ['Crescent Hill Garage', '12210 USF Palm Dr, Tampa, FL 33620', 14, '06:00:00', '23:59:00'],
      ['Laurel Drive Garage', '13220 USF Laurel Dr, Tampa, FL 33620', 12, '06:00:00', '23:59:00']
    ];
    const lotIds = [];
    for (const lot of lots) {
      const [result] = await conn.execute(
        'INSERT INTO ParkingLot (lot_name, location, total_slots, opening_time, closing_time) VALUES (?, ?, ?, ?, ?)',
        lot
      );
      lotIds.push(result.insertId);
    }

    // -----------------------------
    // PARKING SLOTS (60 total; totals maintained by triggers)
    // -----------------------------
    const slotIdsByLot = {};
    for (let i = 0; i < lotIds.length; i += 1) {
      const lotId = lotIds[i];
      const slotCount = lots[i][2];
      slotIdsByLot[lotId] = [];
      for (let n = 1; n <= slotCount; n += 1) {
        let slotType = 'standard';
        if (n % 10 === 0) slotType = 'electric';
        if (n % 7 === 0) slotType = 'handicapped';
        const slotNumber = `L${i + 1}-${String(n).padStart(2, '0')}`;
        const [slotResult] = await conn.execute(
          'INSERT INTO ParkingSlot (lot_id, slot_number, slot_type, availability_status) VALUES (?, ?, ?, ?)',
          [lotId, slotNumber, slotType, 'available']
        );
        slotIdsByLot[lotId].push(slotResult.insertId);
      }
    }

    // -----------------------------
    // RESERVATIONS — John only (variety for demo)
    // -----------------------------
    const beardLot = lotIds[0];
    const collinsLot = lotIds[1];
    const crescentLot = lotIds[2];
    const laurelLot = lotIds[3];

    // Upcoming active (shows as Upcoming in UI when before start)
    const [resUpcoming] = await conn.execute(
      'INSERT INTO Reservation (user_id, vehicle_id, slot_id, reservation_date, start_time, end_time, reservation_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [johnId, v1.insertId, slotIdsByLot[beardLot][0], '2026-05-15', '2026-05-15 09:00:00', '2026-05-15 11:00:00', 'active']
    );
    await conn.execute('UPDATE ParkingSlot SET availability_status = ? WHERE slot_id = ?', ['unavailable', slotIdsByLot[beardLot][0]]);

    // Active but window ended — no checkout yet (for fines / Active+overdue demos)
    const [resOverdue] = await conn.execute(
      `INSERT INTO Reservation (user_id, vehicle_id, slot_id, reservation_date, start_time, end_time, reservation_status)
       VALUES (?, ?, ?, CURDATE(), DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 'active')`,
      [johnId, v2.insertId, slotIdsByLot[crescentLot][2]]
    );
    await conn.execute('UPDATE ParkingSlot SET availability_status = ? WHERE slot_id = ?', ['unavailable', slotIdsByLot[crescentLot][2]]);

    // In-progress active (started, not ended) — shows Active + Check out
    const [resCurrent] = await conn.execute(
      `INSERT INTO Reservation (user_id, vehicle_id, slot_id, reservation_date, start_time, end_time, reservation_status)
       VALUES (?, ?, ?, CURDATE(), DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_ADD(NOW(), INTERVAL 2 HOUR), 'active')`,
      [johnId, v1.insertId, slotIdsByLot[collinsLot][1]]
    );
    await conn.execute('UPDATE ParkingSlot SET availability_status = ? WHERE slot_id = ?', ['unavailable', slotIdsByLot[collinsLot][1]]);

    // Completed — history
    const [resDone] = await conn.execute(
      'INSERT INTO Reservation (user_id, vehicle_id, slot_id, reservation_date, start_time, end_time, reservation_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [johnId, v2.insertId, slotIdsByLot[collinsLot][3], '2026-04-28', '2026-04-28 14:00:00', '2026-04-28 16:00:00', 'completed']
    );

    const [resDone2] = await conn.execute(
      'INSERT INTO Reservation (user_id, vehicle_id, slot_id, reservation_date, start_time, end_time, reservation_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [johnId, v1.insertId, slotIdsByLot[laurelLot][0], '2026-04-25', '2026-04-25 10:00:00', '2026-04-25 12:00:00', 'completed']
    );

    // Cancelled — history
    await conn.execute(
      'INSERT INTO Reservation (user_id, vehicle_id, slot_id, reservation_date, start_time, end_time, reservation_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [johnId, v2.insertId, slotIdsByLot[beardLot][5], '2026-04-29', '2026-04-29 12:00:00', '2026-04-29 14:00:00', 'cancelled']
    );

    // -----------------------------
    // FINES — John only (one per reservation max)
    // -----------------------------
    await conn.execute(
      'INSERT INTO Fine (reservation_id, user_id, amount, reason, status) VALUES (?, ?, ?, ?, ?)',
      [resOverdue.insertId, johnId, 30.0, 'No checkout after end time: 2 hour(s) @ $15/hr', 'pending']
    );
    await conn.execute(
      'INSERT INTO Fine (reservation_id, user_id, amount, reason, status, paid_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [resDone.insertId, johnId, 45.0, 'Overstay by 3 hour(s) @ $15/hr', 'paid']
    );

    console.log('Seed completed successfully');
    console.log('');
    console.log('Customer demo (vehicles, reservations, fines) — John only:');
    console.log('  john@example.com / password123');
    console.log('');
    console.log('Admin UI login (no vehicles/reservations seeded):');
    console.log('  admin@parkease.com / admin123');
    console.log('');
    console.log('Seeded reservation highlights for John:');
    console.log(`  - Upcoming: #${resUpcoming.insertId} (Beard)`);
    console.log(`  - In progress: #${resCurrent.insertId} (Collins) — use Check out`);
    console.log(`  - Overdue / no-checkout fine: #${resOverdue.insertId} (Crescent)`);
    console.log(`  - Completed + paid fine: #${resDone.insertId}`);
    console.log(`  - Completed (no fine): #${resDone2.insertId}`);
  } finally {
    await conn.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
