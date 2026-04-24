import React, { FormEvent, useRef } from "react";
import { 
  Save, 
  Zap, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Download, 
  Upload, 
  ShieldCheck,
  AlertTriangle,
  Database,
  Moon,
  Sun,
  Receipt,
  User
} from "lucide-react";
import { motion } from "motion/react";
import { CostSettings } from "../types";
import { cn } from "../lib/utils";

interface SettingsProps {
  state: {
    costSettings: CostSettings;
    addActivity: (type: any, desc: string) => void;
    // For backup
    products: any[];
    filaments: any[];
    orders: any[];
    activity: any[];
    wasteRecords: any[];
    isDarkMode: boolean;
    setIsDarkMode: (d: boolean) => void;
    actions: any;
  };
}

export default function Settings({ state }: SettingsProps) {
  const { 
    costSettings, addActivity,
    products, 
    filaments, 
    orders, 
    activity, 
    wasteRecords, 
    isDarkMode, setIsDarkMode,
    actions
  } = state;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newSettings: CostSettings = {
      electricityPriceKwh: Number(formData.get("electricityPriceKwh")),
      printerPowerWatts: Number(formData.get("printerPowerWatts")),
      machineWearPerHour: Number(formData.get("machineWearPerHour")),
      defaultProfitMargin: Number(formData.get("defaultProfitMargin")),
      vatRate: Number(formData.get("vatRate")),
      personalSalaryPercentage: Number(formData.get("personalSalaryPercentage")),
    };

    await actions.settings.save(newSettings);
    addActivity("sistema_actualizado", "Configuración de costos actualizada en el servidor");
    alert("Configuración guardada correctamente");
  };

  const exportData = () => {
    const data = {
      products,
      filaments,
      orders,
      activity,
      costSettings,
      wasteRecords,
      exportDate: new Date().toISOString(),
      version: "2.1 (Cloud)"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forgeflow_backend_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addActivity("sistema_actualizado", "Respaldo de datos exportado");
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("¿Importar este respaldo? Los datos serán cargados al servidor. Los registros existentes NO serán eliminados (solo se agregarán los nuevos).")) {
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const api = await import("../api").then(m => m.api);

      let imported = 0;

      if (data.filaments?.length) {
        for (const f of data.filaments) {
          try { await api.filaments.create(f); imported++; } catch (_) {}
        }
      }
      if (data.products?.length) {
        for (const p of data.products) {
          try { await api.products.create(p); imported++; } catch (_) {}
        }
      }
      if (data.orders?.length) {
        for (const o of data.orders) {
          try { await api.orders.create(o); imported++; } catch (_) {}
        }
      }

      addActivity("sistema_actualizado", `Respaldo importado: ${imported} registros restaurados`);
      alert(`Importación completada: ${imported} registros cargados. La aplicación se reiniciará para reflejar los cambios.`);
      window.location.reload();
    } catch (err) {
      alert("Error al importar: el archivo no es válido o está corrupto.");
    }

    // Reset file input
    e.target.value = "";
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Configuración</h2>
        <p className="text-on-surface-variant mt-1">Administración del sistema y parámetros de costos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost Settings Form */}
        <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/5 overflow-hidden">
          <div className="p-6 bg-surface-container-low border-b border-outline-variant/10 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-on-surface">Parámetros de Costos</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <Zap className="w-4 h-4 text-primary" />
                  Precio Electricidad (kWh)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm">$</span>
                  <input 
                    name="electricityPriceKwh" 
                    type="number" 
                    defaultValue={costSettings.electricityPriceKwh} 
                    required 
                    className="w-full bg-surface-container-low border-none rounded-xl pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <Zap className="w-4 h-4 text-primary" />
                  Potencia Impresora (Watts)
                </label>
                <input 
                  name="printerPowerWatts" 
                  type="number" 
                  defaultValue={costSettings.printerPowerWatts} 
                  required 
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" 
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <Clock className="w-4 h-4 text-primary" />
                  Desgaste Máquina / Hora
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm">$</span>
                  <input 
                    name="machineWearPerHour" 
                    type="number" 
                    defaultValue={costSettings.machineWearPerHour} 
                    required 
                    className="w-full bg-surface-container-low border-none rounded-xl pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Margen de Ganancia (%)
                </label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm">%</span>
                  <input 
                    name="defaultProfitMargin" 
                    type="number" 
                    defaultValue={costSettings.defaultProfitMargin} 
                    required 
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <Receipt className="w-4 h-4 text-primary" />
                  Tasa de IVA (%)
                </label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm">%</span>
                  <input 
                    name="vatRate" 
                    type="number" 
                    defaultValue={costSettings.vatRate} 
                    required 
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <User className="w-4 h-4 text-primary" />
                  Sueldo Personal (%)
                </label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm">%</span>
                  <input 
                    name="personalSalaryPercentage" 
                    type="number" 
                    defaultValue={costSettings.personalSalaryPercentage} 
                    required 
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95">
              <Save className="w-5 h-5" />
              Guardar Configuración
            </button>
          </form>
        </div>

        <div className="space-y-8">
          {/* Data Security Info */}
          <div className="bg-inverse-surface text-inverse-on-surface rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary-fixed">Protección de Datos</h3>
                  <p className="text-xl font-bold font-headline">Respaldos Automáticos Activos</p>
                </div>
              </div>
              <p className="text-xs opacity-70 leading-relaxed mb-6">
                Tu base de datos está siendo respaldada automáticamente cada 6 horas y en cada inicio del sistema. 
                Mantenemos un historial rotativo de los últimos 10 archivos de seguridad en la carpeta del servidor.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sistema de Seguridad Operativo
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/5 overflow-hidden">
            <div className="p-6 bg-surface-container-low border-b border-outline-variant/10 flex items-center gap-3">
              <Sun className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-on-surface">Preferencia de Tema</h3>
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isDarkMode ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"
                  )}>
                    {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Modo Nocturno</p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter mt-1">
                      {isDarkMode ? "Activado" : "Desactivado"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors",
                    isDarkMode ? "bg-primary" : "bg-outline-variant"
                  )}
                >
                  <motion.div 
                    animate={{ x: isDarkMode ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/5 overflow-hidden">
            <div className="p-6 bg-surface-container-low border-b border-outline-variant/10 flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-on-surface">Gestión de Datos</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-4">
                <Database className="w-5 h-5 text-primary shrink-0 mt-1" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Almacenamiento en Servidor</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Tus datos se guardan en una <strong>base de datos SQLite en el servidor local</strong>. Realiza respaldos periódicos exportando el archivo JSON para proteger tu información.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={exportData}
                  className="flex flex-col items-center gap-3 p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Download className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-on-surface">Exportar Respaldo</p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter mt-1">Descargar JSON</p>
                  </div>
                </button>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-on-surface">Importar Respaldo</p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter mt-1">Subir archivo JSON</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={importData} 
                    accept=".json" 
                    className="hidden" 
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-inverse-surface text-inverse-on-surface p-8 rounded-3xl shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold font-headline">ForgeFlow 2.0</h4>
              <p className="text-sm text-inverse-on-surface/60 mt-1">
                Tu administración local está protegida. Todos los cálculos y datos permanecen en tu espacio privado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Calculator({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  );
}
