import { useMemo } from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Layers,
  ChevronRight,
  Wrench,
  Activity as ActivityIcon,
  X
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { formatCurrency, cn } from "../lib/utils";
import { Order, ActivityEvent } from "../types";

interface DashboardProps {
  state: {
    products: any[];
    filaments: any[];
    orders: Order[];
    activity: ActivityEvent[];
    wasteRecords: any[];
    isLoading?: boolean;
  };
}

export default function Dashboard({ state }: DashboardProps) {
  const { orders, activity, wasteRecords, isLoading } = state;

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const pending = orders.filter(o => o.status === "pendiente").length;
    const printing = orders.filter(o => o.status === "en impresión").length;
    const ready = orders.filter(o => o.status === "listo").length;
    
    // Only count orders delivered or finalized TODAY
    const deliveredToday = orders.filter(o => 
      ["entregado", "finalizado"].includes(o.status) && 
      (o.orderDate as string).split('T')[0] === today
    ).length;

    const totalWaste = wasteRecords.reduce((acc, r) => acc + r.weight, 0);

    const totalPrintTime = orders
      .filter(o => ["pendiente", "en impresión"].includes(o.status))
      .reduce((acc, o) => acc + o.items.reduce((sum, i) => sum + i.totalPrintTime, 0), 0);

    // Real collected revenue (only finalizado orders)
    const totalCollected = orders
      .filter(o => o.status === "finalizado")
      .reduce((acc, o) => acc + o.paid, 0);

    return {
      pending,
      printing,
      ready,
      deliveredToday,
      totalWaste,
      totalPrintTime: Math.round(totalPrintTime / 60),
      totalCollected
    };
  }, [orders, wasteRecords]);

  const chartData = useMemo(() => {
    const days = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return {
        date: d.toISOString().split('T')[0],
        name: days[d.getDay()],
        sales: 0
      };
    });

    orders.forEach(order => {
      const orderDate = (order.orderDate as string).split('T')[0];
      const day = last7Days.find(d => d.date === orderDate);
      if (day) {
        // Use paid amount (real cash collected), not brute total
        day.sales += order.paid;
      }
    });

    return last7Days;
  }, [orders]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-on-surface-variant font-bold animate-pulse uppercase tracking-widest text-xs">Cargando Datos ForgeFlow...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Resumen de Operaciones</h2>
        <p className="text-on-surface-variant mt-1">Monitoreo en tiempo real de tu ecosistema ForgeFlow 3D.</p>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Cobrado Real" 
          value={formatCurrency(stats.totalCollected)} 
          icon={DollarSign} 
          color="primary"
          description="Pagos finalizados recibidos"
        />
        <StatCard 
          title="Material Perdido" 
          value={`${stats.totalWaste}g`} 
          icon={X} 
          color="error"
          description="Mermas acumuladas"
        />
        <StatCard 
          title="Pedidos Pendientes" 
          value={stats.pending} 
          icon={AlertCircle} 
          color="warning"
          description="Requieren atención"
        />
        <StatCard 
          title="Listos" 
          value={stats.ready} 
          icon={CheckCircle2} 
          color="indigo"
          description="Pendiente de envío"
        />
      </div>

      {/* Workload Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <ActivityIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Estado de Filamentos</p>
              <h3 className="text-xl font-bold text-on-surface font-headline">
                {state.filaments.filter(f => f.remainingWeight < 200).length} Alertas de Stock
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Inventario</p>
            <p className="text-xs font-bold text-primary">
              {Math.round(state.filaments.reduce((acc, f) => acc + f.remainingWeight, 0) / 1000)} kg
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Carga de Trabajo</p>
              <h3 className="text-xl font-bold text-on-surface font-headline">
                {stats.totalPrintTime}h Estimadas
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Listos para Entrega</p>
            <p className="text-xs font-bold text-primary">{stats.ready} pedido{stats.ready !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg font-headline">Ventas de la Semana</h3>
            <select className="bg-surface-container-low border-none rounded-lg text-xs font-bold px-3 py-1">
              <option>Últimos 7 días</option>
              <option>Este mes</option>
            </select>
          </div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0058be" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0058be" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#0058be" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/5">
          <h3 className="font-bold text-lg font-headline mb-6">Actividad Reciente</h3>
          <div className="space-y-6">
            {activity.slice(0, 5).map((event) => (
              <div key={event.id} className="flex gap-4">
                <div className={cn(
                  "w-2 h-2 mt-2 rounded-full shrink-0",
                  event.type === "pedido_creado" ? "bg-blue-500" :
                  event.type === "impresion_iniciada" ? "bg-amber-500" :
                  event.type === "pedido_finalizado" ? "bg-green-500" : "bg-primary"
                )} />
                <div>
                  <p className="text-sm font-bold text-on-surface">{event.description}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 text-primary text-xs font-bold uppercase tracking-widest hover:underline flex items-center justify-center gap-1">
            Ver todo el historial
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Workload Summary */}
      <div className="bg-inverse-surface text-inverse-on-surface rounded-2xl p-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="text-primary-fixed-dim text-xs font-bold uppercase tracking-widest mb-2">Carga de Trabajo</h3>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-extrabold font-headline tracking-tighter">{stats.totalPrintTime}h</span>
              <p className="text-sm opacity-70 max-w-[200px]">Tiempo total estimado para completar todos los pedidos pendientes.</p>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md">
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 opacity-70">
              <span>Progreso de Pedidos</span>
              <span>{Math.round((orders.filter(o => ["entregado", "finalizado"].includes(o.status)).length / (orders.filter(o => o.status !== "cancelado").length || 1)) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((orders.filter(o => ["entregado", "finalizado"].includes(o.status)).length / (orders.filter(o => o.status !== "cancelado").length || 1)) * 100)}%` }}
                className="h-full bg-primary"
              />
            </div>
          </div>
          <a 
            href="/orders"
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-container transition-all active:scale-95"
          >
            Ver Pedidos
          </a>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-5">
          <TrendingUp className="w-64 h-64" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color, description }: any) {
  const colors: any = {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-600",
    warning: "bg-amber-500/10 text-amber-600",
    indigo: "bg-indigo-500/10 text-indigo-600",
    error: "bg-error/10 text-error",
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/5 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
            trend.includes("+") || trend.includes("%") ? "bg-green-500/10 text-green-600" : "bg-slate-100 text-slate-500"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">{title}</h3>
        <p className="text-2xl font-extrabold font-headline text-on-surface mt-1">{value}</p>
        {description && <p className="text-xs text-on-surface-variant/60 mt-1">{description}</p>}
      </div>
    </motion.div>
  );
}
