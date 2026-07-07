import type { QuilmurConfig } from "./config";
import { getTemplate } from "./templates";

// Motor paramétrico de despiece (secciones 29-33 de la especificación).
// La IA nunca genera piezas: solo este motor de reglas lo hace, a partir de
// las medidas confirmadas del módulo y de la configuración editable.

export interface ModuloInput {
  codigo: string;
  nombre: string;
  tipo: string;
  ancho: number;
  alto: number;
  profundidad: number;
  cantidad: number;
  materialEstructura: string; // melamina_blanca | melamina_color
  materialFrentes: string;
  color: string; // color comercial de frentes
  colorEstructura: string; // color de estructura interna (si es tablero de color)
  espesor: number;
  puertas: number;
  cajones: number;
  repisas: number;
  lateralVisto: boolean;
}

export interface GeneratedPieza {
  nombre: string;
  cantidad: number; // por unidad de módulo
  largo: number;
  ancho: number;
  espesor: number;
  material: string;
  color: string;
  veta: boolean;
  cantos: string; // "1L0A" = 1 lado largo con canto, 0 lados anchos
}

export interface HerrajeItem {
  nombre: string;
  categoria: "pequeno" | "mediano" | "jaladera";
  cantidad: number;
}

const canto = (l: number, a: number) => `${l}L${a}A`;

export function parseCantos(c: string): { l: number; a: number } {
  const m = c.match(/^(\d)L(\d)A$/);
  return m ? { l: +m[1], a: +m[2] } : { l: 0, a: 0 };
}

export function metrosCantoPieza(p: { cantidad: number; largo: number; ancho: number; cantos: string }): number {
  const { l, a } = parseCantos(p.cantos);
  return (p.cantidad * (l * p.largo + a * p.ancho)) / 1000;
}

export function generarDespiece(
  m: ModuloInput,
  cfg: QuilmurConfig
): { piezas: GeneratedPieza[]; herrajes: HerrajeItem[] } {
  const t = getTemplate(m.tipo);
  const r = cfg.reglas;
  const e = m.espesor || r.espesor;
  const piezas: GeneratedPieza[] = [];

  const cuerpo = m.alto - (t.zocalo ? r.alturaZocalo : 0);
  const anchoInterior = m.ancho - 2 * e;
  // color de estructura interna (puede ser tablero de color distinto al de frentes)
  const colorEstructura =
    m.materialEstructura === "melamina_color" ? m.colorEstructura || m.color : "Blanco";
  const colorFrentes = m.materialFrentes === "melamina_color" ? m.color : "Blanco";

  const add = (
    nombre: string,
    cantidad: number,
    largo: number,
    ancho: number,
    opts: Partial<Pick<GeneratedPieza, "espesor" | "material" | "veta" | "cantos">> & {
      frente?: boolean;
    } = {}
  ) => {
    if (cantidad <= 0 || largo <= 0 || ancho <= 0) return;
    const material = opts.material ?? m.materialEstructura;
    const color = opts.frente
      ? colorFrentes
      : material === "melamina_blanca"
        ? "Blanco"
        : colorEstructura;
    piezas.push({
      nombre,
      cantidad,
      largo: Math.round(largo),
      ancho: Math.round(ancho),
      espesor: opts.espesor ?? e,
      material,
      color,
      veta: opts.veta ?? false,
      cantos: opts.cantos ?? canto(0, 0),
    });
  };

  // ---- Estructura ----
  add("Lateral", 2, cuerpo, m.profundidad, {
    cantos: canto(1, 0), // canto en el frente
    material: m.lateralVisto ? m.materialFrentes : m.materialEstructura,
    veta: m.lateralVisto,
    frente: m.lateralVisto,
  });
  add("Piso", 1, anchoInterior, m.profundidad, { cantos: canto(1, 0) });
  if (t.sinTecho) {
    add("Travesaño", 2, anchoInterior, 100, { cantos: canto(1, 0) });
  } else {
    add("Techo", 1, anchoInterior, m.profundidad, { cantos: canto(1, 0) });
  }
  if (m.repisas > 0) {
    add(
      "Repisa",
      m.repisas,
      anchoInterior - r.holguraRepisa,
      m.profundidad - r.retranqueoRepisa,
      { cantos: canto(1, 0) }
    );
  }
  // Fondo aplicado en espesor delgado, melamina blanca
  add("Fondo", 1, m.ancho, cuerpo, {
    espesor: r.espesorFondo,
    material: "melamina_blanca",
  });
  if (t.zocalo) {
    add("Zócalo", 1, anchoInterior, r.alturaZocalo, { cantos: canto(1, 0) });
  }

  // ---- Frentes: reparto vertical entre cajones (arriba) y puertas ----
  const altoFrentes = t.zocalo ? cuerpo : m.alto;
  const ALTO_FRENTE_CAJON = 200; // zona por cajón cuando convive con puertas
  const zonaCajones =
    m.cajones > 0 && m.puertas > 0
      ? m.cajones * ALTO_FRENTE_CAJON
      : m.cajones > 0
        ? altoFrentes
        : 0;
  const zonaPuertas = altoFrentes - zonaCajones;

  if (m.puertas > 0 && zonaPuertas > 0) {
    const anchoPuerta =
      (m.ancho - (m.puertas - 1) * r.separacionFrentes) / m.puertas - r.holguraPuerta;
    const altoPuerta = zonaPuertas - r.holguraPuerta;
    add("Puerta", m.puertas, altoPuerta, anchoPuerta, {
      material: m.materialFrentes,
      veta: true,
      cantos: canto(2, 2), // canto en los 4 lados
      frente: true,
    });
  }

  if (m.cajones > 0) {
    const altoFrenteCajon =
      zonaCajones / m.cajones - r.separacionFrentes;
    add("Frente de cajón", m.cajones, m.ancho - r.holguraPuerta, altoFrenteCajon, {
      material: m.materialFrentes,
      veta: true,
      cantos: canto(2, 2),
      frente: true,
    });
    const profCajon = m.profundidad - r.descuentoProfCajon;
    add("Lateral de cajón", m.cajones * 2, profCajon, r.alturaLateralCajon, {
      material: "melamina_blanca",
      cantos: canto(1, 0),
    });
    add("Frente/trasera interna de cajón", m.cajones * 2, anchoInterior - 26, r.alturaLateralCajon, {
      material: "melamina_blanca",
      cantos: canto(1, 0),
    });
    add("Piso de cajón", m.cajones, anchoInterior - 26, profCajon, {
      espesor: r.espesorFondo,
      material: "melamina_blanca",
    });
  }

  // ---- Herrajes (sección 33) ----
  const h = cfg.herrajes;
  const herrajes: HerrajeItem[] = [];
  const addH = (nombre: string, categoria: HerrajeItem["categoria"], cantidad: number) => {
    if (cantidad > 0) herrajes.push({ nombre, categoria, cantidad });
  };
  if (m.puertas > 0 && zonaPuertas > 0) {
    const altoPuerta = zonaPuertas - r.holguraPuerta;
    const regla = h.bisagrasPorAltura.find((b) => altoPuerta <= b.hasta);
    addH("Bisagra", "pequeno", m.puertas * (regla?.cantidad ?? 2));
  }
  addH("Juego de rieles", "mediano", m.cajones * h.rielesPorCajon);
  addH("Jaladera", "jaladera", (m.puertas + m.cajones) * h.jaladeraPorFrente);
  addH("Soporte de repisa", "pequeno", m.repisas * h.soportesPorRepisa);
  if (t.zocalo) addH("Pata niveladora", "pequeno", m.ancho <= 600 ? h.patasHasta600 : h.patasMas600);
  if (t.colgado) addH("Colgador", "pequeno", h.colgadoresPorModuloAlto);

  return { piezas, herrajes };
}

export function precioHerraje(categoria: string, cfg: QuilmurConfig): number {
  if (categoria === "mediano") return cfg.precios.herrajeMediano;
  if (categoria === "jaladera") return cfg.precios.jaladera;
  return cfg.precios.herrajePequeno;
}
