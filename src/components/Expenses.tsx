import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Trash2, 
  Calendar, 
  Tag, 
  CreditCard,
  Package,
  Wrench,
  Truck,
  MoreHorizontal
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { Expense } from "../types";
import Modal from "./Modal";

interface ExpensesProps {
  state: {
    expenses: Expense[];
    addActivity: (type: any, desc: string) => void;
    actions: any;
    isLoading?: boolean;
  };
}

const CATEGORIES = ["Insumos", "Repuestos", "Envío", "Herramientas", "Varios"] as const;

export default function Expenses({ state }: ExpensesProps) {
  const { expenses, addActivity, actions, isLoading } = state;
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = expenses.reduce((acc, e) => acc + e.amount, 0);
    const thisMonth = expenses
      .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
      .reduce((acc, e) => acc + e.amount, 0);
    
    const byCategory = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
      return acc;
    }, {} as Record<string, number>);

    return { total, thisMonth, byCategory };
  }, [expenses]);

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      const expenseData = {
        category: formData.get("category") as any,
        description: formData.get("description") as string,
        amount: Number(formData.get("amount")),
        date: formData.get("date") as string || new Date().toISOString().split('T')[0],
        paymentMethod: formData.get("paymentMethod") as string,
      };

      await actions.expenses.create(expenseData);
      addActivity("gasto_registrado", `Gasto registrado: ${expenseData.description} (${formatCurrency(expenseData.amount)})`);
      setIsModalOpen(false);
    } finally {
      setIsSaving(true); // Will be reset by refreshData trigger or manual reset
      setTimeout(() => setIsSaving(false), 500); 
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    if (confirm(`¿Eliminar el gasto "${desc}"?`)) {
      await actions.expenses.delete(id);
      addActivity("sistema_actualizado", `Gasto eliminado: ${desc}`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Compras y Gastos</h2>
          <p className="text-on-surface-variant mt-1">Control de insumos, repuestos y costos operativos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Registrar Gasto
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-outline-variant/5">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Gasto Total Acumulado</p>
          <h3 className="text-3xl font-black text-on-surface font-headline">{formatCurrency(stats.total)}</h3>
          <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="px-2 py-0.5 bg-surface-container-low rounded-full">Todo el historial</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-outline-variant/5 border-l-4 border-amber-500">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Gasto Este Mes</p>
          <h3 className="text-3xl font-black text-on-surface font-headline">{formatCurrency(stats.thisMonth)}</h3>
          <p className="mt-4 text-xs text-on-surface-variant">Inversión operativa del periodo actual</p>
        </div>

        <div className="bg-inverse-surface p-6 rounded-3xl shadow-xl">
          <p className="text-[10px] font-bold text-primary-fixed uppercase tracking-widest mb-3">Distribución por Categoría</p>
          <div className="space-y-2">
            {CATEGORIES.slice(0, 3).map(cat => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-xs text-inverse-on-surface/60">{cat}</span>
                <span className="text-xs font-bold text-inverse-on-surface">{formatCurrency(stats.byCategory[cat] || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
        <input 
          className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50" 
          placeholder="Buscar gastos o categorías..." 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Descripción</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-on-surface-variant tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-on-surface-variant tracking-widest text-right">Monto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-on-surface-variant tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-surface-dim transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{new Date(expense.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-on-surface">{expense.description}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold">{expense.paymentMethod}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                      expense.category === "Insumos" ? "bg-blue-100 text-blue-700" :
                      expense.category === "Repuestos" ? "bg-orange-100 text-orange-700" :
                      expense.category === "Envío" ? "bg-purple-100 text-purple-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-on-surface">{formatCurrency(expense.amount)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(expense.id, expense.description)}
                      className="p-2 text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <ShoppingCart className="w-12 h-12 text-on-surface-variant/20 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-on-surface">No se encontraron gastos</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Los gastos registrados aparecerán en esta tabla.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Gasto o Compra">
        <form onSubmit={handleSaveExpense} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Categoría</label>
              <select name="category" required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20">
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Fecha</label>
              <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Descripción de la Compra</label>
            <input name="description" required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" placeholder="Ej: Boquilla de acero endurecido 0.4mm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Monto (CLP)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm">$</span>
                <input name="amount" type="number" required className="w-full bg-surface-container-low border-none rounded-xl pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" placeholder="0" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Método de Pago</label>
              <input name="paymentMethod" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" placeholder="Efectivo, Transferencia..." defaultValue="Transferencia" />
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-4 text-xs text-primary">
            <Tag className="w-5 h-5" />
            <p>Este gasto se verá reflejado en el balance neto del panel financiero.</p>
          </div>

          <button type="submit" disabled={isSaving} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
            <Plus className="w-4 h-4" />
            {isSaving ? "Guardando..." : "Registrar Gasto Comercial"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
