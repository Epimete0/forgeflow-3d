import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { 
  User, 
  Phone, 
  ShoppingCart, 
  Calendar, 
  ChevronRight, 
  Search,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Order } from "../types";
import { formatCurrency, cn } from "../lib/utils";

interface CustomersProps {
  state: {
    orders: Order[];
  };
}

export default function Customers({ state }: CustomersProps) {
  const { orders } = state;
  const [searchTerm, setSearchTerm] = useState("");

  const customers = useMemo(() => {
    const customerMap = new Map<string, {
      name: string;
      phone?: string;
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: string;
      orders: Order[];
    }>();

    orders.forEach(order => {
      const key = order.customerName.toLowerCase().trim();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: order.customerName,
          phone: order.customerPhone,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: order.orderDate,
          orders: []
        });
      }

      const data = customerMap.get(key)!;
      data.totalOrders += 1;
      data.totalSpent += order.total;
      data.orders.push(order);
      if (new Date(order.orderDate) > new Date(data.lastOrderDate)) {
        data.lastOrderDate = order.orderDate;
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Directorio de Clientes</h2>
        <p className="text-on-surface-variant mt-1">Historial de ventas y contacto de tus clientes frecuentes.</p>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
        <input 
          className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50" 
          placeholder="Buscar cliente por nombre o teléfono..." 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer, index) => (
          <CustomerCard key={customer.name} customer={customer} index={index} />
        ))}
        
        {filteredCustomers.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-outline-variant/5">
            <User className="w-12 h-12 text-on-surface-variant/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-on-surface">No se encontraron clientes</h3>
            <p className="text-sm text-on-surface-variant mt-1">Los clientes aparecen automáticamente al crear pedidos.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerCard({ customer, index }: { customer: any; index: number; key?: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-outline-variant/5 group"
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-bold text-on-surface font-headline text-lg">{customer.name}</h4>
            {customer.phone && (
              <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" />
                {customer.phone}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-low p-3 rounded-2xl">
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Total Compras</p>
            <p className="text-sm font-bold text-primary flex items-center gap-1 mt-1">
              <ShoppingCart className="w-3 h-3" />
              {customer.totalOrders}
            </p>
          </div>
          <div className="bg-surface-container-low p-3 rounded-2xl">
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Inversión Total</p>
            <p className="text-sm font-bold text-on-surface mt-1">{formatCurrency(customer.totalSpent)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Último pedido: {new Date(customer.lastOrderDate).toLocaleDateString()}
          </p>
          
          <div className="space-y-2">
            {customer.orders.slice(0, 2).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-2 bg-surface-dim/30 rounded-xl text-[10px]">
                <span className="font-bold text-on-surface-variant">{order.id}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter",
                  order.status === "entregado" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
                )}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button className="w-full py-3 bg-surface-container-low text-on-surface rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 group/btn">
          Ver Historial Completo
          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
