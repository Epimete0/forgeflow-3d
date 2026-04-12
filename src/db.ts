import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('dev.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Initialize DB schema to match the logic we had with Prisma
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Product (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      weight REAL NOT NULL,
      printTime INTEGER NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      stlFile TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS Filament (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      initialWeight REAL NOT NULL,
      remainingWeight REAL NOT NULL,
      price REAL NOT NULL,
      provider TEXT,
      purchaseDate TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Orders (
      id TEXT PRIMARY KEY,
      customerName TEXT NOT NULL,
      customerPhone TEXT,
      orderDate TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      total REAL NOT NULL,
      paid REAL NOT NULL,
      pending REAL NOT NULL,
      paymentMethod TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS OrderItem (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      productId TEXT NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      color TEXT NOT NULL,
      filamentId TEXT NOT NULL,
      unitPrice REAL NOT NULL,
      totalWeight REAL NOT NULL,
      totalPrintTime INTEGER NOT NULL,
      completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (orderId) REFERENCES Orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS WasteRecord (
      id TEXT PRIMARY KEY,
      filamentId TEXT NOT NULL,
      weight REAL NOT NULL,
      reason TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (filamentId) REFERENCES Filament(id)
    );

    CREATE TABLE IF NOT EXISTS ActivityEvent (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS CostSettings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      electricityPriceKwh REAL NOT NULL,
      printerPowerWatts REAL NOT NULL,
      machineWearPerHour REAL NOT NULL,
      defaultProfitMargin REAL NOT NULL,
      vatRate REAL NOT NULL,
      personalSalaryPercentage REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Printer (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL,
      totalHours REAL NOT NULL,
      lastMaintenanceHours REAL NOT NULL,
      purchaseDate TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS MaintenanceRecord (
      id TEXT PRIMARY KEY,
      printerId TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      hoursAtMaintenance REAL NOT NULL,
      FOREIGN KEY (printerId) REFERENCES Printer(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Expense (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      paymentMethod TEXT NOT NULL
    );
  `);

  // === Migrations: Multi-Material Support ===
  // These are safe to run multiple times (try/catch ignores "duplicate column" errors)
  try { db.exec(`ALTER TABLE Product ADD COLUMN parts TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE OrderItem ADD COLUMN materials TEXT;`); } catch (_) {}

  // Initial Cost Settings if not exists
  const settingsCount = db.prepare('SELECT count(*) as count FROM CostSettings').get() as { count: number };
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO CostSettings (id, electricityPriceKwh, printerPowerWatts, machineWearPerHour, defaultProfitMargin, vatRate, personalSalaryPercentage)
      VALUES (1, 120, 150, 200, 50, 19, 30)
    `).run();
  }
}

export default db;
