import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  Edit2, 
  ShoppingCart,
  Calendar,
  Droplet,
  Save,
  Trash2
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { Filament } from "../types";
import Modal from "./Modal";

interface FilamentsProps {
  state: {
    filaments: Filament[];
    addActivity: (type: any, desc: string) => void;
    actions: any;
  };
}

export default function Filaments({ state }: FilamentsProps) {
  const { filaments, addActivity, actions } = state;
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [filamentToDelete, setFilamentToDelete] = useState<string | null>(null);

  const filteredFilaments = filaments.filter(f => 
    f.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalConsumption: (filaments.reduce((acc, f) => acc + (f.initialWeight - f.remainingWeight), 0) / 1000).toFixed(1),
    criticalStock: filaments.filter(f => f.remainingWeight < 200).length,
    inventoryValue: filaments.reduce((acc, f) => acc + (f.remainingWeight / f.initialWeight) * f.price, 0)
  };

  const handleSaveFilament = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const filamentData: any = {
        brand: formData.get("brand") as string,
        type: formData.get("type") as string,
        color: formData.get("color") as string,
        initialWeight: Number(formData.get("initialWeight")),
        remainingWeight: Number(formData.get("remainingWeight")),
        price: Number(formData.get("price")),
        provider: formData.get("provider") as string,
        purchaseDate: formData.get("purchaseDate") as string || new Date().toISOString().split('T')[0],
      };

      if (editingFilament) {
        await actions.filaments.update(editingFilament.id, filamentData);
        addActivity("sistema_actualizado", `Filamento actualizado: ${filamentData.brand} ${filamentData.color}`);
      } else {
        await actions.filaments.create(filamentData);
        addActivity("filamento_registrado", `Nuevo filamento registrado: ${filamentData.brand} ${filamentData.color}`);
      }
      
      setIsModalOpen(false);
      setEditingFilament(null);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setFilamentToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (filamentToDelete) {
      const filament = filaments.find(f => f.id === filamentToDelete);
      await actions.filaments.delete(filamentToDelete);
      addActivity("sistema_actualizado", `Filamento eliminado: ${filament?.brand} ${filament?.color}`);
      setIsDeleteConfirmOpen(false);
      setFilamentToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Inventario de Filamento</h2>
          <p className="text-on-surface-variant mt-1">Gestión precisa de materiales y trazabilidad de consumo.</p>
        </div>
        <button 
          onClick={() => { setEditingFilament(null); setIsModalOpen(true); }}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Agregar Filamento
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Consumo Total (Mensual)</p>
            <h3 className="text-4xl font-black text-on-surface font-headline">{stats.totalConsumption} <span className="text-lg font-medium text-on-surface-variant/40">kg</span></h3>
          </div>
          <div className="mt-4 h-12 w-full flex items-end gap-1">
            {[0.5, 0.7, 0.3, 0.8, 0.6, 1, 0.9].map((h, i) => (
              <div key={i} className="flex-1 bg-primary/10 rounded-t-sm" style={{ height: `${h * 100}%` }}>
                <div className="w-full h-full bg-primary/40 rounded-t-sm transition-all hover:bg-primary" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/5 flex flex-col justify-center">
          <AlertTriangle className="text-tertiary mb-3 w-8 h-8" />
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Stock Crítico</p>
          <h3 className="text-2xl font-bold text-on-surface font-headline">{stats.criticalStock} Bobinas</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/5 flex flex-col justify-center border-l-4 border-primary">
          <ShoppingCart className="text-primary mb-3 w-8 h-8" />
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Valor de Inventario</p>
          <h3 className="text-2xl font-bold text-on-surface font-headline">{formatCurrency(stats.inventoryValue)}</h3>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
        <input 
          className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50" 
          placeholder="Buscar filamentos, marcas o materiales..." 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFilaments.map((filament) => (
          <FilamentCard 
            key={filament.id} 
            filament={filament} 
            onEdit={() => { setEditingFilament(filament); setIsModalOpen(true); }}
            onDelete={() => confirmDelete(filament.id)}
          />
        ))}
        
        <div 
          onClick={() => { setEditingFilament(null); setIsModalOpen(true); }}
          className="border-2 border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center p-8 text-on-surface-variant/40 hover:border-primary/40 hover:text-primary transition-all cursor-pointer group bg-surface-container-low/30"
        >
          <Plus className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
          <p className="font-bold text-sm uppercase tracking-widest">Registrar Nuevo Rollo</p>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingFilament ? "Editar Filamento" : "Nuevo Filamento"}
      >
        <form onSubmit={handleSaveFilament} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Marca</label>
              <input name="brand" defaultValue={editingFilament?.brand} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="Ej: eSun" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Material</label>
              <input name="type" defaultValue={editingFilament?.type} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="Ej: PLA" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Color</label>
            <input name="color" defaultValue={editingFilament?.color} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="Ej: Azul Cobalto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Peso Inicial (g)</label>
              <input name="initialWeight" type="number" defaultValue={editingFilament?.initialWeight} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="1000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Peso Actual (g)</label>
              <input name="remainingWeight" type="number" defaultValue={editingFilament?.remainingWeight} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="1000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Precio Rollo (CLP)</label>
              <input name="price" type="number" defaultValue={editingFilament?.price} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="15000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Fecha Compra</label>
              <input name="purchaseDate" type="date" defaultValue={editingFilament?.purchaseDate} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" />
            {editingFilament ? "Actualizar Filamento" : "Guardar Filamento"}
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
              Esta acción eliminará permanentemente el filamento. Esta acción no se puede deshacer.
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
              Eliminar Filamento
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FilamentCard({ filament, onEdit, onDelete }: { filament: Filament; onEdit: () => void; onDelete: () => void; key?: any }) {
  const percentage = (filament.remainingWeight / filament.initialWeight) * 100;
  const isCritical = filament.remainingWeight < 200;

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/5 group"
    >
      <div className={cn(
        "h-24 p-4 flex justify-between items-start transition-colors",
        isCritical ? "bg-gradient-to-r from-orange-600 to-orange-500" : "bg-gradient-to-r from-slate-900 to-slate-800"
      )}>
        <div className="flex flex-col">
          <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-tighter backdrop-blur-md w-fit">
            {filament.type}
          </span>
          <h4 className="text-white font-bold mt-2 font-headline">{filament.brand} {filament.color}</h4>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="text-white/60 hover:text-white transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="text-white/60 hover:text-error transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-6 relative">
        <div className="absolute -top-6 right-6 w-12 h-12 rounded-full border-4 border-white shadow-lg flex items-center justify-center overflow-hidden bg-surface">
          <div className="w-full h-full" style={{ backgroundColor: getHexColor(filament.color) }} />
        </div>
        
        <div className="grid grid-cols-2 gap-y-4 mb-6">
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Marca</p>
            <p className="text-sm font-semibold">{filament.brand}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Precio/Rollo</p>
            <p className="text-sm font-semibold">{formatCurrency(filament.price)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <p className={cn(
              "text-[10px] font-bold uppercase flex items-center gap-1",
              isCritical ? "text-tertiary" : "text-on-surface-variant"
            )}>
              {isCritical && <AlertTriangle className="w-3 h-3" />}
              {isCritical ? "Bajo Stock" : "Peso Restante"}
            </p>
            <p className={cn("text-sm font-bold", isCritical ? "text-tertiary" : "text-on-surface")}>
              {filament.remainingWeight}g <span className="text-on-surface-variant/40 font-normal">/ {filament.initialWeight}g</span>
            </p>
          </div>
          <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              className={cn(
                "h-full rounded-full",
                isCritical ? "bg-tertiary" : "bg-primary"
              )}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button className="flex-1 bg-surface-container-low text-on-surface py-2 rounded-lg text-xs font-bold hover:bg-surface-dim transition-colors uppercase tracking-wider">
            Detalles
          </button>
          {isCritical && (
            <button className="flex-none aspect-square bg-tertiary/10 text-tertiary p-2 rounded-lg hover:bg-tertiary/20 transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function getHexColor(colorName: string) {
  const colors: any = {
    "Negro": "#1a1a1a",
    "Azul Cobalto": "#1e3a8a",
    "Blanco": "#ffffff",
    "Rojo": "#ef4444",
    "Gris": "#6b7280",
    "Naranja": "#f97316",
  };
  return colors[colorName] || "#ccc";
}
