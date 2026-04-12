import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('dev.db');
const db = new Database(dbPath);

const generateId = () => Math.random().toString(36).substring(2, 11);

console.log('🌱 Empezando seeding con better-sqlite3...');

// Initialize DB schema
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
    notes TEXT,
    parts TEXT
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
    materials TEXT,
    FOREIGN KEY (orderId) REFERENCES Orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS WasteRecord (
    id TEXT PRIMARY KEY,
    filamentId TEXT NOT NULL,
    weight REAL NOT NULL,
    reason TEXT NOT NULL,
    date TEXT NOT NULL
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
    hoursAtMaintenance REAL NOT NULL
  );
`);

// 1. Filaments
const plaRedId = generateId();
db.prepare(`
  INSERT INTO Filament (id, brand, type, color, initialWeight, remainingWeight, price, provider, purchaseDate)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(plaRedId, "eSun", "PLA+", "Rojo", 1000, 850, 18000, "3D Chile", new Date().toISOString());

const plaBlackId = generateId();
db.prepare(`
  INSERT INTO Filament (id, brand, type, color, initialWeight, remainingWeight, price, provider, purchaseDate)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(plaBlackId, "Creality", "PLA", "Negro", 1000, 420, 15000, "Mercado Libre", new Date().toISOString());

// 2. Products
const product1Id = generateId();
db.prepare(`
  INSERT INTO Product (id, name, price, weight, printTime, description, category)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(product1Id, "Dragón Articulado", 15000, 120, 480, "Dragón legendario con 24 puntos de articulación.", "Juguetes");

const product2Id = generateId();
db.prepare(`
  INSERT INTO Product (id, name, price, weight, printTime, description, category, parts)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(product2Id, "Fidget de Engranajes", 5000, 35, 90, "Juguete antiestrés de alta precisión.", "Fidgets", JSON.stringify([{id: "1", name: "Engranaje A", weight: 15}, {id: "2", name: "Capas", weight: 20}]));

// 3. Orders
const orderId = generateId();
db.prepare(`
  INSERT INTO Orders (id, customerName, customerPhone, orderDate, status, total, paid, pending, paymentMethod)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(orderId, "Juan Pérez", "+56912345678", new Date().toISOString(), "pendiente", 20000, 10000, 10000, "transferencia");

db.prepare(`
  INSERT INTO OrderItem (id, orderId, productId, productName, quantity, color, filamentId, unitPrice, totalWeight, totalPrintTime)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(generateId(), orderId, product1Id, "Dragón Articulado", 1, "Rojo", plaRedId, 15000, 120, 480);

db.prepare(`
  INSERT INTO OrderItem (id, orderId, productId, productName, quantity, color, filamentId, unitPrice, totalWeight, totalPrintTime, materials)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(generateId(), orderId, product2Id, "Fidget de Engranajes", 1, "Negro", plaBlackId, 5000, 35, 90, JSON.stringify([
  { partId: "1", name: "Engranaje A", weight: 15, filamentId: plaBlackId },
  { partId: "2", name: "Capas", weight: 20, filamentId: plaBlackId }
]));

console.log('✅ Seeding completado exitosamente.');
db.close();
