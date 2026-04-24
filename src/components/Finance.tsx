import { useMemo, useState, FormEvent } from "react";
import { motion } from "motion/react";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Receipt,
  Zap,
  User,
  Wallet,
  Briefcase,
  CreditCard,
  Landmark,
  ArrowDownToLine,
  Trash2,
  Plus,
  History,
  CheckCircle2,
  AlertTriangle,
  Save
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line
} from "recharts";
import { formatCurrency, cn } from "../lib/utils";
import { Order, CostSettings, Filament, Product, CashMovement } from "../types";
import { calculateOrderProfit } from "../lib/finance-utils";
import Modal from "./Modal";

interface FinanceProps {
  state: {
    orders: Order[];
    filaments: Filament[];
    products: Product[];
    costSettings: CostSettings;
    wasteRecords: any[];
    expenses: any[];
    cashMovements: CashMovement[];
    addActivity: (type: any, desc: string) => void;
    actions: any;
  };
}

export default function Finance({ state }: FinanceProps) {
  const { orders, filaments, products, costSettings, wasteRecords, expenses, cashMovements, addActivity, actions } = state;
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawType, setWithdrawType] = useState<"retiro_sueldo" | "pago_iva">("retiro_sueldo");
  const [isSaving, setIsSaving] = useState(false);

  const stats = useMemo(() => {
    const deliveredOrders = orders.filter(o => o.status === "finalizado");
    const totalSales = deliveredOrders.reduce((acc, o) => acc + o.paid, 0);
    const vatRate = (costSettings.vatRate || 19) / 100;
    const netSales = totalSales / (1 + vatRate);
    const vat = totalSales - netSales;
    
    let materialCosts = 0;
    let energyCosts = 0;
    let wearCosts = 0;

    const categoryCostsMap = new Map<string, number>();
    const filamentCostsMap = new Map<string, number>();
    const monthDataMap = new Map<string, { month: string, sales: number, profit: number }>();
    const productProfitMap = new Map<string, { name: string, profit: number, sales: number }>();

    // Pending accounts (Accounts Receivable)
    const pendingOrders = orders.filter(o => o.status !== "finalizado" && o.status !== "cancelado");
    const accountsReceivable = pendingOrders.reduce((acc, o) => acc + o.pending, 0);

    const allRelevantOrders = orders.filter(o => o.status === "finalizado");
    
    allRelevantOrders.forEach(order => {
      const analysis = calculateOrderProfit(order, products, filaments, costSettings);
      
      // Monthly Trend logic
      const date = new Date(order.orderDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existingMonth = monthDataMap.get(monthKey) || { month: monthKey, sales: 0, profit: 0 };
      existingMonth.sales += analysis.grossPrice;
      existingMonth.profit += analysis.netProfit;
      monthDataMap.set(monthKey, existingMonth);

      order.items.forEach(item => {
        // Product profitability ranking
        const prodId = item.productId;
        const existingProd = productProfitMap.get(prodId) || { name: item.productName, profit: 0, sales: 0 };
        const itemWeight = (item.unitPrice * item.quantity) / (order.total || 1);
        existingProd.profit += analysis.netProfit * itemWeight;
        existingProd.sales += item.unitPrice * item.quantity;
        productProfitMap.set(prodId, existingProd);

        // Filament costs mapping
        const f = filaments.find((f: any) => f.id === item.filamentId);
        const pricePerGram = f ? f.price / 1000 : 15;
        let itemMatCost = 0;
        if (item.materials && item.materials.length > 0) {
          item.materials.forEach((mat: any) => {
            const partF = filaments.find((f: any) => f.id === mat.filamentId);
            const partPricePerGram = partF ? partF.price / 1000 : 15;
            const matCost = mat.weight * item.quantity * partPricePerGram;
            itemMatCost += matCost;
            const fName = partF ? `${partF.brand} ${partF.color}` : "Desconocido";
            filamentCostsMap.set(fName, (filamentCostsMap.get(fName) || 0) + matCost);
          });
        } else {
          itemMatCost = item.totalWeight * pricePerGram;
          const fName = f ? `${f.brand} ${f.color}` : "Desconocido";
          filamentCostsMap.set(fName, (filamentCostsMap.get(fName) || 0) + itemMatCost);
        }
        materialCosts += itemMatCost;

        const eCost = (costSettings.printerPowerWatts / 1000) * (item.totalPrintTime / 60) * costSettings.electricityPriceKwh;
        const wCost = (item.totalPrintTime / 60) * costSettings.machineWearPerHour;
        energyCosts += eCost;
        wearCosts += wCost;

        const cat = products.find(p => p.id === item.productId)?.category || "Sin Categoría";
        categoryCostsMap.set(cat, (categoryCostsMap.get(cat) || 0) + (eCost + wCost + itemMatCost));
      });
    });

    let wasteCosts = 0;
    wasteRecords.forEach(record => {
      const filament = filaments.find(f => f.id === record.filamentId);
      const pricePerGram = filament ? filament.price / 1000 : 15;
      const cost = record.weight * pricePerGram;
      wasteCosts += cost;
      const filamentName = filament ? `${filament.brand} ${filament.color}` : "Desconocido";
      filamentCostsMap.set(filamentName, (filamentCostsMap.get(filamentName) || 0) + cost);
    });

    const totalCosts = materialCosts + energyCosts + wearCosts + wasteCosts;
    const totalOperationalExpenses = expenses.reduce((acc: number, e: any) => acc + e.amount, 0);
    const netProfit = netSales - totalCosts - totalOperationalExpenses;
    const personalSalary = netProfit > 0 ? netProfit * ((costSettings.personalSalaryPercentage || 30) / 100) : 0;
    const businessReinvestment = netProfit > 0 ? netProfit - personalSalary : 0;

    // === TREASURY: Real cash movements ===
    const totalSalaryWithdrawn = cashMovements
      .filter(m => m.type === "retiro_sueldo")
      .reduce((acc, m) => acc + m.amount, 0);
    const totalIvaPaid = cashMovements
      .filter(m => m.type === "pago_iva")
      .reduce((acc, m) => acc + m.amount, 0);
    const totalOtherWithdrawn = cashMovements
      .filter(m => m.type === "otro_retiro")
      .reduce((acc, m) => acc + m.amount, 0);
    const totalOtherIncome = cashMovements
      .filter(m => m.type === "otro_ingreso")
      .reduce((acc, m) => acc + m.amount, 0);

    const salaryAvailable = Math.max(0, personalSalary - totalSalaryWithdrawn);
    const ivaPending = Math.max(0, vat - totalIvaPaid);
    const cashBalance = totalSales + totalOtherIncome - totalSalaryWithdrawn - totalIvaPaid - totalOtherWithdrawn;

    return {
      totalSales,
      netSales,
      vat,
      materialCosts,
      energyCosts,
      wearCosts,
      wasteCosts,
      totalCosts,
      netProfit,
      personalSalary,
      businessReinvestment,
      accountsReceivable,
      categoryData: Array.from(categoryCostsMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      filamentData: Array.from(filamentCostsMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      trendData: Array.from(monthDataMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      profitabilityData: Array.from(productProfitMap.values()).sort((a, b) => b.profit - a.profit).slice(0, 5),
      totalOperationalExpenses,
      margin: netSales > 0 ? (netProfit / netSales) * 100 : 0,
      // Treasury
      totalSalaryWithdrawn,
      totalIvaPaid,
      salaryAvailable,
      ivaPending,
      cashBalance,
      totalOtherWithdrawn,
      totalOtherIncome,
    };
  }, [orders, filaments, products, costSettings, wasteRecords, expenses, cashMovements]);

  const handleWithdraw = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const amount = Number(formData.get("amount"));
      const description = formData.get("description") as string || undefined;
      
      await actions.cashMovements.create({
        type: withdrawType,
        amount,
        description,
        date: new Date().toISOString(),
      });

      const label = withdrawType === "retiro_sueldo" ? "Retiro de sueldo" : "Pago de IVA";
      addActivity("pago_registrado", `${label}: ${formatCurrency(amount)}`);
      setIsWithdrawModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMovement = async (id: string) => {
    if (!confirm("¿Eliminar este movimiento? El monto se revertirá.")) return;
    await actions.cashMovements.delete(id);
    addActivity("sistema_actualizado", "Movimiento de caja eliminado");
  };

  const pieData = [
    { name: "Sueldo Personal", value: Math.max(0, stats.personalSalary), color: "#60a5fa" },
    { name: "Reinversión Negocio", value: Math.max(0, stats.businessReinvestment), color: "#1e3a8a" },
    { name: "Costos Operativos", value: stats.totalCosts, color: "#fb923c" },
    { name: "IVA", value: stats.vat, color: "#94a3b8" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Panel Financiero</h2>
          <p className="text-on-surface-variant mt-1">Control total de ingresos, costos y tu sueldo personal.</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Margen de Operación</p>
          <p className="text-xl font-black text-primary">{stats.margin.toFixed(1)}%</p>
        </div>
      </header>

      {/* ====================== TREASURY SECTION ====================== */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Caja del Negocio</h3>
              <p className="text-3xl font-black font-headline tracking-tighter">{formatCurrency(stats.cashBalance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* IVA Card */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">IVA ({costSettings.vatRate}%)</span>
                </div>
                {stats.ivaPending > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold">PENDIENTE</span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Acumulado</span>
                  <span className="font-bold">{formatCurrency(stats.vat)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Pagado</span>
                  <span className="font-bold text-emerald-400">-{formatCurrency(stats.totalIvaPaid)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                  <span className="font-bold text-white/60">Por Pagar</span>
                  <span className="font-black text-amber-400">{formatCurrency(stats.ivaPending)}</span>
                </div>
              </div>
              <button
                onClick={() => { setWithdrawType("pago_iva"); setIsWithdrawModalOpen(true); }}
                className="w-full mt-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <ArrowDownToLine className="w-3 h-3" />
                Registrar Pago
              </button>
            </div>

            {/* SALARY Card */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Sueldo ({costSettings.personalSalaryPercentage}%)</span>
                </div>
                {stats.salaryAvailable > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold">DISPONIBLE</span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Ganado</span>
                  <span className="font-bold">{formatCurrency(stats.personalSalary)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Retirado</span>
                  <span className="font-bold text-emerald-400">-{formatCurrency(stats.totalSalaryWithdrawn)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                  <span className="font-bold text-white/60">Disponible</span>
                  <span className="font-black text-blue-400">{formatCurrency(stats.salaryAvailable)}</span>
                </div>
              </div>
              <button
                onClick={() => { setWithdrawType("retiro_sueldo"); setIsWithdrawModalOpen(true); }}
                className="w-full mt-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-blue-300"
              >
                <ArrowDownToLine className="w-3 h-3" />
                Retirar Sueldo
              </button>
            </div>

            {/* REINVESTMENT Card */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Reinversión</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Fondo asignado</span>
                  <span className="font-bold">{formatCurrency(stats.businessReinvestment)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Gastos operativos</span>
                  <span className="font-bold text-orange-400">-{formatCurrency(stats.totalOperationalExpenses)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                  <span className="font-bold text-white/60">Libre</span>
                  <span className="font-black text-emerald-400">{formatCurrency(Math.max(0, stats.businessReinvestment - stats.totalOperationalExpenses))}</span>
                </div>
              </div>
              <div className="mt-4 py-2.5 bg-emerald-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-emerald-300/60 text-center">
                Fondo del Negocio
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl px-4 py-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Total Cobrado</p>
              <p className="text-sm font-black">{formatCurrency(stats.totalSales)}</p>
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Ganancia Neta</p>
              <p className="text-sm font-black text-emerald-400">{formatCurrency(stats.netProfit)}</p>
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Costos Totales</p>
              <p className="text-sm font-black text-orange-400">{formatCurrency(stats.totalCosts)}</p>
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Por Cobrar</p>
              <p className="text-sm font-black text-amber-400">{formatCurrency(stats.accountsReceivable)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ====================== MOVEMENT HISTORY ====================== */}
      {cashMovements.length > 0 && (
        <div className="bg-white dark:bg-surface-container-low rounded-3xl shadow-sm border border-outline-variant/5 overflow-hidden">
          <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/10 flex items-center justify-between">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Historial de Movimientos
            </h3>
            <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full">{cashMovements.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Fecha</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Tipo</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Descripción</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Monto</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {cashMovements.slice(0, 10).map(mov => (
                  <tr key={mov.id} className="hover:bg-surface-dim/30 transition-colors">
                    <td className="px-6 py-3 text-xs text-on-surface">{new Date(mov.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter",
                        mov.type === "retiro_sueldo" ? "bg-blue-500/10 text-blue-600" :
                        mov.type === "pago_iva" ? "bg-slate-500/10 text-slate-600" :
                        mov.type === "otro_retiro" ? "bg-orange-500/10 text-orange-600" :
                        "bg-emerald-500/10 text-emerald-600"
                      )}>
                        {mov.type === "retiro_sueldo" ? "Sueldo" :
                         mov.type === "pago_iva" ? "IVA" :
                         mov.type === "otro_retiro" ? "Retiro" : "Ingreso"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-on-surface-variant">{mov.description || "—"}</td>
                    <td className="px-6 py-3 text-xs font-bold text-right">
                      <span className={mov.type === "otro_ingreso" ? "text-emerald-600" : "text-on-surface"}>
                        {mov.type === "otro_ingreso" ? "+" : "-"}{formatCurrency(mov.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button 
                        onClick={() => handleDeleteMovement(mov.id)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================== ANALYTICS SECTION ====================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-surface-container-low rounded-3xl p-8 shadow-sm border border-outline-variant/5">
            <h3 className="font-bold text-lg font-headline mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Desglose de Costos Operativos
            </h3>
            <div className="space-y-4">
              <CostRow label="Filamento (Material)" value={stats.materialCosts} total={stats.totalCosts} color="bg-orange-500" />
              <CostRow label="Pérdidas por Merma" value={stats.wasteCosts} total={stats.totalCosts} color="bg-red-500" />
              <CostRow label="Energía Eléctrica" value={stats.energyCosts} total={stats.totalCosts} color="bg-amber-500" />
              <CostRow label="Amortización Máquina" value={stats.wearCosts} total={stats.totalCosts} color="bg-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-container-low rounded-3xl p-8 shadow-sm border border-outline-variant/5 flex flex-col">
          <h3 className="font-bold text-lg font-headline mb-8 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" />
            Distribución de Caja
          </h3>
          <div className="flex-1 min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${formatCurrency(value)}`, name]}
                  contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: 'var(--color-surface)' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">{item.name}</span>
                </div>
                <p className="text-xs font-black">{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white dark:bg-surface-container-low rounded-3xl p-8 shadow-sm border border-outline-variant/5">
          <h3 className="font-bold text-lg font-headline mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Evolución Mensual
          </h3>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Line type="monotone" dataKey="sales" name="Ventas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                <Line type="monotone" dataKey="profit" name="Ganancia" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-container-low rounded-3xl p-8 shadow-sm border border-outline-variant/5">
          <h3 className="font-bold text-lg font-headline mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Top 5 Productos Rentables
          </h3>
          <div className="space-y-4">
            {stats.profitabilityData.length === 0 ? (
              <p className="text-xs text-on-surface-variant/50 text-center py-12">Sin datos de ganancia aún</p>
            ) : (
              stats.profitabilityData.map((prod, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">#{i+1}</div>
                    <div>
                      <p className="text-sm font-bold text-on-surface truncate max-w-[150px]">{prod.name}</p>
                      <p className="text-[10px] text-on-surface-variant">Ventas: {formatCurrency(prod.sales)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">+{formatCurrency(prod.profit)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white dark:bg-surface-container-low rounded-3xl p-8 shadow-sm border border-outline-variant/5">
          <h3 className="font-bold text-lg font-headline mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Costos por Categoría
          </h3>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-container-low rounded-3xl p-8 shadow-sm border border-outline-variant/5">
          <h3 className="font-bold text-lg font-headline mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Inversión en Material
          </h3>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.filamentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ====== WITHDRAW MODAL ====== */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title={withdrawType === "retiro_sueldo" ? "Retirar Sueldo" : "Registrar Pago de IVA"}
      >
        <form onSubmit={handleWithdraw} className="space-y-6">
          <div className={cn(
            "p-4 rounded-2xl border flex items-start gap-4",
            withdrawType === "retiro_sueldo" ? "bg-blue-500/5 border-blue-500/10" : "bg-slate-500/5 border-slate-500/10"
          )}>
            {withdrawType === "retiro_sueldo" ? (
              <User className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            ) : (
              <Receipt className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-bold text-on-surface">
                {withdrawType === "retiro_sueldo" 
                  ? `Sueldo disponible: ${formatCurrency(stats.salaryAvailable)}`
                  : `IVA pendiente: ${formatCurrency(stats.ivaPending)}`
                }
              </p>
              <p className="text-[10px] text-on-surface-variant mt-1">
                {withdrawType === "retiro_sueldo"
                  ? "Registra el monto que estás retirando como tu sueldo personal."
                  : "Registra el monto del IVA que estás pagando al SII."
                }
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm">$</span>
              <input 
                name="amount" 
                type="number" 
                required 
                min="1"
                max={withdrawType === "retiro_sueldo" ? Math.floor(stats.salaryAvailable) : Math.floor(stats.ivaPending)}
                placeholder={withdrawType === "retiro_sueldo" 
                  ? `Máx: ${formatCurrency(stats.salaryAvailable)}`
                  : `Máx: ${formatCurrency(stats.ivaPending)}`
                }
                className="w-full bg-surface-container-low border-none rounded-xl pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nota (opcional)</label>
            <input 
              name="description" 
              type="text" 
              placeholder={withdrawType === "retiro_sueldo" ? "Ej: Sueldo de Abril" : "Ej: Pago IVA Q1 2026"}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" 
            />
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white",
              withdrawType === "retiro_sueldo" ? "bg-blue-600 shadow-blue-600/20" : "bg-slate-700 shadow-slate-700/20"
            )}
          >
            <Save className="w-4 h-4" />
            {withdrawType === "retiro_sueldo" ? "Confirmar Retiro de Sueldo" : "Confirmar Pago de IVA"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

function CostRow({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-on-surface-variant">{label}</span>
        <span className="text-on-surface">{formatCurrency(value)} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}
