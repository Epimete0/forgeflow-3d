import { Order, OrderItem, Filament, CostSettings } from "../types";

export interface OrderProfitAnalysis {
  grossPrice: number;
  netPrice: number;
  vat: number;
  materialCost: number;
  energyCost: number;
  wearCost: number;
  totalCost: number;
  netProfit: number;
  margin: number;
  energyKwh: number;
  efficiency: number; // g/h
}

export function calculateOrderProfit(order: Order, products: any[], filaments: Filament[], settings: CostSettings): OrderProfitAnalysis {
  const vatRate = (settings.vatRate || 19) / 100;
  const grossPrice = order.total;
  const netPrice = grossPrice / (1 + vatRate);
  const vat = grossPrice - netPrice;

  let materialCost = 0;
  let energyCost = 0;
  let wearCost = 0;
  let totalMinutes = 0;
  let totalWeight = 0;

  order.items.forEach(item => {
    totalMinutes += item.totalPrintTime;
    totalWeight += item.totalWeight;

    // Energy & Wear
    const itemEnergyKwh = (settings.printerPowerWatts / 1000) * (item.totalPrintTime / 60);
    const itemEnergyCost = itemEnergyKwh * settings.electricityPriceKwh;
    const itemWearCost = (item.totalPrintTime / 60) * settings.machineWearPerHour;
    
    energyCost += itemEnergyCost;
    wearCost += itemWearCost;

    // Material
    if (item.materials && item.materials.length > 0) {
      item.materials.forEach((mat: any) => {
        const filament = filaments.find((f: any) => f.id === mat.filamentId);
        const pricePerGram = filament ? filament.price / 1000 : 15;
        materialCost += mat.weight * item.quantity * pricePerGram;
      });
    } else {
      const filament = filaments.find((f: any) => f.id === item.filamentId);
      const pricePerGram = filament ? filament.price / 1000 : 15;
      materialCost += item.totalWeight * pricePerGram;
    }
  });

  const totalCost = materialCost + energyCost + wearCost;
  const netProfit = netPrice - totalCost;
  const margin = netPrice > 0 ? (netProfit / netPrice) * 100 : 0;
  
  const totalHours = totalMinutes / 60;
  const efficiency = totalHours > 0 ? totalWeight / totalHours : 0;

  return {
    grossPrice,
    netPrice,
    vat,
    materialCost,
    energyCost,
    wearCost,
    totalCost,
    netProfit,
    margin,
    energyKwh: (settings.printerPowerWatts / 1000) * (totalMinutes / 60),
    efficiency
  };
}
