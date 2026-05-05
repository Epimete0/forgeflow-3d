import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique ID that works in non-secure contexts (HTTP on Raspberry Pi).
 * Falls back from crypto.randomUUID → crypto.getRandomValues → Math.random
 */
export function generateId(): string {
  // Preferred: crypto.randomUUID (requires secure context)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch (_) {
      // Falls through to fallback
    }
  }

  // Fallback: crypto.getRandomValues (works in all modern browsers, no secure context needed)
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last resort fallback
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(value);
}

/**
 * Maps Spanish color names to hex values for visual indicators.
 * Centralized to avoid scattered, inconsistent maps across components.
 */
export function getFilamentHexColor(colorName: string): string {
  const colors: Record<string, string> = {
    "Negro": "#1a1a1a",
    "Blanco": "#ffffff",
    "Rojo": "#ef4444",
    "Azul": "#3b82f6",
    "Azul Cobalto": "#1e3a8a",
    "Azul Cielo": "#38bdf8",
    "Verde": "#22c55e",
    "Amarillo": "#eab308",
    "Naranja": "#f97316",
    "Rosa": "#ec4899",
    "Morado": "#8b5cf6",
    "Gris": "#6b7280",
    "Transparente": "#e5e7eb",
    "Dorado": "#d97706",
    "Plateado": "#94a3b8",
    "Marrón": "#92400e",
    "Café": "#78350f",
    "Beige": "#d4c5a9",
  };
  return colors[colorName] || "#9ca3af";
}
