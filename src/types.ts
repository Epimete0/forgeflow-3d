export type OrderStatus = "pendiente" | "en impresión" | "listo" | "entregado" | "cancelado" | "finalizado";
export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta" | "otro";

export interface Product {
  id: string;
  name: string;
  price: number;
  weight: number; // in grams
  printTime: number; // in minutes
  description?: string;
  category: string;
  stlFile?: string;
  notes?: string;
  parts?: ProductPart[];
}

export interface ProductPart {
  id: string;
  name: string;
  weight: number;
}

export interface Filament {
  id: string;
  brand: string;
  type: string; // PLA, PETG, etc.
  color: string;
  initialWeight: number; // in grams
  remainingWeight: number; // in grams
  price: number;
  provider?: string;
  purchaseDate: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  color: string;
  filamentId: string;
  unitPrice: number;
  totalWeight: number;
  totalPrintTime: number;
  completed?: boolean;
  materials?: OrderItemMaterial[];
}

export interface OrderItemMaterial {
  partId: string;
  name: string;
  filamentId: string;
  weight: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  orderDate: string;
  notes?: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  paid: number;
  pending: number;
  paymentMethod: PaymentMethod;
}

export interface CostSettings {
  electricityPriceKwh: number; // e.g., 120 CLP
  printerPowerWatts: number; // e.g., 150W
  machineWearPerHour: number; // e.g., 200 CLP/h
  defaultProfitMargin: number; // e.g., 50%
  vatRate: number; // e.g., 19%
  personalSalaryPercentage: number; // e.g., 30% of net profit
}

export interface ActivityEvent {
  id: string;
  type: "pedido_creado" | "pedido_finalizado" | "pago_registrado" | "impresion_iniciada" | "merma_registrada" | "producto_creado" | "filamento_registrado" | "sistema_actualizado" | "gasto_registrado";
  description: string;
  timestamp: string;
}

export interface WasteRecord {
  id: string;
  filamentId: string;
  weight: number; // in grams
  reason: string;
  date: string;
}

export interface Printer {
  id: string;
  name: string;
  model: string;
  status: "disponible" | "imprimiendo" | "mantenimiento" | "error";
  totalHours: number;
  lastMaintenanceHours: number;
  purchaseDate: string;
}

export interface MaintenanceRecord {
  id: string;
  printerId: string;
  type: string;
  description: string;
  date: string;
  hoursAtMaintenance: number;
}

export interface Expense {
  id: string;
  category: "Insumos" | "Repuestos" | "Envío" | "Herramientas" | "Varios";
  description: string;
  amount: number;
  date: string;
  paymentMethod: string;
}
