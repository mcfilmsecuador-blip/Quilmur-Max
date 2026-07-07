import { db } from "./db";

// Configuración editable del sistema: tablero, sierra, reglas constructivas,
// precios de prueba (sección 39 de la especificación) y reglas de herrajes.
export interface QuilmurConfig {
  tablero: { largo: number; ancho: number }; // mm
  sierra: { kerf: number; margen: number; retazoMinimo: number }; // mm
  reglas: {
    espesor: number;
    espesorFondo: number;
    holguraPuerta: number; // descuento total por dimensión del vano
    separacionFrentes: number;
    holguraRepisa: number;
    retranqueoRepisa: number;
    alturaZocalo: number;
    alturaLateralCajon: number;
    descuentoProfCajon: number;
    desperdicioCantoPct: number;
  };
  precios: {
    tableroColor: number;
    tableroBlanco: number;
    herrajePequeno: number;
    herrajeMediano: number;
    jaladera: number;
    cantoMetro: number;
  };
  herrajes: {
    bisagrasPorAltura: { hasta: number; cantidad: number }[];
    soportesPorRepisa: number;
    rielesPorCajon: number;
    jaladeraPorFrente: number;
    patasHasta600: number;
    patasMas600: number;
    colgadoresPorModuloAlto: number;
  };
}

export const DEFAULT_CONFIG: QuilmurConfig = {
  tablero: { largo: 2440, ancho: 2150 }, // 5,246 m² (sección 34)
  sierra: { kerf: 4, margen: 10, retazoMinimo: 200 },
  reglas: {
    espesor: 18,
    espesorFondo: 6,
    holguraPuerta: 4,
    separacionFrentes: 3,
    holguraRepisa: 2,
    retranqueoRepisa: 20,
    alturaZocalo: 100,
    alturaLateralCajon: 120,
    descuentoProfCajon: 70,
    desperdicioCantoPct: 10,
  },
  precios: {
    tableroColor: 95,
    tableroBlanco: 60,
    herrajePequeno: 2,
    herrajeMediano: 5,
    jaladera: 2.5,
    cantoMetro: 0.3,
  },
  herrajes: {
    bisagrasPorAltura: [
      { hasta: 900, cantidad: 2 },
      { hasta: 1600, cantidad: 3 },
      { hasta: 2000, cantidad: 4 },
      { hasta: 9999, cantidad: 5 },
    ],
    soportesPorRepisa: 4,
    rielesPorCajon: 1,
    jaladeraPorFrente: 1,
    patasHasta600: 4,
    patasMas600: 6,
    colgadoresPorModuloAlto: 2,
  },
};

export async function getConfig(): Promise<QuilmurConfig> {
  const row = await db.config.findUnique({ where: { id: "global" } });
  if (!row) return DEFAULT_CONFIG;
  try {
    // merge superficial por sección para tolerar configs guardadas con versiones previas
    const saved = JSON.parse(row.json);
    return {
      tablero: { ...DEFAULT_CONFIG.tablero, ...saved.tablero },
      sierra: { ...DEFAULT_CONFIG.sierra, ...saved.sierra },
      reglas: { ...DEFAULT_CONFIG.reglas, ...saved.reglas },
      precios: { ...DEFAULT_CONFIG.precios, ...saved.precios },
      herrajes: { ...DEFAULT_CONFIG.herrajes, ...saved.herrajes },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(cfg: QuilmurConfig) {
  const json = JSON.stringify(cfg);
  await db.config.upsert({
    where: { id: "global" },
    create: { id: "global", json },
    update: { json },
  });
}

export function areaTableroM2(cfg: QuilmurConfig) {
  return (cfg.tablero.largo * cfg.tablero.ancho) / 1_000_000;
}
