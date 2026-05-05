import { useState, FormEvent, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  FileCode,
  Weight,
  Clock,
  ChevronRight,
  Save,
  Calculator,
  Zap,
  TrendingUp
} from "lucide-react";
import { cn, formatCurrency, generateId } from "../lib/utils";
import { Product, CostSettings, Filament } from "../types";
import Modal from "./Modal";

interface ProductsProps {
  state: {
    products: Product[];
    addActivity: (type: any, desc: string) => void;
    costSettings: CostSettings;
    filaments: Filament[];
    actions: any;
  };
}

export default function Products({ state }: ProductsProps) {
  const { products, addActivity, costSettings, filaments, actions } = state;
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for Calculator
  const [formParts, setFormParts] = useState<{id: string, name: string, weight: number}[]>([{id: "1", name: "Base", weight: 0}]);
  const [formPrintTime, setFormPrintTime] = useState<string>("");
  
  const formWeight = formParts.reduce((acc, p) => acc + (p.weight || 0), 0);

  const addPart = () => {
    setFormParts([...formParts, { id: generateId(), name: `Parte ${formParts.length + 1}`, weight: 0 }]);
  };
  const removePart = (id: string) => {
    if (formParts.length > 1) {
      setFormParts(formParts.filter(p => p.id !== id));
    }
  };
  const updatePart = (id: string, field: string, value: any) => {
    setFormParts(formParts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const [suggestedPrice, setSuggestedPrice] = useState<number>(0);
  const [selectedFilamentId, setSelectedFilamentId] = useState<string>(filaments[0]?.id || "");

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (editingProduct) {
      setFormParts(editingProduct.parts && editingProduct.parts.length > 0 ? editingProduct.parts : [{id: "1", name: "Base", weight: editingProduct.weight}]);
      setFormPrintTime(String(editingProduct.printTime));
    } else {
      setFormParts([{id: "1", name: "Base", weight: 0}]);
      setFormPrintTime("");
    }
  }, [editingProduct, isModalOpen]);

  useEffect(() => {
    // Use the selected filament as a reference price for cost estimation
    // The total weight is already the sum of all parts (formWeight)
    const filament = filaments.find(f => f.id === selectedFilamentId) || filaments[0];
    if (!filament || formWeight === 0) return;

    const materialCost = (formWeight / 1000) * filament.price;
    const printMinutes = Number(formPrintTime) || 0;
    const energyCost = (costSettings.printerPowerWatts / 1000) * (printMinutes / 60) * costSettings.electricityPriceKwh;
    const wearCost = (printMinutes / 60) * costSettings.machineWearPerHour;
    
    const totalCost = materialCost + energyCost + wearCost;
    const price = totalCost * (1 + costSettings.defaultProfitMargin / 100);
    
    setSuggestedPrice(Math.round(price));
  }, [formWeight, formPrintTime, selectedFilamentId, costSettings, filaments]);

  const handleSaveProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const productData: any = {
        name: formData.get("name") as string,
        price: Number(formData.get("price")),
        weight: formParts.reduce((acc, p) => acc + (p.weight || 0), 0),
        printTime: Number(formPrintTime) || 0,
        category: formData.get("category") as string,
        description: formData.get("description") as string,
        parts: formParts,
      };

      if (editingProduct) {
        await actions.products.update(editingProduct.id, productData);
        addActivity("sistema_actualizado", `Producto actualizado: ${productData.name}`);
      } else {
        await actions.products.create(productData);
        addActivity("producto_creado", `Nuevo producto creado: ${productData.name}`);
      }
      
      setIsModalOpen(false);
      setEditingProduct(null);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setProductToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (productToDelete) {
      const product = products.find(p => p.id === productToDelete);
      await actions.products.delete(productToDelete);
      addActivity("sistema_actualizado", `Producto eliminado: ${product?.name}`);
      setIsDeleteConfirmOpen(false);
      setProductToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Gestión de Productos</h2>
          <p className="text-on-surface-variant mt-1">Configura y administra tu catálogo de piezas 3D.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-5 py-2.5 bg-surface-container-highest text-on-surface rounded-xl text-sm font-semibold hover:bg-surface-dim transition-colors flex items-center justify-center gap-2">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          <button 
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
        <input 
          className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50" 
          placeholder="Buscar productos por nombre o categoría..." 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onEdit={() => { setEditingProduct(product); setIsModalOpen(true); }}
            onDelete={() => confirmDelete(product.id)}
          />
        ))}
        
        <button 
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="border-2 border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center p-12 group hover:border-primary/50 transition-all cursor-pointer bg-surface-container-low/30"
        >
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
            <Plus className="w-8 h-8 text-on-surface-variant" />
          </div>
          <h3 className="text-lg font-bold text-on-surface">Crear Nuevo Modelo</h3>
          <p className="text-sm text-on-surface-variant mt-1">Sube un archivo STL para comenzar</p>
        </button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
      >
        <form onSubmit={handleSaveProduct} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nombre del Producto</label>
              <input name="name" defaultValue={editingProduct?.name} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="Ej: Protector de Yogurt" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Categoría</label>
                <input name="category" defaultValue={editingProduct?.category} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" placeholder="Accesorios" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Filamento Base</label>
                <select 
                  value={selectedFilamentId} 
                  onChange={(e) => setSelectedFilamentId(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm"
                >
                  {filaments.map(f => (
                    <option key={f.id} value={f.id}>{f.brand} {f.type} ({f.color})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Partes / Colores del Producto</label>
                <button type="button" onClick={addPart} className="text-primary text-[10px] font-bold uppercase hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Añadir Parte</button>
              </div>
              <div className="space-y-2">
                {formParts.map((part, index) => (
                  <div key={part.id} className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={part.name} 
                      onChange={(e) => updatePart(part.id, "name", e.target.value)} 
                      className="flex-1 bg-surface-container-low border-none rounded-xl px-3 py-2 text-sm" 
                      placeholder="Nombre (ej. Base)" 
                      required 
                    />
                    <div className="relative w-24 shrink-0">
                      <input 
                        type="number" 
                        value={part.weight || ""} 
                        onChange={(e) => updatePart(part.id, "weight", Number(e.target.value))} 
                        className="w-full bg-surface-container-low border-none rounded-xl px-3 py-2 text-sm pr-6" 
                        placeholder="Peso" 
                        required 
                      />
                      <span className="absolute right-3 top-2 text-xs text-on-surface-variant font-bold">g</span>
                    </div>
                    {formParts.length > 1 && (
                      <button type="button" onClick={() => removePart(part.id)} className="p-2 text-error hover:bg-error/10 rounded-lg shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center bg-surface-container-low rounded-xl px-4 py-3 text-sm">
                <span className="font-bold uppercase tracking-widest text-on-surface-variant">Peso Total</span>
                <span className="font-bold text-primary">{formWeight} g</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tiempo Est. Total (min)</label>
              <input 
                name="printTime" 
                type="number" 
                value={formPrintTime} 
                onChange={(e) => setFormPrintTime(e.target.value)}
                required 
                min="0"
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm" 
                placeholder="45" 
              />
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-on-surface uppercase tracking-widest">Sugerencia de Precio</span>
                </div>
                <span className="text-lg font-black text-primary font-headline">{formatCurrency(suggestedPrice)}</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  const priceInput = document.querySelector('input[name="price"]') as HTMLInputElement;
                  if (priceInput) priceInput.value = suggestedPrice.toString();
                }}
                className="w-full py-2 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-all"
              >
                Usar Precio Sugerido
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Precio Final (CLP)</label>
              <input name="price" type="number" defaultValue={editingProduct?.price || suggestedPrice} required className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold text-primary" placeholder="3000" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Descripción</label>
              <textarea name="description" defaultValue={editingProduct?.description} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm h-24" placeholder="Detalles adicionales..." />
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" />
            {editingProduct ? "Actualizar Producto" : "Guardar Producto"}
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
              Esta acción eliminará permanentemente el producto. Esta acción no se puede deshacer.
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
              Eliminar Producto
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete }: { product: Product; onEdit: () => void; onDelete: () => void; key?: any }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/5 group"
    >
      <div className="h-48 relative bg-surface-dim/20 overflow-hidden">
        <img 
          src={`https://picsum.photos/seed/${product.id}/600/400`} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-primary px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
          {product.category}
        </div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-on-surface mb-1 font-headline">{product.name}</h3>
            <p className="text-sm text-on-surface-variant line-clamp-2">{product.description || "Sin descripción disponible."}</p>
          </div>
          <span className="text-lg font-black text-primary shrink-0">{formatCurrency(product.price)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface-container-low p-3 rounded-xl flex items-center gap-3">
            <Weight className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Peso</p>
              <p className="text-sm font-bold">{product.weight}g</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-3 rounded-xl flex items-center gap-3">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Impresión</p>
              <p className="text-sm font-bold">{product.printTime} min</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/10">
          <button className="flex-1 py-2.5 px-4 bg-surface-container-low text-on-surface rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all">
            <FileCode className="w-4 h-4" />
            Archivo STL
          </button>
          <button onClick={onEdit} className="p-2.5 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
