import { Product, Filament, Order, ActivityEvent, CostSettings, Printer } from "./types";

export const INITIAL_COST_SETTINGS: CostSettings = {
  electricityPriceKwh: 120, // CLP
  printerPowerWatts: 150, // Watts
  machineWearPerHour: 200, // CLP/h
  defaultProfitMargin: 50, // %
  vatRate: 19, // %
  personalSalaryPercentage: 30, // %
};

export const INITIAL_PRINTERS: Printer[] = [
  {
    id: "pr1",
    name: "Ender 3 V2",
    model: "Creality",
    status: "disponible",
    totalHours: 1250,
    lastMaintenanceHours: 1100,
    purchaseDate: "2023-05-10",
  },
  {
    id: "pr2",
    name: "Prusa MK4",
    model: "Original Prusa",
    status: "imprimiendo",
    totalHours: 450,
    lastMaintenanceHours: 400,
    purchaseDate: "2023-11-20",
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Protector de yogurt",
    price: 3000,
    weight: 18,
    printTime: 45,
    category: "Accesorios",
    description: "Accesorio ergonómico para envases de lácteos.",
  },
  {
    id: "p2",
    name: "Protector de leche",
    price: 3500,
    weight: 22,
    printTime: 55,
    category: "Accesorios",
  },
  {
    id: "p3",
    name: "Llavero Personalizado",
    price: 1500,
    weight: 5,
    printTime: 15,
    category: "Regalos",
  },
  {
    id: "p4",
    name: "Emblema Subaru",
    price: 8000,
    weight: 35,
    printTime: 120,
    category: "Automotriz",
  },
];

export const INITIAL_FILAMENTS: Filament[] = [
  {
    id: "f1",
    brand: "eSun",
    type: "PLA",
    color: "Negro",
    initialWeight: 1000,
    remainingWeight: 720,
    price: 15000,
    purchaseDate: "2024-01-15",
  },
  {
    id: "f2",
    brand: "Prusament",
    type: "PETG",
    color: "Azul Cobalto",
    initialWeight: 1000,
    remainingWeight: 850,
    price: 25000,
    purchaseDate: "2024-02-10",
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: "FF-9241",
    customerName: "Matías Silveira",
    orderDate: "2024-03-20T14:30:00Z",
    status: "en impresión",
    items: [
      {
        id: "oi1",
        productId: "p1",
        productName: "Protector de yogurt",
        quantity: 5,
        color: "Azul",
        filamentId: "f2",
        unitPrice: 3000,
        totalWeight: 90,
        totalPrintTime: 225,
      },
    ],
    total: 15000,
    paid: 6000,
    pending: 9000,
    paymentMethod: "transferencia",
  },
];

export const INITIAL_ACTIVITY: ActivityEvent[] = [
  {
    id: "a1",
    type: "pedido_creado",
    description: "Nuevo pedido #FF-9241 creado para Matías Silveira",
    timestamp: "2024-03-20T14:30:00Z",
  },
  {
    id: "a2",
    type: "impresion_iniciada",
    description: "Impresión iniciada para Protector de yogurt (x5)",
    timestamp: "2024-03-20T15:00:00Z",
  },
];
