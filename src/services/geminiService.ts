import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey! });

export const createOrderTool: FunctionDeclaration = {
  name: "createOrder",
  description: "Crea un nuevo pedido de impresión 3D en el sistema.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: "Nombre del cliente" },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            productId: { type: Type.STRING, description: "ID del producto" },
            quantity: { type: Type.NUMBER, description: "Cantidad" },
            color: { type: Type.STRING, description: "Color solicitado" },
            filamentId: { type: Type.STRING, description: "ID del filamento a usar" },
            customPrice: { type: Type.NUMBER, description: "Precio personalizado (opcional)" }
          },
          required: ["productId", "quantity", "color", "filamentId"]
        }
      },
      isPaid: { type: Type.BOOLEAN, description: "Si el pedido ya fue pagado totalmente" },
      notes: { type: Type.STRING, description: "Notas adicionales" }
    },
    required: ["customerName", "items"]
  }
};

export const searchCatalogTool: FunctionDeclaration = {
  name: "searchCatalog",
  description: "Busca productos o filamentos en el catálogo actual para obtener sus IDs y detalles.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Nombre del producto o color de filamento a buscar" },
      type: { type: Type.STRING, enum: ["product", "filament"], description: "Tipo de elemento a buscar" }
    },
    required: ["query", "type"]
  }
};

export const getSummaryTool: FunctionDeclaration = {
  name: "getSummary",
  description: "Obtiene un resumen del estado actual del negocio (ventas, pedidos pendientes, etc.).",
  parameters: { type: Type.OBJECT, properties: {} }
};

export const updateOrderStatusTool: FunctionDeclaration = {
  name: "updateOrderStatus",
  description: "Actualiza el estado de un pedido existente.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      orderId: { type: Type.STRING, description: "ID del pedido (ej: FF-1234)" },
      status: { 
        type: Type.STRING, 
        enum: ["pendiente", "en impresión", "listo", "entregado", "cancelado"],
        description: "Nuevo estado del pedido" 
      }
    },
    required: ["orderId", "status"]
  }
};

export const getFilamentStockTool: FunctionDeclaration = {
  name: "getFilamentStock",
  description: "Consulta el stock actual de filamentos.",
  parameters: { type: Type.OBJECT, properties: {} }
};

export const registerWasteTool: FunctionDeclaration = {
  name: "registerWaste",
  description: "Registra una merma o desperdicio de material.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filamentId: { type: Type.STRING, description: "ID del filamento desperdiciado" },
      weight: { type: Type.NUMBER, description: "Peso en gramos" },
      reason: { type: Type.STRING, description: "Razón del desperdicio (ej: Falla de impresión, Soportes)" }
    },
    required: ["filamentId", "weight", "reason"]
  }
};

export const getPrinterStatusTool: FunctionDeclaration = {
  name: "getPrinterStatus",
  description: "Consulta el estado actual de las impresoras.",
  parameters: { type: Type.OBJECT, properties: {} }
};

export async function processAIPrompt(prompt: string | { mimeType: string; data: string }, history: any[] = []) {
  try {
    const contents = typeof prompt === "string" 
      ? prompt 
      : { parts: [{ inlineData: prompt }, { text: "Interpreta este audio y realiza las acciones necesarias en el sistema de ForgeFlow. Si el usuario hace una pregunta, respóndela. Si pide una acción, ejecútala." }] };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        typeof contents === "string" ? { role: "user", parts: [{ text: contents }] } : { role: "user", parts: contents.parts }
      ],
      config: {
        systemInstruction: `Eres ForgeFlow AI, el asistente experto de un taller de impresión 3D. 
        Tu misión es ser el "copiloto" del dueño, ayudándole a gestionar el taller con el mínimo esfuerzo.
        
        CONOCIMIENTO DEL NEGOCIO:
        - Gestionas pedidos, productos, filamentos, mermas y finanzas.
        - El taller tiene un sistema de "Sueldo Personal" (un % de la ganancia neta) y "Reinversión".
        - Los estados de pedido son: pendiente, en impresión, listo, entregado, cancelado.
        
        REGLAS DE OPERACIÓN:
        1. CREAR PEDIDOS: Primero busca el producto y el filamento con 'searchCatalog'. Si el usuario dice "emblema rojo", busca "emblema" (producto) y "rojo" (filamento). Luego usa 'createOrder'.
        2. ACTUALIZAR ESTADOS: Si el usuario dice "ya entregué el pedido de Juan" o "pon el pedido FF-1234 en impresión", usa 'updateOrderStatus'.
        3. CONSULTAS: Puedes responder preguntas sobre el stock ('getFilamentStock') o el estado financiero ('getSummary').
        4. MERMAS: Si el usuario dice "tuve una falla de 30g en el PLA negro", busca el filamento y usa 'registerWaste'.
        5. PRECISIÓN: Si no estás seguro de qué producto o filamento se refiere, muestra las opciones que encontraste y pregunta.
        6. TONO: Profesional, servicial y conciso. Responde siempre en español.
        
        FLUJO DE TRABAJO:
        - Siempre confirma las acciones importantes ("He creado el pedido...", "He actualizado el estado...", "He registrado la merma...").
        - Si el usuario te habla por audio, transcribe lo que entendiste en tu respuesta final.`,
        tools: [{ functionDeclarations: [createOrderTool, searchCatalogTool, getSummaryTool, updateOrderStatusTool, getFilamentStockTool, registerWasteTool] }]
      }
    });

    return response;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
