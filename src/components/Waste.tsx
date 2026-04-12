import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { 
  Plus, 
  Trash2, 
  Save, 
  Calendar,
  Droplet,
  AlertTriangle,
  History
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { WasteRecord, Filament } from "../types";
import Modal from "./Modal";

interface WasteProps {
  state: {
    wasteRecords: WasteRecord[];
    filaments: Filament[];
    addActivity: (type: any, desc: string) => void;
    actions: any;
  };
}

export default function Waste({ state }: WasteProps) {
  const { wasteRecords, filaments, addActivity, actions } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveWaste = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const filamentId = formData.get("filamentId") as string;
    const weight = Number(formData.get("weight"));
    const reason = formData.get("reason") as string;

    const data = {
      filamentId,
      weight,
      reason,
      date: new Date().toISOString()
    };

    const filament = filaments.find(f => f.id === filamentId);
    if (filament) {
      await actions.waste.create(data);
      addActivity("merma_registrada", `Merma registrada: ${weight}g de ${filament.brand} ${filament.color} por ${reason}`);
      setIsModalOpen(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const record = wasteRecords.find(r => r.id === id);
    if (record) {
      await actions.waste.delete(id);
      addActivity("sistema_actualizado", `Registro de merma eliminado: ${record.weight}g restaurados`);
    }
  };

  const totalWaste = wasteRecords.reduce((acc, r) => acc + r.weight, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Registro de Mermas</h2>
          <p className="text-on-surface-variant mt-1">Control de pérdidas de material y desperdicios de impresión.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-tertiary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all shadow-lg shadow-tertiary/20"
        >
          <Plus className="w-5 h-5" />
          Registrar Merma
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/5 flex flex-col justify-center border-l-4 border-tertiary">
          <AlertTriangle className="text-tertiary mb-3 w-8 h-8" />
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Desperdiciado</p>
          <h3 className="text-2xl font-bold text-on-surface font-headline">{totalWaste}g</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/5 flex flex-col justify-center">
          <History className="text-primary mb-3 w-8 h-8" />
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Registros Totales</p>
          <h3 className="text-2xl font-bold text-on-surface font-headline">{wasteRecords.length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Filamento</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Peso</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Motivo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {wasteRecords.map((record) => {
                const filament = filaments.find(f => f.id === record.filamentId);
                return (
                  <tr key={record.id} className="hover:bg-surface-dim/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-on-surface font-medium">
                        <Calendar className="w-4 h-4 text-on-surface-variant/40" />
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: filament?.color }} />
                        <span className="text-sm font-semibold">{filament?.brand} {filament?.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-tertiary">{record.weight}g</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-on-surface-variant">{record.reason}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {wasteRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant/40 italic">
                    No hay registros de mermas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Registrar Nueva Merma"
      >
        <form onSubmit={handleSaveWaste} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Filamento</label>
            <select name="filamentId" required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm">
              {filaments.map(f => (
                <option key={f.id} value={f.id}>{f.brand} {f.type} ({f.color}) - {f.remainingWeight}g disp.</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Peso de la Merma (g)</label>
            <input name="weight" type="number" required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="Ej: 50" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Motivo / Razón</label>
            <select name="reason" required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm">
              <option value="Falla de impresión">Falla de impresión</option>
              <option value="Soportes">Soportes</option>
              <option value="Purga / Cambio de color">Purga / Cambio de color</option>
              <option value="Material dañado">Material dañado</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-tertiary text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-tertiary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-all">
            <Save className="w-4 h-4" />
            Guardar Registro
          </button>
        </form>
      </Modal>
    </div>
  );
}
