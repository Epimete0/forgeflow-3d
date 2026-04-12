import { useMemo } from "react";
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
  CreditCard
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
import { Order, CostSettings, Filament, Product } from "../types";
import { calculateOrderProfit } from "../lib/finance-utils";

interface FinanceProps {
  state: {
    orders: Order[];
    filaments: Filament[];
    products: Product[];
    costSettings: CostSettings;
    wasteRecords: any[];
    expenses: any[];
  };
}

export default function Finance({ state }: FinanceProps) {
  const { orders, filaments, products, costSettings, wasteRecords, expenses } = state;

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
    const totalOperationalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = netSales - totalCosts - totalOperationalExpenses;
    const personalSalary = netProfit > 0 ? netProfit * ((costSettings.personalSalaryPercentage || 30) / 100) : 0;
    const businessReinvestment = netProfit > 0 ? netProfit - personalSalary : 0;

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
      margin: netSales > 0 ? (netProfit / netSales) * 100 : 0
    };
  }, [orders, filaments, products, costSettings, wasteRecords, expenses]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <FinanceCard 
          title="Total Cobrado" 
          value={formatCurrency(stats.totalSales)} 
          icon={DollarSign} 
          description="Pagos realmente recibidos"
          color="blue"
        />
        <FinanceCard 
          title="IVA Acumulado" 
          value={formatCurrency(stats.vat)} 
          icon={Receipt} 
          description={`Basado en tasa del ${costSettings.vatRate}%`}
          color="slate"
        />
        <FinanceCard 
          title="Costo de Material" 
          value={formatCurrency(stats.materialCosts)} 
          icon={Calculator} 
          description="Filamento consumido"
          color="orange"
        />
        <FinanceCard 
          title="Energía y Desgaste" 
          value={formatCurrency(stats.energyCosts + stats.wearCosts)} 
          icon={Zap} 
          description="Luz + Máquina"
          color="amber"
        />
        <FinanceCard 
          title="Gastos Operativos" 
          value={formatCurrency(stats.totalOperationalExpenses)} 
          icon={CreditCard} 
          description="Insumos y Repuestos"
          color="orange"
        />
        <FinanceCard 
          title="Por Cobrar" 
          value={formatCurrency(stats.accountsReceivable)} 
          icon={Wallet} 
          description="Saldos pendientes"
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-inverse-surface text-inverse-on-surface rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-70">Ganancia Neta Real</h3>
                  <p className="text-4xl font-black font-headline tracking-tighter">{formatCurrency(stats.netProfit)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8 pt-8 border-t border-white/10">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary-fixed-dim">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Sueldo ({costSettings.personalSalaryPercentage}%)</span>
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(stats.personalSalary)}</p>
                  <p className="text-xs opacity-60">Dinero disponible para uso personal.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-secondary-fixed-dim">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Reinversión</span>
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(stats.businessReinvestment)}</p>
                  <p className="text-xs opacity-60">Fondo para crecer el negocio.</p>
                </div>
              </div>
            </div>
          </div>

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
    </div>
  );
}

function FinanceCard({ title, value, icon: Icon, description, color }: any) {
  const colors: any = {
    blue: "bg-blue-500/10 text-blue-600",
    slate: "bg-slate-500/10 text-slate-600",
    orange: "bg-orange-500/10 text-orange-600",
    amber: "bg-amber-500/10 text-amber-600",
    indigo: "bg-indigo-500/10 text-indigo-600",
  };

  return (
    <div className="bg-white dark:bg-surface-container-low p-6 rounded-3xl shadow-sm border border-outline-variant/5 flex flex-col justify-between group hover:border-primary/20 transition-all">
      <div className="flex justify-between items-start">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-on-surface-variant text-[9px] font-bold uppercase tracking-widest">{title}</h3>
        <p className="text-xl font-black font-headline text-on-surface mt-1">{value}</p>
        {description && <p className="text-[9px] text-on-surface-variant/60 mt-0.5 font-medium">{description}</p>}
      </div>
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
