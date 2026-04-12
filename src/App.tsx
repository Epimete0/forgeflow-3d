import { useState, useEffect, useMemo, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  Box, 
  Droplets, 
  ShoppingCart, 
  Activity, 
  BarChart3, 
  Plus, 
  Sparkles, 
  HelpCircle,
  Search,
  Bell,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  User,
  Layers,
  AlertTriangle,
  Package,
  CreditCard
} from "lucide-react";

// Short ID helper - shows last 6 chars of UUID in uppercase
export const shortId = (id: string) => `#${id.slice(-6).toUpperCase()}`;

import { cn } from "./lib/utils";
import { Product, Filament, Order, ActivityEvent, CostSettings, WasteRecord, Printer, MaintenanceRecord, Expense } from "./types";
import { INITIAL_PRODUCTS, INITIAL_FILAMENTS, INITIAL_ORDERS, INITIAL_ACTIVITY, INITIAL_COST_SETTINGS, INITIAL_PRINTERS } from "./constants";

// Components (to be created)
import Dashboard from "./components/Dashboard";
import Products from "./components/Products";
import Filaments from "./components/Filaments";
import Orders from "./components/Orders";
import Production from "./components/Production";
import Finance from "./components/Finance";
import SettingsPage from "./components/Settings";
import Waste from "./components/Waste";
import Customers from "./components/Customers";
import Expenses from "./components/Expenses";

function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
  const location = useLocation();
  
  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Producción", path: "/production", icon: Layers },
    { name: "Productos", path: "/products", icon: Box },
    { name: "Filamentos", path: "/filaments", icon: Droplets },
    { name: "Pedidos", path: "/orders", icon: ShoppingCart },
    { name: "Mermas", path: "/waste", icon: X },
    { name: "Clientes", path: "/customers", icon: User },
    { name: "Gastos", path: "/expenses", icon: CreditCard },
    { name: "Finanzas", path: "/finance", icon: BarChart3 },
    { name: "Configuración", path: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant/10 z-50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 py-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-white shadow-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-on-surface leading-tight font-headline">ForgeFlow</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Precision Architect</p>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <a
                key={item.name}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, "", item.path);
                  window.dispatchEvent(new PopStateEvent("popstate"));
                  setIsOpen(false);
                }}
                className={cn(
                  "mx-2 my-1 px-4 py-3 flex items-center gap-3 rounded-lg transition-all group",
                  isActive 
                    ? "bg-primary/10 text-primary font-bold translate-x-1" 
                    : "text-on-surface-variant hover:bg-surface-dim/50"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "fill-primary/20")} />
                <span className="text-sm font-medium">{item.name}</span>
              </a>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="mt-4 pt-4 border-t border-outline-variant/10 space-y-1">
            <a href="#" className="flex items-center gap-3 text-on-surface-variant hover:text-primary text-sm py-2 px-4 rounded-lg transition-colors">
              <HelpCircle className="w-4 h-4" />
              <span>Soporte</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

function TopBar({ 
  onMenuClick, isDarkMode, toggleDarkMode, filaments, orders 
}: { 
  onMenuClick: () => void; 
  isDarkMode: boolean; 
  toggleDarkMode: () => void; 
  filaments: any[];
  orders: any[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const lowStockFilaments = filaments.filter(f => f.remainingWeight < 200);
  const pendingOrders = orders.filter(o => o.status === "pendiente").length;

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results: { type: string; label: string; sub: string; path: string }[] = [];

    orders.filter(o => 
      o.customerName.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    ).slice(0, 4).forEach(o => results.push({
      type: "Pedido", label: o.customerName, sub: `${shortId(o.id)} · ${o.status}`, path: "/orders"
    }));

    filaments.filter(f => 
      `${f.brand} ${f.type} ${f.color}`.toLowerCase().includes(q)
    ).slice(0, 3).forEach(f => results.push({
      type: "Filamento", label: `${f.brand} ${f.type}`, sub: `${f.color} · ${f.remainingWeight}g`, path: "/filaments"
    }));

    return results;
  }, [searchQuery, orders, filaments]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) setShowAlerts(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    setShowSearch(false);
    setSearchQuery("");
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-surface/80 backdrop-blur-md flex justify-between items-center px-4 lg:px-8 z-40 border-b border-outline-variant/5">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-dim rounded-lg">
          <Menu className="w-6 h-6" />
        </button>
        {/* Global Search */}
        <div ref={searchRef} className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input 
            className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50" 
            placeholder="Buscar pedidos, filamentos..." 
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
          />
          <AnimatePresence>
            {showSearch && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden z-50"
              >
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(r.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low text-left transition-colors"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-md shrink-0">{r.type}</span>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{r.label}</p>
                      <p className="text-[10px] text-on-surface-variant">{r.sub}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button 
          onClick={toggleDarkMode}
          className="p-2 text-on-surface-variant hover:bg-primary/5 rounded-full transition-colors"
          title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Alerts Bell */}
        <div ref={alertRef} className="relative">
          <button 
            onClick={() => setShowAlerts(!showAlerts)}
            className="p-2 text-on-surface-variant hover:bg-primary/5 rounded-full transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {(lowStockFilaments.length > 0 || pendingOrders > 0) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface" />
            )}
          </button>
          <AnimatePresence>
            {showAlerts && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-outline-variant/10">
                  <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Alertas del Sistema</p>
                </div>
                {lowStockFilaments.length === 0 && pendingOrders === 0 ? (
                  <div className="p-6 text-center text-sm text-on-surface-variant">Sin alertas activas ✓</div>
                ) : (
                  <div className="divide-y divide-outline-variant/5">
                    {pendingOrders > 0 && (
                      <button onClick={() => { navigate("/orders"); setShowAlerts(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 text-left">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{pendingOrders} pedido{pendingOrders > 1 ? 's' : ''} pendiente{pendingOrders > 1 ? 's' : ''}</p>
                          <p className="text-[10px] text-on-surface-variant">Requieren atención inmediata</p>
                        </div>
                      </button>
                    )}
                    {lowStockFilaments.map(f => (
                      <button key={f.id} onClick={() => { navigate("/filaments"); setShowAlerts(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-left">
                        <div className="w-8 h-8 bg-error/10 rounded-xl flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4 text-error" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{f.brand} {f.color} bajo</p>
                          <p className="text-[10px] text-error font-bold">Solo {f.remainingWeight}g restantes</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-outline-variant/20 mx-1 hidden sm:block"></div>
        <div className="flex items-center gap-3 pl-1">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface">Admin User</p>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Workshop Lead</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/10 border-2 border-primary/20 overflow-hidden">
            <img 
              src="https://picsum.photos/seed/admin/100/100" 
              alt="User" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("ff_dark_mode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("ff_dark_mode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);
  
  // State Management
  const [products, setProducts] = useState<Product[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [costSettings, setCostSettings] = useState<CostSettings>(INITIAL_COST_SETTINGS);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Data Fetching
  const refreshData = async () => {
    try {
      const [
        productsData, 
        filamentsData, 
        ordersData, 
        activityData, 
        settingsData, 
        wasteData,
        expensesData
      ] = await Promise.all([
        import("./api").then(m => m.api.products.list()),
        import("./api").then(m => m.api.filaments.list()),
        import("./api").then(m => m.api.orders.list()),
        import("./api").then(m => m.api.activities.list()),
        import("./api").then(m => m.api.settings.get()),
        import("./api").then(m => m.api.waste.list()),
        import("./api").then(m => m.api.expenses.list()),
      ]);

      setProducts(productsData);
      setFilaments(filamentsData);
      setOrders(ordersData);
      setActivity(activityData);
      if (settingsData) setCostSettings(settingsData);
      setWasteRecords(wasteData);
      setExpenses(expensesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addActivity = async (type: ActivityEvent["type"], description: string) => {
    const api = await import("./api").then(m => m.api);
    await api.activities.create({
      type,
      description,
      timestamp: new Date().toISOString()
    });
    refreshData();
  };

  // Action Wrappers for components
  const actions = {
    products: {
      create: async (data: any) => {
        const api = await import("./api").then(m => m.api);
        await api.products.create(data);
        refreshData();
      },
      update: async (id: string, data: any) => {
        const api = await import("./api").then(m => m.api);
        await api.products.update(id, data);
        refreshData();
      },
      delete: async (id: string) => {
        const api = await import("./api").then(m => m.api);
        await api.products.delete(id);
        refreshData();
      }
    },
    filaments: {
      create: async (data: any) => {
        const api = await import("./api").then(m => m.api);
        await api.filaments.create(data);
        refreshData();
      },
      update: async (id: string, data: any) => {
        const api = await import("./api").then(m => m.api);
        await api.filaments.update(id, data);
        refreshData();
      },
      delete: async (id: string) => {
        const api = await import("./api").then(m => m.api);
        await api.filaments.delete(id);
        refreshData();
      }
    },
    orders: {
      create: async (data: any) => {
        const api = await import("./api").then(m => m.api);
        await api.orders.create(data);
        refreshData();
      },
      update: async (id: string, data: any) => {
        const api = await import("./api").then(m => m.api);
        await api.orders.update(id, data);
        refreshData();
      },
      delete: async (id: string) => {
        const api = await import("./api").then(m => m.api);
        await api.orders.delete(id);
        refreshData();
      }
    },
    waste: {
      create: async (data: any) => {
        const api = await import("./api").then(m => m.api);
        await api.waste.create(data);
        refreshData();
      }
    },
    settings: {
      save: async (data: any) => {
        const api = await import("./api").then(m => m.api);
        await api.settings.save(data);
        refreshData();
      }
    },
    expenses: {
      create: async (data: any) => {
        const api = await import("./api").then(m => m.api);
        await api.expenses.create(data);
        refreshData();
      },
      delete: async (id: string) => {
        const api = await import("./api").then(m => m.api);
        await api.expenses.delete(id);
        refreshData();
      }
    }
  };

  const state = {
    products, setProducts: actions.products.update, // Modified to use actions where possible or keep as is
    filaments, setFilaments: actions.filaments.update,
    orders, setOrders: actions.orders.update,
    activity, setActivity,
    costSettings, setCostSettings: actions.settings.save,
    wasteRecords, setWasteRecords: actions.waste.create,
    expenses, setExpenses: actions.expenses.create,
    addActivity,
    actions, // Exporting full actions object
    isDarkMode, setIsDarkMode,
    isLoading
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <TopBar 
          onMenuClick={() => setIsSidebarOpen(true)} 
          isDarkMode={isDarkMode} 
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          filaments={filaments}
          orders={orders}
        />
        
        <main className="lg:ml-64 pt-16 min-h-screen">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard state={state} />} />
              <Route path="/production" element={<Production state={state} />} />
              <Route path="/products" element={<Products state={state} />} />
              <Route path="/filaments" element={<Filaments state={state} />} />
              <Route path="/orders" element={<Orders state={state} />} />
              <Route path="/finance" element={<Finance state={state} />} />
              <Route path="/waste" element={<Waste state={state} />} />
              <Route path="/customers" element={<Customers state={state} />} />
              <Route path="/expenses" element={<Expenses state={state} />} />
              <Route path="/settings" element={<SettingsPage state={state} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
