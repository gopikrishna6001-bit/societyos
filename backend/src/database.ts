import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'society.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS residents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flat_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    move_in_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive'))
  );

  CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resident_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('paid', 'pending', 'overdue')),
    paid_date TEXT,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('general', 'urgent', 'event')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT NOT NULL DEFAULT 'Admin'
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resident_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('maintenance', 'security', 'noise', 'other')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
  );
`);

// Seed data if empty
const residentCount = (db.prepare('SELECT COUNT(*) as count FROM residents').get() as { count: number }).count;

if (residentCount === 0) {
  const insertResident = db.prepare(`
    INSERT INTO residents (flat_number, name, email, phone, move_in_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const residents = [
    ['A-101', 'Rahul Sharma', 'rahul.sharma@email.com', '9876543210', '2022-01-15', 'active'],
    ['A-102', 'Priya Mehta', 'priya.mehta@email.com', '9876543211', '2021-06-01', 'active'],
    ['A-103', 'Vikram Singh', 'vikram.singh@email.com', '9876543212', '2020-03-10', 'active'],
    ['B-201', 'Anita Patel', 'anita.patel@email.com', '9876543213', '2023-02-20', 'active'],
    ['B-202', 'Suresh Kumar', 'suresh.kumar@email.com', '9876543214', '2019-11-05', 'active'],
    ['B-203', 'Deepa Nair', 'deepa.nair@email.com', '9876543215', '2022-08-15', 'inactive'],
    ['C-301', 'Amit Gupta', 'amit.gupta@email.com', '9876543216', '2021-04-25', 'active'],
    ['C-302', 'Sunita Joshi', 'sunita.joshi@email.com', '9876543217', '2023-07-01', 'active'],
  ];

  const insertMany = db.transaction((rows: string[][]) => {
    for (const row of rows) {
      insertResident.run(row[0], row[1], row[2], row[3], row[4], row[5]);
    }
  });
  insertMany(residents);

  // Seed maintenance records
  const insertMaintenance = db.prepare(`
    INSERT INTO maintenance (resident_id, amount, month, year, status, paid_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  type MaintenanceRow = [number, number, number, number, string, string | null];
  const maintenanceRecords: MaintenanceRow[] = [
    [1, 2500, 1, 2025, 'paid', '2025-01-05'],
    [2, 2500, 1, 2025, 'paid', '2025-01-08'],
    [3, 2500, 1, 2025, 'pending', null],
    [4, 2500, 1, 2025, 'paid', '2025-01-10'],
    [5, 2500, 1, 2025, 'overdue', null],
    [6, 2500, 1, 2025, 'overdue', null],
    [7, 2500, 1, 2025, 'pending', null],
    [8, 2500, 1, 2025, 'paid', '2025-01-12'],
    [1, 2500, 2, 2025, 'paid', '2025-02-04'],
    [2, 2500, 2, 2025, 'pending', null],
    [3, 2500, 2, 2025, 'overdue', null],
    [4, 2500, 2, 2025, 'paid', '2025-02-07'],
  ];

  const insertMaintenanceMany = db.transaction((rows: MaintenanceRow[]) => {
    for (const row of rows) {
      insertMaintenance.run(row[0], row[1], row[2], row[3], row[4], row[5]);
    }
  });
  insertMaintenanceMany(maintenanceRecords);

  // Seed notices
  const insertNotice = db.prepare(`
    INSERT INTO notices (title, content, category, created_at, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);

  const notices = [
    ['Annual General Meeting', 'The AGM is scheduled for January 30, 2025 at 6:00 PM in the community hall. All residents are requested to attend.', 'urgent', '2025-01-15 10:00:00', 'Admin'],
    ['Water Supply Interruption', 'Water supply will be interrupted on Jan 20, 2025 from 10 AM to 2 PM for maintenance work.', 'urgent', '2025-01-18 09:00:00', 'Admin'],
    ['Society Picnic', 'Annual society picnic is planned for February 15, 2025. Please register at the society office by Feb 10.', 'event', '2025-01-20 11:00:00', 'Admin'],
    ['Maintenance Fee Reminder', 'This is a reminder to pay your maintenance fees for January 2025. Please pay by Jan 25 to avoid late charges.', 'general', '2025-01-22 08:00:00', 'Admin'],
    ['New Security Protocols', 'New visitor security protocols are in effect from February 1. All visitors must register at the gate.', 'general', '2025-01-25 10:00:00', 'Admin'],
  ];

  const insertNoticeMany = db.transaction((rows: string[][]) => {
    for (const row of rows) {
      insertNotice.run(row[0], row[1], row[2], row[3], row[4]);
    }
  });
  insertNoticeMany(notices);

  // Seed complaints
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (resident_id, title, description, category, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  type ComplaintRow = [number, string, string, string, string, string];
  const complaints: ComplaintRow[] = [
    [1, 'Elevator Not Working', 'The elevator in Block A has been out of order for 3 days. Please fix urgently.', 'maintenance', 'in_progress', '2025-01-18 14:00:00'],
    [3, 'Parking Issue', 'Unknown vehicle parked in my designated spot. Please take action.', 'security', 'open', '2025-01-20 09:00:00'],
    [5, 'Noise from B-201', 'Loud music playing late nights from flat B-201. This is disturbing.', 'noise', 'resolved', '2025-01-15 22:00:00'],
    [7, 'Water Leakage', 'Water leaking from the terrace into my flat C-301 during rains.', 'maintenance', 'open', '2025-01-22 11:00:00'],
    [2, 'Street Light Broken', 'The street light near Block A entrance is not working. Security concern.', 'security', 'in_progress', '2025-01-19 20:00:00'],
  ];

  const insertComplaintMany = db.transaction((rows: ComplaintRow[]) => {
    for (const row of rows) {
      insertComplaint.run(row[0], row[1], row[2], row[3], row[4], row[5]);
    }
  });
  insertComplaintMany(complaints);
}

export default db;
