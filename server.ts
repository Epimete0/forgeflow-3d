import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import "dotenv/config";
import db, { initDb } from "./src/db";
import crypto from "node:crypto";
import { performBackup } from "./src/lib/backup-service";

// Initialize database
initDb();

// Initial backup on startup
performBackup(db);

// Schedule automatic backup every 6 hours
const SIX_HOURS = 6 * 60 * 60 * 1000;
setInterval(() => performBackup(db), SIX_HOURS);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API Routes
app.get("/api/products", (req, res) => {
  const products = db.prepare("SELECT * FROM Product").all().map((p: any) => ({
    ...p,
    parts: p.parts ? JSON.parse(p.parts) : undefined
  }));
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const product = { 
    description: null,
    stlFile: null,
    notes: null,
    ...req.body, 
    parts: req.body.parts ? JSON.stringify(req.body.parts) : null,
    id: req.body.id || crypto.randomUUID() 
  };
  const stmt = db.prepare(`
    INSERT INTO Product (id, name, price, weight, printTime, description, category, stlFile, notes, parts)
    VALUES (@id, @name, @price, @weight, @printTime, @description, @category, @stlFile, @notes, @parts)
  `);
  stmt.run(product);
  res.json(product);
});

app.put("/api/products/:id", (req, res) => {
  const stmt = db.prepare(`
    UPDATE Product SET 
      name = @name, price = @price, weight = @weight, printTime = @printTime, 
      description = @description, category = @category, stlFile = @stlFile, notes = @notes, parts = @parts
    WHERE id = @id
  `);
  stmt.run({ description: null, stlFile: null, notes: null, ...req.body, parts: req.body.parts ? JSON.stringify(req.body.parts) : null, id: req.params.id });
  res.json({ ...req.body, id: req.params.id });
});

app.delete("/api/products/:id", (req, res) => {
  db.prepare("DELETE FROM Product WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/filaments", (req, res) => {
  const filaments = db.prepare("SELECT * FROM Filament").all();
  res.json(filaments);
});

app.post("/api/filaments", (req, res) => {
  const filament = { ...req.body, id: req.body.id || crypto.randomUUID() };
  const stmt = db.prepare(`
    INSERT INTO Filament (id, brand, type, color, initialWeight, remainingWeight, price, provider, purchaseDate)
    VALUES (@id, @brand, @type, @color, @initialWeight, @remainingWeight, @price, @provider, @purchaseDate)
  `);
  stmt.run(filament);
  res.json(filament);
});

app.put("/api/filaments/:id", (req, res) => {
  const stmt = db.prepare(`
    UPDATE Filament SET 
      brand = @brand, type = @type, color = @color, initialWeight = @initialWeight, 
      remainingWeight = @remainingWeight, price = @price, provider = @provider, purchaseDate = @purchaseDate
    WHERE id = @id
  `);
  stmt.run({ ...req.body, id: req.params.id });
  res.json({ ...req.body, id: req.params.id });
});

app.delete("/api/filaments/:id", (req, res) => {
  db.prepare("DELETE FROM Filament WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/orders", (req, res) => {
  const orders = db.prepare("SELECT * FROM Orders").all() as any[];
  const stmt = db.prepare("SELECT * FROM OrderItem WHERE orderId = ?");
  
  const results = orders.map(order => ({
    ...order,
    items: stmt.all(order.id).map((i: any) => ({
      ...i,
      completed: Boolean(i.completed),
      materials: i.materials ? JSON.parse(i.materials) : undefined
    }))
  }));
  res.json(results);
});

// Import endpoint: inserts order WITHOUT deducting filament (used by backup restore)
app.post("/api/orders/import", (req, res) => {
  const { items, ...orderData } = req.body;
  const orderId = orderData.id || crypto.randomUUID();

  const importOrderTransaction = db.transaction(() => {
    // Check if order already exists
    const existing = db.prepare("SELECT id FROM Orders WHERE id = ?").get(orderId);
    if (existing) {
      return null; // Skip duplicate
    }

    const orderStmt = db.prepare(`
      INSERT INTO Orders (id, customerName, customerPhone, orderDate, notes, status, total, paid, pending, paymentMethod)
      VALUES (@id, @customerName, @customerPhone, @orderDate, @notes, @status, @total, @paid, @pending, @paymentMethod)
    `);
    orderStmt.run({
      id: orderId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone || "",
      orderDate: orderData.orderDate,
      notes: orderData.notes || "",
      status: orderData.status,
      total: orderData.total,
      paid: orderData.paid,
      pending: orderData.pending,
      paymentMethod: orderData.paymentMethod
    });

    if (items && items.length > 0) {
      const itemStmt = db.prepare(`
        INSERT INTO OrderItem (id, orderId, productId, productName, quantity, color, filamentId, unitPrice, totalWeight, totalPrintTime, completed, materials)
        VALUES (@id, @orderId, @productId, @productName, @quantity, @color, @filamentId, @unitPrice, @totalWeight, @totalPrintTime, @completed, @materials)
      `);
      for (const item of items) {
        itemStmt.run({
          id: item.id || crypto.randomUUID(),
          orderId: orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          color: item.color || "",
          filamentId: item.filamentId || "",
          unitPrice: item.unitPrice,
          totalWeight: item.totalWeight,
          totalPrintTime: item.totalPrintTime,
          completed: item.completed ? 1 : 0,
          materials: item.materials ? JSON.stringify(item.materials) : null
        });
      }
    }

    return { ...orderData, id: orderId, items };
  });

  try {
    const result = importOrderTransaction();
    if (result === null) {
      res.json({ skipped: true, id: orderId });
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error("Order import error:", error);
    res.status(500).json({ error: "Failed to import order" });
  }
});

app.post("/api/orders", (req, res) => {
  const { items, ...orderData } = req.body;
  const orderId = orderData.id || crypto.randomUUID();
  
  const createOrderTransaction = db.transaction(() => {
    // 1. Create order
    const orderStmt = db.prepare(`
      INSERT INTO Orders (id, customerName, customerPhone, orderDate, notes, status, total, paid, pending, paymentMethod)
      VALUES (@id, @customerName, @customerPhone, @orderDate, @notes, @status, @total, @paid, @pending, @paymentMethod)
    `);
    orderStmt.run({
      id: orderId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      orderDate: orderData.orderDate,
      notes: orderData.notes,
      status: orderData.status,
      total: orderData.total,
      paid: orderData.paid,
      pending: orderData.pending,
      paymentMethod: orderData.paymentMethod
    });

    // 2. Create items and update inventory
    const itemStmt = db.prepare(`
      INSERT INTO OrderItem (id, orderId, productId, productName, quantity, color, filamentId, unitPrice, totalWeight, totalPrintTime, completed, materials)
      VALUES (@id, @orderId, @productId, @productName, @quantity, @color, @filamentId, @unitPrice, @totalWeight, @totalPrintTime, @completed, @materials)
    `);
    const updateFilamentStmt = db.prepare("UPDATE Filament SET remainingWeight = remainingWeight - @weight WHERE id = @id");

    for (const item of items) {
      itemStmt.run({
        id: crypto.randomUUID(),
        orderId: orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        color: item.color || "",
        filamentId: item.filamentId || "",
        unitPrice: item.unitPrice,
        totalWeight: item.totalWeight,
        totalPrintTime: item.totalPrintTime,
        completed: item.completed ? 1 : 0,
        materials: item.materials ? JSON.stringify(item.materials) : null
      });

      if (item.materials && item.materials.length > 0) {
        for (const mat of item.materials) {
           updateFilamentStmt.run({ weight: mat.weight * item.quantity, id: mat.filamentId });
        }
      } else if (item.filamentId) {
        updateFilamentStmt.run({ weight: item.totalWeight, id: item.filamentId });
      }
    }
    
    return { ...orderData, id: orderId, items };
  });

  try {
    const result = createOrderTransaction();
    res.json(result);
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.put("/api/orders/:id", (req, res) => {
  const { items, ...orderData } = req.body;
  const orderId = req.params.id;

  const updateOrderTransaction = db.transaction(() => {
    // 1. Restore previous inventory
    const oldItems = db.prepare("SELECT filamentId, totalWeight, quantity, materials FROM OrderItem WHERE orderId = ?").all(orderId) as any[];
    const restoreStmt = db.prepare("UPDATE Filament SET remainingWeight = remainingWeight + @weight WHERE id = @id");
    for (const item of oldItems) {
      if (item.materials) {
        const materials = JSON.parse(item.materials);
        for (const mat of materials) {
          restoreStmt.run({ weight: mat.weight * item.quantity, id: mat.filamentId });
        }
      } else if (item.filamentId) {
        restoreStmt.run({ weight: item.totalWeight, id: item.filamentId });
      }
    }

    // 2. Delete old items
    db.prepare("DELETE FROM OrderItem WHERE orderId = ?").run(orderId);

    // 3. Update order
    const orderStmt = db.prepare(`
      UPDATE Orders SET 
        customerName = @customerName, customerPhone = @customerPhone, orderDate = @orderDate, 
        notes = @notes, status = @status, total = @total, paid = @paid, 
        pending = @pending, paymentMethod = @paymentMethod
      WHERE id = @id
    `);
    orderStmt.run({ ...orderData, id: orderId });

    // 4. Create new items and deduct inventory
    const itemStmt = db.prepare(`
      INSERT INTO OrderItem (id, orderId, productId, productName, quantity, color, filamentId, unitPrice, totalWeight, totalPrintTime, completed, materials)
      VALUES (@id, @orderId, @productId, @productName, @quantity, @color, @filamentId, @unitPrice, @totalWeight, @totalPrintTime, @completed, @materials)
    `);
    const deductStmt = db.prepare("UPDATE Filament SET remainingWeight = remainingWeight - @weight WHERE id = @id");

    for (const item of items) {
      itemStmt.run({
        id: item.id || crypto.randomUUID(),
        orderId: orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        color: item.color || "",
        filamentId: item.filamentId || "",
        unitPrice: item.unitPrice,
        totalWeight: item.totalWeight,
        totalPrintTime: item.totalPrintTime,
        completed: item.completed ? 1 : 0,
        materials: item.materials ? JSON.stringify(item.materials) : null
      });
      
      if (item.materials && item.materials.length > 0) {
        for (const mat of item.materials) {
           deductStmt.run({ weight: mat.weight * item.quantity, id: mat.filamentId });
        }
      } else if (item.filamentId) {
        deductStmt.run({ weight: item.totalWeight, id: item.filamentId });
      }
    }

    return { ...orderData, id: orderId, items };
  });

  try {
    const result = updateOrderTransaction();
    res.json(result);
  } catch (error) {
    console.error("Order update error:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

app.delete("/api/orders/:id", (req, res) => {
  const orderId = req.params.id;
  const deleteOrderTransaction = db.transaction(() => {
    // 1. Restore inventory (multi-material aware)
    const items = db.prepare("SELECT filamentId, totalWeight, quantity, materials FROM OrderItem WHERE orderId = ?").all(orderId) as any[];
    const restoreStmt = db.prepare("UPDATE Filament SET remainingWeight = remainingWeight + @weight WHERE id = @id");
    for (const item of items) {
      if (item.materials) {
        const materials = JSON.parse(item.materials);
        for (const mat of materials) {
          restoreStmt.run({ weight: mat.weight * item.quantity, id: mat.filamentId });
        }
      } else if (item.filamentId) {
        restoreStmt.run({ weight: item.totalWeight, id: item.filamentId });
      }
    }

    // 2. Delete order (OrderItems will be deleted by Cascade)
    db.prepare("DELETE FROM Orders WHERE id = ?").run(orderId);
    db.prepare("DELETE FROM OrderItem WHERE orderId = ?").run(orderId);
  });

  try {
    deleteOrderTransaction();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete order" });
  }
});

app.get("/api/waste", (req, res) => {
  const waste = db.prepare(`
    SELECT w.*, f.brand as filamentBrand, f.color as filamentColor 
    FROM WasteRecord w
    JOIN Filament f ON w.filamentId = f.id
  `).all();
  res.json(waste);
});

app.post("/api/waste", (req, res) => {
  const record = { ...req.body, id: crypto.randomUUID() };
  const wasteTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO WasteRecord (id, filamentId, weight, reason, date)
      VALUES (@id, @filamentId, @weight, @reason, @date)
    `).run(record);

    db.prepare("UPDATE Filament SET remainingWeight = remainingWeight - @weight WHERE id = @id")
      .run({ weight: record.weight, id: record.filamentId });
    
    return record;
  });

  try {
    const result = wasteTransaction();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create waste record" });
  }
});

app.delete("/api/waste/:id", (req, res) => {
  const wasteTransaction = db.transaction(() => {
    const record = db.prepare("SELECT filamentId, weight FROM WasteRecord WHERE id = ?").get(req.params.id) as any;
    if (record) {
      db.prepare("UPDATE Filament SET remainingWeight = remainingWeight + @weight WHERE id = @id")
        .run({ weight: record.weight, id: record.filamentId });
    }
    db.prepare("DELETE FROM WasteRecord WHERE id = ?").run(req.params.id);
  });

  try {
    wasteTransaction();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete waste record" });
  }
});

app.get("/api/activities", (req, res) => {
  const activities = db.prepare("SELECT * FROM ActivityEvent ORDER BY timestamp DESC LIMIT 50").all();
  res.json(activities);
});

app.post("/api/activities", (req, res) => {
  const activity = { ...req.body, id: crypto.randomUUID() };
  db.prepare(`
    INSERT INTO ActivityEvent (id, type, description, timestamp)
    VALUES (@id, @type, @description, @timestamp)
  `).run(activity);
  res.json(activity);
});

app.get("/api/settings", (req, res) => {
  const settings = db.prepare("SELECT * FROM CostSettings WHERE id = 1").get();
  res.json(settings);
});

app.post("/api/settings", (req, res) => {
  db.prepare(`
    UPDATE CostSettings SET 
      electricityPriceKwh = @electricityPriceKwh, printerPowerWatts = @printerPowerWatts, 
      machineWearPerHour = @machineWearPerHour, defaultProfitMargin = @defaultProfitMargin, 
      vatRate = @vatRate, personalSalaryPercentage = @personalSalaryPercentage
    WHERE id = 1
  `).run(req.body);
  res.json({ ...req.body, id: 1 });
});

app.get("/api/printers", (req, res) => {
  const printers = db.prepare("SELECT * FROM Printer").all() as any[];
  const stmt = db.prepare("SELECT * FROM MaintenanceRecord WHERE printerId = ?");
  const results = printers.map(p => ({
    ...p,
    maintenanceRecords: stmt.all(p.id)
  }));
  res.json(results);
});

app.post("/api/printers", (req, res) => {
  const printer = { ...req.body, id: crypto.randomUUID() };
  db.prepare(`
    INSERT INTO Printer (id, name, model, status, totalHours, lastMaintenanceHours, purchaseDate)
    VALUES (@id, @name, @model, @status, @totalHours, @lastMaintenanceHours, @purchaseDate)
  `).run(printer);
  res.json(printer);
});

app.put("/api/printers/:id", (req, res) => {
  db.prepare(`
    UPDATE Printer SET 
      name = @name, model = @model, status = @status, totalHours = @totalHours, 
      lastMaintenanceHours = @lastMaintenanceHours, purchaseDate = @purchaseDate
    WHERE id = @id
  `).run({ ...req.body, id: req.params.id });
  res.json({ ...req.body, id: req.params.id });
});

app.delete("/api/printers/:id", (req, res) => {
  db.prepare("DELETE FROM Printer WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/maintenance", (req, res) => {
  const maintenance = db.prepare("SELECT * FROM MaintenanceRecord").all();
  res.json(maintenance);
});

app.post("/api/maintenance", (req, res) => {
  const record = { ...req.body, id: crypto.randomUUID() };
  db.prepare(`
    INSERT INTO MaintenanceRecord (id, printerId, type, description, date, hoursAtMaintenance)
    VALUES (@id, @printerId, @type, @description, @date, @hoursAtMaintenance)
  `).run(record);
  res.json(record);
});

// Expenses API
app.get("/api/expenses", (req, res) => {
  const expenses = db.prepare("SELECT * FROM Expense ORDER BY date DESC").all();
  res.json(expenses);
});

app.post("/api/expenses", (req, res) => {
  const expense = { ...req.body, id: crypto.randomUUID() };
  const movementId = `CM-${Date.now()}`;

  const createExpenseTransaction = db.transaction(() => {
    // 1. Create the expense record
    db.prepare(`
      INSERT INTO Expense (id, category, description, amount, date, paymentMethod)
      VALUES (@id, @category, @description, @amount, @date, @paymentMethod)
    `).run(expense);

    // 2. Auto-create a linked CashMovement so it's visible in the treasury history
    db.prepare(`
      INSERT INTO CashMovement (id, type, amount, description, date, relatedExpenseId)
      VALUES (@id, @type, @amount, @description, @date, @relatedExpenseId)
    `).run({
      id: movementId,
      type: "gasto_operacional",
      amount: expense.amount,
      description: `[${expense.category}] ${expense.description}`,
      date: expense.date || new Date().toISOString(),
      relatedExpenseId: expense.id,
    });

    return expense;
  });

  try {
    const result = createExpenseTransaction();
    res.json(result);
  } catch (error) {
    console.error("Expense creation error:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

app.delete("/api/expenses/:id", (req, res) => {
  const deleteExpenseTransaction = db.transaction(() => {
    // Also delete any linked CashMovement
    db.prepare("DELETE FROM CashMovement WHERE relatedExpenseId = ?").run(req.params.id);
    db.prepare("DELETE FROM Expense WHERE id = ?").run(req.params.id);
  });

  try {
    deleteExpenseTransaction();
    res.json({ success: true });
  } catch (error) {
    console.error("Expense deletion error:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// ==================== Cash Movements ====================
app.get("/api/cash-movements", (req, res) => {
  const movements = db.prepare("SELECT * FROM CashMovement ORDER BY date DESC").all();
  res.json(movements);
});

app.post("/api/cash-movements", (req, res) => {
  const movement = {
    id: `CM-${Date.now()}`,
    ...req.body,
    date: req.body.date || new Date().toISOString(),
    relatedExpenseId: req.body.relatedExpenseId || null,
  };
  db.prepare(`
    INSERT INTO CashMovement (id, type, amount, description, date, relatedExpenseId)
    VALUES (@id, @type, @amount, @description, @date, @relatedExpenseId)
  `).run(movement);
  res.json(movement);
});

app.delete("/api/cash-movements/:id", (req, res) => {
  db.prepare("DELETE FROM CashMovement WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  db.close();
  server.close();
  process.exit();
});
