import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Edit2,
  MoreVertical,
  User,
  Phone,
  Calendar,
  CreditCard,
  Zap,
  Calculator,
  TrendingUp,
  Receipt,
  Save, 
  Trash2, 
  X,
  ShoppingCart,
  Activity,
  Box
} from "lucide-react";
import { cn, formatCurrency, generateId } from "../lib/utils";
import { shortId } from "../App";
import { Order, OrderStatus, Product, Filament, PaymentMethod } from "../types";
import Modal from "./Modal";
import { calculateOrderProfit } from "../lib/finance-utils";

interface OrdersProps {
  state: {
    orders: Order[];
    products: Product[];
    filaments: Filament[];
    costSettings: any;
    addActivity: (type: any, desc: string) => void;
    actions: any;
  };
}

export default function Orders({ state }: OrdersProps) {
  const { orders, products, filaments, costSettings, addActivity, actions } = state;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "todos">("todos");
  const [shippingFilter, setShippingFilter] = useState<string>("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Multi-item order state
  const [formItems, setFormItems] = useState<any[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [analyzingOrder, setAnalyzingOrder] = useState<Order | null>(null);
  const [timeFilter, setTimeFilter] = useState<"hoy" | "ayer" | "semana" | "mes" | "todos">("todos");

  const toggleItemCompletion = async (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    const updatedOrder = { ...order, items: updatedItems };
    await actions.orders.update(orderId, updatedOrder);

    // Update tracking order state if open
    if (trackingOrder?.id === orderId) {
      setTrackingOrder(updatedOrder);
    }
  };

  const markOrderAsReady = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    await actions.orders.update(orderId, { ...order, status: "listo" as OrderStatus });
    addActivity("pedido_finalizado", `Pedido ${orderId} marcado como LISTO vía Seguimiento`);
    setTrackingOrder(null);
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || o.status === statusFilter;
    const matchesShipping = shippingFilter === "todos" || (o.shippingStatus || "Pendiente") === shippingFilter;
    
    // Time filtering logic
    const orderDate = new Date(o.orderDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let matchesTime = true;
    if (timeFilter === "hoy") {
      const d = new Date(orderDate);
      d.setHours(0, 0, 0, 0);
      matchesTime = d.getTime() === today.getTime();
    } else if (timeFilter === "ayer") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const d = new Date(orderDate);
      d.setHours(0, 0, 0, 0);
      matchesTime = d.getTime() === yesterday.getTime();
    } else if (timeFilter === "semana") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesTime = orderDate >= weekAgo;
    } else if (timeFilter === "mes") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesTime = orderDate >= monthAgo;
    }

    return matchesSearch && matchesStatus && matchesTime && matchesShipping;
  });

  const openModal = (order: Order | null = null) => {
    if (order) {
      setEditingOrder(order);
      setFormItems(order.items.map(item => ({ ...item })));
    } else {
      setEditingOrder(null);
      
      const firstProduct = products[0];
      const prodParts = firstProduct?.parts && firstProduct.parts.length > 0 ? firstProduct.parts : [{ id: "1", name: "Base", weight: firstProduct?.weight || 0 }];
      
      setFormItems([{
        id: generateId(),
        productId: products[0]?.id || "",
        productName: products[0]?.name || "",
        quantity: 1,
        color: "",
        filamentId: filaments[0]?.id || "",
        unitPrice: products[0]?.price || 0,
        totalWeight: products[0]?.weight || 0,
        totalPrintTime: products[0]?.printTime || 0,
        completed: false,
        materials: prodParts.map(p => ({ partId: p.id, name: p.name, weight: p.weight, filamentId: filaments[0]?.id || "" }))
      }]);
    }
    setIsModalOpen(true);
  };

  const addItem = () => {
    const firstProduct = products[0];
    const prodParts = firstProduct?.parts && firstProduct.parts.length > 0 ? firstProduct.parts : [{ id: "1", name: "Base", weight: firstProduct?.weight || 0 }];
    
    setFormItems([...formItems, {
      id: generateId(),
      productId: products[0]?.id || "",
      productName: products[0]?.name || "",
      quantity: 1,
      color: "",
      filamentId: filaments[0]?.id || "",
      unitPrice: products[0]?.price || 0,
      totalWeight: products[0]?.weight || 0,
      totalPrintTime: products[0]?.printTime || 0,
      completed: false,
      materials: prodParts.map(p => ({ partId: p.id, name: p.name, weight: p.weight, filamentId: filaments[0]?.id || "" }))
    }]);
  };

  const removeItem = (id: string) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    setFormItems(formItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === "productId") {
          const product = products.find(p => p.id === value);
          if (product) {
            updatedItem.productName = product.name;
            updatedItem.unitPrice = product.price;
            updatedItem.totalWeight = product.weight * updatedItem.quantity;
            updatedItem.totalPrintTime = product.printTime * updatedItem.quantity;
            
            const prodParts = product.parts && product.parts.length > 0 ? product.parts : [{ id: "1", name: "Base", weight: product.weight }];
            updatedItem.materials = prodParts.map(p => ({ partId: p.id, name: p.name, weight: p.weight, filamentId: filaments[0]?.id || "" }));
          }
        }
        if (field === "quantity") {
          const product = products.find(p => p.id === updatedItem.productId);
          if (product) {
            updatedItem.totalWeight = product.weight * value;
            updatedItem.totalPrintTime = product.printTime * value;
          }
        }
        if (field === "filamentId") {
          const filament = filaments.find(f => f.id === value);
          if (filament) {
            updatedItem.color = filament.color;
          }
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const updateMaterial = (itemId: string, partId: string, filamentId: string) => {
    setFormItems(formItems.map(item => {
      if (item.id === itemId && item.materials) {
        return {
          ...item,
          materials: item.materials.map((m: any) => m.partId === partId ? { ...m, filamentId } : m)
        };
      }
      return item;
    }));
  };

  const handleSaveOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      
      const total = formItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
      const paidAmount = Number(formData.get("paidAmount"));

      const orderData: any = {
        customerName: formData.get("customerName") as string,
        customerPhone: formData.get("customerPhone") as string,
        orderDate: editingOrder?.orderDate || new Date().toISOString(),
        status: (formData.get("status") as OrderStatus) || "pendiente",
        notes: formData.get("notes") as string,
        items: formItems.map(item => ({ 
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          color: item.color,
          filamentId: item.filamentId,
          unitPrice: item.unitPrice,
          totalWeight: item.totalWeight,
          totalPrintTime: item.totalPrintTime,
          completed: item.completed ?? false,
          materials: item.materials 
        })),
        total,
        paid: paidAmount,
        pending: total - paidAmount,
        paymentMethod: formData.get("paymentMethod") as PaymentMethod,
        shippingMethod: formData.get("shippingMethod") as string,
        shippingStatus: formData.get("shippingStatus") as string
      };

      if (editingOrder) {
        await actions.orders.update(editingOrder.id, orderData);
        addActivity("pago_registrado", `Pedido actualizado: ${editingOrder.id} para ${orderData.customerName}`);
      } else {
        await actions.orders.create(orderData);
        addActivity("pedido_creado", `Nuevo pedido creado para ${orderData.customerName}`);
      }
      
      setIsModalOpen(false);
      setEditingOrder(null);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setOrderToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (orderToDelete) {
      await actions.orders.delete(orderToDelete);
      addActivity("sistema_actualizado", `Pedido eliminado: ${orderToDelete}`);
      setIsDeleteConfirmOpen(false);
      setOrderToDelete(null);
    }
  };


  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Gestión de Pedidos</h2>
          <p className="text-on-surface-variant mt-1">Control centralizado de ventas, pagos y entregas.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Nuevo Pedido
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
          <input 
            className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50" 
            placeholder="Buscar por cliente o ID de pedido..." 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {[
            { id: "hoy", label: "Hoy" },
            { id: "ayer", label: "Ayer" },
            { id: "semana", label: "7 Días" },
            { id: "mes", label: "Mes" },
            { id: "todos", label: "Todo" }
          ].map((period) => (
            <button
              key={period.id}
              onClick={() => setTimeFilter(period.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2",
                timeFilter === period.id 
                  ? "bg-inverse-surface text-inverse-on-surface shadow-md" 
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-dim"
              )}
            >
              <Calendar className="w-3 h-3" />
              {period.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {["todos", "pendiente", "en impresión", "listo", "entregado", "finalizado"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                statusFilter === status 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "bg-white text-on-surface-variant hover:bg-surface-dim"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
        {["todos", "Pendiente", "Enviado", "Entregado"].map((status) => (
          <button
            key={`ship-${status}`}
            onClick={() => setShippingFilter(status)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2",
              shippingFilter === status 
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                : "bg-white text-on-surface-variant hover:bg-surface-dim"
            )}
          >
            Envío: {status}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.map((order) => (
          <OrderRow 
            key={order.id} 
            order={order} 
            onEdit={() => openModal(order)}
            onDelete={() => confirmDelete(order.id)}
            onTrack={() => setTrackingOrder(order)}
            onAnalyze={() => {
              setAnalyzingOrder(order);
              setIsProfitModalOpen(true);
            }}
          />
        ))}
        
        {filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-outline-variant/5">
            <ShoppingCart className="w-12 h-12 text-on-surface-variant/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-on-surface">No se encontraron pedidos</h3>
            <p className="text-sm text-on-surface-variant mt-1">Intenta ajustar los filtros o realiza una nueva búsqueda.</p>
          </div>
        )}
      </div>

      {/* Tracking Modal */}
      <Modal
        isOpen={!!trackingOrder}
        onClose={() => setTrackingOrder(null)}
        title={`Seguimiento: ${trackingOrder?.customerName} ${shortId(trackingOrder?.id || "")}`}
      >
        {trackingOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
              <div>
                <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">Cliente</p>
                <p className="font-bold text-on-surface">{trackingOrder.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">Progreso</p>
                <p className="font-bold text-primary">
                  {trackingOrder.items.filter(i => i.completed).length} / {trackingOrder.items.length} piezas
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Checklist de Producción</h4>
              {trackingOrder.items.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => toggleItemCompletion(trackingOrder.id, item.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                    item.completed 
                      ? "bg-green-500/5 border-green-500/20" 
                      : "bg-white border-outline-variant/10 hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                      item.completed ? "bg-green-500 text-white" : "bg-surface-container-low text-transparent border border-outline-variant/20 group-hover:border-primary/40"
                    )}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={cn("font-bold text-sm", item.completed && "line-through opacity-50")}>
                        {item.quantity}x {item.productName}
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-medium">
                        Color: {item.color} | Filamento: {filaments.find(f => f.id === item.filamentId)?.brand}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-outline-variant/10">
              <button 
                onClick={() => markOrderAsReady(trackingOrder.id)}
                disabled={trackingOrder.items.some(i => !i.completed)}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                  trackingOrder.items.every(i => i.completed)
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-surface-container-low text-on-surface-variant cursor-not-allowed"
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                Marcar Pedido como LISTO
              </button>
              {!trackingOrder.items.every(i => i.completed) && (
                <p className="text-[10px] text-center text-on-surface-variant mt-3 italic">
                  Tiquea todas las piezas para poder marcar el pedido como listo.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Order Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingOrder ? `Editar Pedido ${editingOrder.id}` : "Nuevo Pedido"}
      >
        <form onSubmit={handleSaveOrder} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Cliente</label>
              <input name="customerName" defaultValue={editingOrder?.customerName} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="Nombre completo" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Teléfono (Opcional)</label>
              <input name="customerPhone" defaultValue={editingOrder?.customerPhone} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="+56 9..." />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Productos en el Pedido</label>
              <button 
                type="button" 
                onClick={addItem}
                className="text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" />
                Agregar otro producto
              </button>
            </div>
            
            <div className="space-y-3">
              {formItems.map((item, index) => (
                <div key={item.id} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-3 relative">
                  {formItems.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2 p-1 text-on-surface-variant/40 hover:text-error transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant/60">Producto</label>
                      <select 
                        value={item.productId} 
                        onChange={(e) => updateItem(item.id, "productId", e.target.value)}
                        className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs"
                      >
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant/60">Cantidad</label>
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant/60">Subtotal Prod.</label>
                        <div className="w-full bg-surface-container-low border-none rounded-lg px-3 py-2 text-xs font-bold text-primary">{formatCurrency(item.unitPrice * item.quantity)}</div>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2 mt-2">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 flex items-center gap-2">
                        Asignación de Filamentos por Parte
                        {item.materials && item.materials.length > 1 && (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px] font-black">
                            {item.materials.length} partes
                          </span>
                        )}
                      </label>
                      {item.materials?.map((mat: any, matIdx: number) => {
                        const selectedFilament = filaments.find(f => f.id === mat.filamentId);
                        return (
                        <div key={mat.partId} className="flex flex-col md:flex-row gap-2 bg-white/50 p-2 rounded-lg border border-outline-variant/10 items-center">
                          <div className="md:w-1/3 text-xs font-bold text-on-surface px-2 truncate flex items-center gap-2" title={mat.name}>
                            <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black shrink-0">{matIdx + 1}</span>
                            {mat.name} <span className="opacity-50 font-normal">({mat.weight}g/u)</span>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            {selectedFilament && (
                              <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: getFilamentColor(selectedFilament.color) }} title={selectedFilament.color} />
                            )}
                            <select 
                              value={mat.filamentId} 
                              onChange={(e) => updateMaterial(item.id, mat.partId, e.target.value)}
                              className="flex-1 bg-white border-none rounded-lg px-3 py-2 text-[10px] sm:text-xs text-on-surface"
                              required
                            >
                              <option value="">(Seleccione un filamento)</option>
                              {filaments.map(f => (
                                <option key={f.id} value={f.id}>{f.brand} {f.type} ({f.color}) - {f.remainingWeight}g disp.</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant/5">
                    <div className="flex gap-4">
                      <span className="text-[10px] text-on-surface-variant/60">Peso: <strong>{item.totalWeight}g</strong></span>
                      <span className="text-[10px] text-on-surface-variant/60">Tiempo: <strong>{item.totalPrintTime}m</strong></span>
                    </div>
                    <span className="text-xs font-bold text-primary">{formatCurrency(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Estado General</label>
              <select name="status" defaultValue={editingOrder?.status || "pendiente"} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm">
                <option value="pendiente">Pendiente</option>
                <option value="en impresión">En Impresión</option>
                <option value="listo">Listo</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Método Pago</label>
              <select name="paymentMethod" defaultValue={editingOrder?.paymentMethod || "transferencia"} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm">
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="mercado_libre">Mercado Libre</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Método Envío</label>
              <select name="shippingMethod" defaultValue={editingOrder?.shippingMethod || "Retiro Local"} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm">
                <option value="Retiro Local">Retiro Local</option>
                <option value="Mercado Libre">Mercado Libre</option>
                <option value="Envío por Pagar">Envío por Pagar</option>
                <option value="Delivery Privado">Delivery Privado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Estado Envío</label>
              <select name="shippingStatus" defaultValue={editingOrder?.shippingStatus || "Pendiente"} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm">
                <option value="Pendiente">Pendiente</option>
                <option value="Enviado">Enviado</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">Total del Pedido</p>
              <p className="text-xl font-black text-primary font-headline">
                {formatCurrency(formItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0))}
              </p>
            </div>
            <div className="text-right">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant/60 block mb-1">Monto Pagado</label>
              <input 
                name="paidAmount" 
                type="number" 
                defaultValue={editingOrder?.paid || 0} 
                className="w-32 bg-white border-none rounded-lg px-3 py-2 text-sm font-bold text-right" 
              />
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" />
            {editingOrder ? "Actualizar Pedido" : "Guardar Pedido"}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={isDeleteConfirmOpen} 
        onClose={() => setIsDeleteConfirmOpen(false)} 
        title="Confirmar Eliminación"
      >
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-on-surface">¿Estás seguro?</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Esta acción eliminará permanentemente el pedido <strong>{orderToDelete}</strong>. Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="flex-1 py-3 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm hover:bg-surface-dim transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDelete}
              className="flex-1 py-3 bg-error text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-error/20"
            >
              Eliminar Pedido
            </button>
          </div>
        </div>
      </Modal>

      {/* Profit Analysis Modal */}
      <Modal 
        isOpen={isProfitModalOpen} 
        onClose={() => setIsProfitModalOpen(false)} 
        title="Análisis de Rentabilidad"
      >
        {analyzingOrder && (
          <ProfitAnalysis order={analyzingOrder} products={products} filaments={filaments} settings={costSettings} />
        )}
      </Modal>
    </div>
  );
}

function ProfitAnalysis({ order, products, filaments, settings }: { order: Order; products: any[]; filaments: any[]; settings: any }) {
  const analysis = calculateOrderProfit(order, products, filaments, settings);

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Ganancia Neta Real</p>
            <h3 className="text-4xl font-black font-headline text-on-surface">{formatCurrency(analysis.netProfit)}</h3>
          </div>
          <div className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">
            {analysis.margin.toFixed(1)}% margen
          </div>
        </div>
        <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${analysis.margin}%` }}
            className="h-full bg-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Precio Neto</p>
          <p className="text-sm font-bold">{formatCurrency(analysis.netPrice)}</p>
          <p className="text-[8px] text-on-surface-variant flex items-center gap-1 mt-1">
            <Receipt className="w-2 h-2" />
            Venta {formatCurrency(analysis.grossPrice)} - {formatCurrency(analysis.vat)} IVA
          </p>
        </div>
        <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Costo Total</p>
          <p className="text-sm font-bold text-error">{formatCurrency(analysis.totalCost)}</p>
          <p className="text-[8px] text-on-surface-variant flex items-center gap-1 mt-1">
            <Calculator className="w-2 h-2" />
            Material + Energía + Desgaste
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-1">Desglose de Operación</h4>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <Calculator className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold">Costo Material</span>
            </div>
            <span className="text-xs font-mono">{formatCurrency(analysis.materialCost)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <div className="flex flex-col">
                <span className="text-xs font-bold">Energía Eléctrica</span>
                <span className="text-[8px] text-on-surface-variant">{analysis.energyKwh.toFixed(2)} kWh est.</span>
              </div>
            </div>
            <span className="text-xs font-mono">{formatCurrency(analysis.energyCost)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold">Amortización Máquina</span>
            </div>
            <span className="text-xs font-mono">{formatCurrency(analysis.wearCost)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-surface-dim rounded-2xl flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Eficiencia de Producción</p>
          <p className="text-sm font-black">{analysis.efficiency.toFixed(1)} <span className="text-[10px] font-normal">g/h</span></p>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, onEdit, onDelete, onTrack, onAnalyze }: { order: Order; onEdit: () => void; onDelete: () => void; onTrack: () => void; onAnalyze: () => void; key?: any }) {
  const statusColors: any = {
    "pendiente": "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "en impresión": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "listo": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    "entregado": "bg-green-500/10 text-green-600 border-green-500/20",
    "cancelado": "bg-error/10 text-error border-error/20",
    "finalizado": "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  };

  const statusIcons: any = {
    "pendiente": Clock,
    "en impresión": Activity,
    "listo": CheckCircle2,
    "entregado": CheckCircle2,
    "cancelado": AlertCircle,
    "finalizado": CheckCircle2,
  };

  const StatusIcon = statusIcons[order.status];
  const isPaid = order.pending === 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-primary/20 transition-all group"
    >
      <div className="flex items-center gap-4 lg:w-1/4">
        <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary font-black text-xs shrink-0">
          {shortId(order.id)}
        </div>
        <div>
          <h4 className="font-bold text-on-surface font-headline flex items-center gap-2">
            {order.customerName}
            {isPaid && <CheckCircle2 className="w-3 h-3 text-green-500" />}
          </h4>
          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" />
            {new Date(order.orderDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 lg:w-1/3">
        <div className={cn(
          "px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
          statusColors[order.status]
        )}>
          <StatusIcon className="w-3 h-3" />
          {order.status}
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/10 text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
          <Box className="w-3 h-3" />
          {order.items.length} {order.items.length === 1 ? 'Pieza' : 'Piezas'}
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-1",
          order.shippingStatus === "Entregado" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
          order.shippingStatus === "Enviado" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
          "bg-amber-500/10 text-amber-600 border-amber-500/20"
        )}>
          📦 {order.shippingMethod || "Retiro Local"} - {order.shippingStatus || "Pendiente"}
        </div>
        <div className="w-full lg:w-auto mt-2 lg:mt-0 flex flex-wrap gap-1">
          {order.items.map(item => (
            <span key={item.id} className="bg-surface-dim px-2 py-1 rounded text-[9px] font-bold text-on-surface-variant border border-outline-variant/5">
              {item.quantity}x {item.productName}
            </span>
          ))}
        </div>
      </div>

      <div className="lg:w-1/4 flex flex-col items-end">
        <p className="text-lg font-black text-on-surface font-headline">{formatCurrency(order.total)}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-24 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500" 
              style={{ width: `${(order.paid / (order.total || 1)) * 100}%` }} 
            />
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
            {isPaid ? 'Pagado' : `Deuda ${formatCurrency(order.pending)}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={(e) => { e.stopPropagation(); onTrack(); }} 
          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-colors scale-110"
          title="Seguimiento"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onAnalyze(); }} 
          className="p-2 text-on-surface-variant hover:text-emerald-500 hover:bg-emerald-500/5 rounded-lg transition-colors scale-110"
          title="Análisis de Ganancia"
        >
          <TrendingUp className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }} 
          className="p-2 text-on-surface-variant hover:text-indigo-500 hover:bg-indigo-500/5 rounded-lg transition-colors"
          title="Editar"
        >
          <Edit2 className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors"
          title="Eliminar"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

function getFilamentColor(colorName: string) {
  const colors: Record<string, string> = {
    "Negro": "#1a1a1a",
    "Azul Cobalto": "#1e3a8a",
    "Blanco": "#ffffff",
    "Rojo": "#ef4444",
    "Gris": "#6b7280",
    "Naranja": "#f97316",
    "Verde": "#22c55e",
    "Amarillo": "#eab308",
    "Rosa": "#ec4899",
    "Azul": "#3b82f6",
    "Morado": "#8b5cf6",
    "Transparente": "#e5e7eb",
  };
  return colors[colorName] || "#9ca3af";
}
