DROP DATABASE IF EXISTS parkease;
CREATE DATABASE parkease;
USE parkease;

CREATE TABLE User (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_email (email)
);

CREATE TABLE Vehicle (
  vehicle_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  license_plate VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type VARCHAR(30),
  brand VARCHAR(50),
  model VARCHAR(50),
  color VARCHAR(30),
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
  INDEX idx_vehicle_user (user_id)
);

CREATE TABLE ParkingLot (
  lot_id INT PRIMARY KEY AUTO_INCREMENT,
  lot_name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  total_slots INT DEFAULT 0,
  opening_time TIME,
  closing_time TIME
);

CREATE TABLE ParkingSlot (
  slot_id INT PRIMARY KEY AUTO_INCREMENT,
  lot_id INT NOT NULL,
  slot_number VARCHAR(10) NOT NULL,
  slot_type ENUM('standard', 'handicapped', 'electric') DEFAULT 'standard',
  availability_status ENUM('available', 'unavailable') DEFAULT 'available',
  FOREIGN KEY (lot_id) REFERENCES ParkingLot(lot_id) ON DELETE CASCADE,
  UNIQUE (lot_id, slot_number),
  INDEX idx_slot_lot_status (lot_id, availability_status)
);

CREATE TABLE Reservation (
  reservation_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  slot_id INT NOT NULL,
  reservation_date DATE NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  reservation_status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES ParkingSlot(slot_id) ON DELETE CASCADE,
  INDEX idx_res_user (user_id),
  INDEX idx_res_slot_status (slot_id, reservation_status),
  INDEX idx_res_status (reservation_status)
);

CREATE TABLE Fine (
  fine_id INT PRIMARY KEY AUTO_INCREMENT,
  reservation_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('pending', 'paid', 'waived') DEFAULT 'pending',
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
  UNIQUE KEY uk_fine_reservation (reservation_id),
  INDEX idx_fine_user (user_id),
  INDEX idx_fine_status (status)
);

DELIMITER //

CREATE TRIGGER tr_parkingslot_after_insert
AFTER INSERT ON ParkingSlot
FOR EACH ROW
BEGIN
  UPDATE ParkingLot pl
  SET pl.total_slots = (SELECT COUNT(*) FROM ParkingSlot ps WHERE ps.lot_id = NEW.lot_id)
  WHERE pl.lot_id = NEW.lot_id;
END//

CREATE TRIGGER tr_parkingslot_after_delete
AFTER DELETE ON ParkingSlot
FOR EACH ROW
BEGIN
  UPDATE ParkingLot pl
  SET pl.total_slots = (SELECT COUNT(*) FROM ParkingSlot ps WHERE ps.lot_id = OLD.lot_id)
  WHERE pl.lot_id = OLD.lot_id;
END//

CREATE TRIGGER tr_parkingslot_after_update
AFTER UPDATE ON ParkingSlot
FOR EACH ROW
BEGIN
  UPDATE ParkingLot pl
  SET pl.total_slots = (SELECT COUNT(*) FROM ParkingSlot ps WHERE ps.lot_id = NEW.lot_id)
  WHERE pl.lot_id = NEW.lot_id;
  IF OLD.lot_id <> NEW.lot_id THEN
    UPDATE ParkingLot pl
    SET pl.total_slots = (SELECT COUNT(*) FROM ParkingSlot ps WHERE ps.lot_id = OLD.lot_id)
    WHERE pl.lot_id = OLD.lot_id;
  END IF;
END//

DELIMITER ;

DELIMITER //

CREATE PROCEDURE CreateReservation(
  IN p_user_id INT,
  IN p_vehicle_id INT,
  IN p_slot_id INT,
  IN p_start DATETIME,
  IN p_end DATETIME
)
BEGIN
  DECLARE slot_status VARCHAR(20);
  DECLARE booking_count INT;
  DECLARE start_diff_minutes INT;
  DECLARE duration_minutes INT;
  DECLARE veh_owner INT;

  IF p_end <= p_start THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End time must be after start time';
  END IF;

  SET start_diff_minutes = TIMESTAMPDIFF(MINUTE, NOW(), p_start);
  IF start_diff_minutes < 0 OR start_diff_minutes > 720 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Start time must be within the next 12 hours';
  END IF;

  SET duration_minutes = TIMESTAMPDIFF(MINUTE, p_start, p_end);
  IF duration_minutes <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation must have a positive duration';
  END IF;

  IF duration_minutes > 1440 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation duration cannot exceed 24 hours';
  END IF;

  SELECT user_id INTO veh_owner FROM Vehicle WHERE vehicle_id = p_vehicle_id;
  IF veh_owner IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vehicle does not exist';
  END IF;

  IF veh_owner <> p_user_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vehicle does not belong to this user';
  END IF;

  START TRANSACTION;

  IF NOT EXISTS (SELECT 1 FROM ParkingSlot WHERE slot_id = p_slot_id) THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Slot does not exist';
  END IF;

  SELECT availability_status INTO slot_status
  FROM ParkingSlot
  WHERE slot_id = p_slot_id
  FOR UPDATE;

  IF slot_status <> 'available' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Slot is not available';
  END IF;

  SELECT COUNT(*) INTO booking_count
  FROM Reservation
  WHERE slot_id = p_slot_id
    AND reservation_status = 'active'
    AND start_time < p_end
    AND end_time > p_start;

  IF booking_count > 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Slot is already booked for this time period';
  END IF;

  INSERT INTO Reservation (user_id, vehicle_id, slot_id, reservation_date, start_time, end_time)
  VALUES (p_user_id, p_vehicle_id, p_slot_id, DATE(p_start), p_start, p_end);

  SET @new_id = LAST_INSERT_ID();

  UPDATE ParkingSlot SET availability_status = 'unavailable' WHERE slot_id = p_slot_id;

  COMMIT;

  SELECT @new_id AS reservation_id;
END//

CREATE PROCEDURE CompleteReservation(
  IN p_reservation_id INT,
  IN p_user_id INT
)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_owner INT;
  DECLARE v_slot INT;
  DECLARE v_end DATETIME;
  DECLARE v_overstay_minutes INT DEFAULT 0;
  DECLARE v_overstay_hours INT;
  DECLARE v_fine DECIMAL(10,2) DEFAULT 0;
  DECLARE v_fine_rate DECIMAL(10,2) DEFAULT 15.00;
  DECLARE existing_fine INT DEFAULT 0;

  START TRANSACTION;

  IF NOT EXISTS (SELECT 1 FROM Reservation WHERE reservation_id = p_reservation_id) THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation not found';
  END IF;

  SELECT reservation_status, user_id, slot_id, end_time
    INTO v_status, v_owner, v_slot, v_end
  FROM Reservation
  WHERE reservation_id = p_reservation_id
  FOR UPDATE;

  IF v_owner <> p_user_id THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not authorized for this reservation';
  END IF;

  IF v_status <> 'active' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only active reservations can be checked out';
  END IF;

  UPDATE Reservation SET reservation_status = 'completed' WHERE reservation_id = p_reservation_id;
  UPDATE ParkingSlot SET availability_status = 'available' WHERE slot_id = v_slot;

  SET v_overstay_minutes = TIMESTAMPDIFF(MINUTE, v_end, NOW());

  SELECT COUNT(*) INTO existing_fine
  FROM Fine
  WHERE reservation_id = p_reservation_id;

  IF v_overstay_minutes > 0 AND existing_fine = 0 THEN
    SET v_overstay_hours = CEIL(v_overstay_minutes / 60.0);
    SET v_fine = v_overstay_hours * v_fine_rate;
    INSERT INTO Fine (reservation_id, user_id, amount, reason, status)
    VALUES (
      p_reservation_id,
      p_user_id,
      v_fine,
      CONCAT('Overstay by ', v_overstay_hours, ' hour(s) @ $15/hr'),
      'pending'
    );
  END IF;

  COMMIT;

  SELECT p_reservation_id AS reservation_id,
         IFNULL(v_overstay_minutes, 0) AS overstay_minutes,
         IF(v_overstay_minutes > 0 AND existing_fine = 0, CEIL(v_overstay_minutes / 60.0) * v_fine_rate, 0) AS fine_amount;
END//

CREATE PROCEDURE AdminDeleteReservation(IN p_reservation_id INT)
BEGIN
  DECLARE v_slot INT;
  DECLARE v_status VARCHAR(20);

  START TRANSACTION;

  IF NOT EXISTS (SELECT 1 FROM Reservation WHERE reservation_id = p_reservation_id) THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation not found';
  END IF;

  SELECT slot_id, reservation_status INTO v_slot, v_status
  FROM Reservation
  WHERE reservation_id = p_reservation_id
  FOR UPDATE;

  DELETE FROM Reservation WHERE reservation_id = p_reservation_id;

  IF v_status = 'active' THEN
    UPDATE ParkingSlot SET availability_status = 'available' WHERE slot_id = v_slot;
  END IF;

  COMMIT;

  SELECT p_reservation_id AS deleted_reservation_id;
END//

DELIMITER ;

CREATE VIEW ReservationSummaryView AS
SELECT
  r.reservation_id,
  u.user_id,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  v.vehicle_id,
  v.license_plate,
  v.brand,
  v.model,
  ps.slot_id,
  ps.slot_number,
  ps.slot_type,
  pl.lot_id,
  pl.lot_name,
  pl.location,
  r.reservation_date,
  r.start_time,
  r.end_time,
  r.reservation_status,
  r.created_at,
  f.fine_id,
  f.amount AS fine_amount,
  f.status AS fine_status
FROM Reservation r
JOIN User u         ON r.user_id = u.user_id
JOIN Vehicle v      ON r.vehicle_id = v.vehicle_id
JOIN ParkingSlot ps ON r.slot_id = ps.slot_id
JOIN ParkingLot pl  ON ps.lot_id = pl.lot_id
LEFT JOIN Fine f ON r.reservation_id = f.reservation_id;
