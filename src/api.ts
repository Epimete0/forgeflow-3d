const API_BASE = "/api";

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  products: {
    list: () => request("/products"),
    create: (data: any) => request("/products", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/products/${id}`, { method: "DELETE" }),
  },
  filaments: {
    list: () => request("/filaments"),
    create: (data: any) => request("/filaments", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/filaments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/filaments/${id}`, { method: "DELETE" }),
  },
  orders: {
    list: () => request("/orders"),
    create: (data: any) => request("/orders", { method: "POST", body: JSON.stringify(data) }),
    import: (data: any) => request("/orders/import", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/orders/${id}`, { method: "DELETE" }),
  },
  waste: {
    list: () => request("/waste"),
    create: (data: any) => request("/waste", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/waste/${id}`, { method: "DELETE" }),
  },
  activities: {
    list: () => request("/activities"),
    create: (data: any) => request("/activities", { method: "POST", body: JSON.stringify(data) }),
  },
  settings: {
    get: () => request("/settings"),
    save: (data: any) => request("/settings", { method: "POST", body: JSON.stringify(data) }),
  },
  printers: {
    list: () => request("/printers"),
    create: (data: any) => request("/printers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/printers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/printers/${id}`, { method: "DELETE" }),
  },
  maintenance: {
    list: () => request("/maintenance"),
    create: (data: any) => request("/maintenance", { method: "POST", body: JSON.stringify(data) }),
  },
  expenses: {
    list: () => request("/expenses"),
    create: (data: any) => request("/expenses", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/expenses/${id}`, { method: "DELETE" }),
  },
  cashMovements: {
    list: () => request("/cash-movements"),
    create: (data: any) => request("/cash-movements", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/cash-movements/${id}`, { method: "DELETE" }),
  },
};
