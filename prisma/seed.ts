import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Empezando seeding...')

  // 1. Cost Settings
  await prisma.costSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      electricityPriceKwh: 120,
      printerPowerWatts: 150,
      machineWearPerHour: 200,
      defaultProfitMargin: 50,
      vatRate: 19,
      personalSalaryPercentage: 30,
    },
  })

  // 2. Filaments
  const plaRed = await prisma.filament.create({
    data: {
      brand: "eSun",
      type: "PLA+",
      color: "Rojo",
      initialWeight: 1000,
      remainingWeight: 850,
      price: 18000,
      provider: "3D Chile",
      purchaseDate: new Date().toISOString(),
    }
  })

  const plaBlack = await prisma.filament.create({
    data: {
      brand: "Creality",
      type: "PLA",
      color: "Negro",
      initialWeight: 1000,
      remainingWeight: 420,
      price: 15000,
      provider: "Mercado Libre",
      purchaseDate: new Date().toISOString(),
    }
  })

  // 3. Products
  const articulatingDragon = await prisma.product.create({
    data: {
      name: "Dragón Articulado",
      price: 15000,
      weight: 120,
      printTime: 480,
      category: "Juguetes",
      description: "Dragón legendario con 24 puntos de articulación.",
    }
  })

  const gearFidget = await prisma.product.create({
    data: {
      name: "Fidget de Engranajes",
      price: 5000,
      weight: 35,
      printTime: 90,
      category: "Fidgets",
      description: "Juguete antiestrés de alta precisión.",
    }
  })

  // 4. Orders
  await prisma.order.create({
    data: {
      customerName: "Juan Pérez",
      customerPhone: "+56912345678",
      orderDate: new Date().toISOString(),
      status: "pendiente",
      total: 20000,
      paid: 10000,
      pending: 10000,
      paymentMethod: "transferencia",
      items: {
        create: [
          {
            productId: articulatingDragon.id,
            productName: articulatingDragon.name,
            quantity: 1,
            color: "Rojo",
            filamentId: plaRed.id,
            unitPrice: 15000,
            totalWeight: 120,
            totalPrintTime: 480,
          },
          {
            productId: gearFidget.id,
            productName: gearFidget.name,
            quantity: 1,
            color: "Negro",
            filamentId: plaBlack.id,
            unitPrice: 5000,
            totalWeight: 35,
            totalPrintTime: 90,
          }
        ]
      }
    }
  })

  console.log('✅ Seeding completado exitosamente.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
