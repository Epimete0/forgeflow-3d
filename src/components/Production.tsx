import { useMemo } from "react";
import { motion } from "motion/react";
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  Play, 
  Pause, 
  RotateCcw,
  ArrowRight,
  Layers,
  Zap,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { shortId } from "../App";
import { Order, OrderItem, Filament, WasteRecord } from "../types";

interface ProductionProps {
  state: {
    orders: Order[];
    filaments: Filament[];
    wasteRecords: WasteRecord[];
    addActivity: (type: any, desc: string) => void;
    actions: any;
  };
}

export default function Production({ state }: ProductionProps) {
  const { orders, filaments, addActivity, wasteRecords, actions } = state;

  const productionItems = useMemo(() => {
    const items: (OrderItem & { customerName: string; orderId: string; status: string })[] = [];
    orders.forEach(order => {
      if (["pendiente", "en impresión"].includes(order.status)) {
        order.items.forEach(item => {
          items.push({
            ...item,
            customerName: order.customerName,
            orderId: order.id,
            status: order.status
          });
        });
      }
    });
    return items;
  }, [orders]);

  const stats = useMemo(() => {
    const totalMinutes = productionItems.reduce((acc, item) => acc + item.totalPrintTime, 0);
    const printingOrders = orders.filter(o => o.status === "en impresión").length;
    const totalActiveOrders = orders.filter(o => ["pendiente", "en impresión"].includes(o.status)).length;
    return {
      totalHours: Math.floor(totalMinutes / 60),
      totalMinutes: totalMinutes % 60,
      itemCount: productionItems.length,
      printingCount: printingOrders,
      totalActiveOrders
    };
  }, [productionItems, orders]);

  const reportFailure = async (item: any) => {
    const reason = prompt("Motivo de la falla:", "Falla de adherencia / Corte de luz");
    if (!reason) return;

    const baseReason = `Falla en producción: ${item.productName} (${item.orderId}) - ${reason}`;
    const promises = [];

    if (item.materials && item.materials.length > 0) {
      // Multi-material: track all parts
      for (const mat of item.materials) {
        if (!mat.filamentId) continue;
        promises.push(actions.waste.create({
          filamentId: mat.filamentId,
          weight: mat.weight * item.quantity,
          reason: `${baseReason} [Parte: ${mat.name}]`,
          date: new Date().toISOString()
        }));
      }
    } else if (item.filamentId) {
      promises.push(actions.waste.create({
        filamentId: item.filamentId,
        weight: item.totalWeight,
        reason: baseReason,
        date: new Date().toISOString()
      }));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      addActivity("merma_registrada", `Falla reportada en producción: ${item.productName} (${promises.length} registros)`);
      alert("Falla registrada y material descontado del inventario.");
    }
  };

  const updateStatus = async (orderId: string, itemId: string, newStatus: "en impresión" | "listo") => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    await actions.orders.update(orderId, { ...order, status: newStatus });

    if (newStatus === "en impresión") {
      addActivity("impresion_iniciada", `Impresión iniciada: ${orderId}`);
    } else if (newStatus === "listo") {
      addActivity("pedido_finalizado", `Impresión finalizada: ${orderId}`);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Cola de Producción</h2>
        <p className="text-on-surface-variant mt-1">Monitoreo y control de impresión en tiempo real.</p>
      </header>

      {/* Production Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary text-white p-8 rounded-2xl shadow-xl shadow-primary/20 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2">Tiempo Estimado Total</p>
            <h3 className="text-5xl font-black font-headline tracking-tighter">
              {stats.totalHours}h <span className="text-2xl opacity-50">{stats.totalMinutes}m</span>
            </h3>
          </div>
          <Clock className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/5 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Piezas en Cola</p>
              <h3 className="text-3xl font-bold text-on-surface font-headline">{stats.itemCount}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/5 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Pedidos en Impresión</p>
              <h3 className="text-3xl font-bold text-on-surface font-headline">
                {stats.printingCount} / {stats.totalActiveOrders}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Secuencia de Impresión
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          {productionItems.map((item, index) => (
            <ProductionItemRow 
              key={`${item.orderId}-${item.id}`} 
              item={item} 
              index={index} 
              onStart={() => updateStatus(item.orderId, item.id, "en impresión")}
              onFinish={() => updateStatus(item.orderId, item.id, "listo")}
              onReportFailure={() => reportFailure(item)}
            />
          ))}
          
          {productionItems.length === 0 && (
            <div className="bg-surface-container-low rounded-2xl p-12 text-center border-2 border-dashed border-outline-variant/20">
              <CheckCircle2 className="w-12 h-12 text-green-500/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-on-surface">Cola de producción vacía</h3>
              <p className="text-sm text-on-surface-variant mt-1">Todos los pedidos han sido procesados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductionItemRow({ item, index, onStart, onFinish, onReportFailure }: { item: any; index: number; onStart: () => void; onFinish: () => void; onReportFailure: () => void; key?: any }) {
  const isPrinting = item.status === "en impresión";

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "bg-white rounded-2xl p-6 shadow-sm border flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all",
        isPrinting ? "border-primary/30 ring-1 ring-primary/10" : "border-outline-variant/5"
      )}
    >
      <div className="flex items-center gap-6 lg:w-1/3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
          isPrinting ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-surface-container-low text-on-surface-variant"
        )}>
          {index + 1}
        </div>
        <div>
          <h4 className="font-bold text-on-surface font-headline">{item.productName}</h4>
          <p className="text-xs text-on-surface-variant flex items-center gap-2 mt-1">
            <span className="font-bold text-primary font-mono">{shortId(item.orderId)}</span>
            <span className="opacity-30">•</span>
            <span>{item.customerName}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 lg:w-1/3">
        <div className="flex flex-col">
          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Cantidad</p>
          <p className="text-sm font-bold">x{item.quantity}</p>
        </div>
        <div className="flex flex-col">
          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Material(es)</p>
          {item.materials && item.materials.length > 0 ? (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {item.materials.map((m: any, i: number) => (
                <p key={i} className="text-xs font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  {m.name} <span className="font-normal text-on-surface-variant">({m.weight}g)</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {item.color || "—"}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Tiempo Est.</p>
          <p className="text-sm font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary" />
            {Math.floor(item.totalPrintTime / 60)}h {item.totalPrintTime % 60}m
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {isPrinting ? (
          <>
            <button onClick={onFinish} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all active:scale-95">
              <CheckCircle2 className="w-4 h-4" />
              Finalizar
            </button>
            <button 
              onClick={onReportFailure}
              className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
              title="Reportar Falla"
            >
              <AlertCircle className="w-5 h-5" />
            </button>
            <button className="p-2 text-on-surface-variant hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors">
              <Pause className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button onClick={onStart} className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-container transition-all active:scale-95 shadow-lg shadow-primary/20">
            <Play className="w-4 h-4" />
            Iniciar Impresión
          </button>
        )}
        <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
