import type { QuilmurConfig } from "./config";
import { areaTableroM2 } from "./config";
import { generarDespiece, metrosCantoPieza, precioHerraje, type ModuloInput } from "./despiece";
import type { CutPlan } from "./optimizer";

// Consumos y costos por producto terminado (secciones 36-40):
// consumo teórico (área de piezas / área de tablero), consumo optimizado
// (tableros del plan de corte, distribuidos por proporción de área) y merma.

export interface ProyectoConDatos {
  id: string;
  cutPlanJson: string | null;
  ambientes: {
    id: string;
    nombre: string;
    productos: {
      id: string;
      nombre: string;
      unidad: string;
      cantidad: number;
      modulos: {
        id: string;
        codigo: string;
        nombre: string;
        tipo: string;
        ancho: number;
        alto: number;
        profundidad: number;
        cantidad: number;
        materialEstructura: string;
        materialFrentes: string;
        color: string;
        colorEstructura: string;
        espesor: number;
        puertas: number;
        cajones: number;
        repisas: number;
        lateralVisto: boolean;
        piezas: {
          nombre: string;
          cantidad: number;
          largo: number;
          ancho: number;
          espesor: number;
          material: string;
          color: string;
          veta: boolean;
          cantos: string;
        }[];
      }[];
    }[];
  }[];
  accesorios: {
    nombre: string;
    cantidad: number;
    precio: number;
    moduloRef: string;
  }[];
}

export interface ConsumoTablero {
  material: string;
  color: string;
  espesor: number;
  teorico: number;
  optimizado: number;
  merma: number;
  costo: number;
}

export interface CostoProducto {
  id: string;
  nombre: string;
  ambiente: string;
  unidad: string;
  cantidad: number;
  tableros: ConsumoTablero[];
  cantoMetros: number;
  cantoCosto: number;
  herrajes: { nombre: string; categoria: string; cantidad: number; costo: number }[];
  accesorios: { nombre: string; cantidad: number; costo: number }[];
  costoTotal: number;
}

export interface ResumenCostos {
  productos: CostoProducto[];
  accesoriosSinAsignar: { nombre: string; cantidad: number; costo: number }[];
  totalTableros: { material: string; color: string; espesor: number; cantidad: number }[];
  cantoMetrosTotal: number;
  costoTotal: number;
  tienePlanCorte: boolean;
}

function precioTablero(material: string, cfg: QuilmurConfig) {
  return material === "melamina_color" ? cfg.precios.tableroColor : cfg.precios.tableroBlanco;
}

export function calcularCostos(proyecto: ProyectoConDatos, cfg: QuilmurConfig): ResumenCostos {
  const areaTab = areaTableroM2(cfg);
  const cutPlan: CutPlan | null = proyecto.cutPlanJson ? JSON.parse(proyecto.cutPlanJson) : null;
  const productos: CostoProducto[] = [];

  // asignación de tableros optimizados por producto: proporción de área dentro de cada grupo
  const optimizadoPorProductoGrupo = new Map<string, number>(); // `${productoId}|${material}|${color}|${espesor}` -> tableros
  if (cutPlan) {
    for (const g of cutPlan.grupos) {
      const total = g.tableros.length;
      for (const [prodId, area] of Object.entries(g.areaPorProducto)) {
        const frac = g.areaPiezas > 0 ? area / g.areaPiezas : 0;
        optimizadoPorProductoGrupo.set(
          `${prodId}|${g.material}|${g.color}|${g.espesor}`,
          total * frac
        );
      }
    }
  }

  for (const amb of proyecto.ambientes) {
    for (const prod of amb.productos) {
      // áreas por material/color
      const areas = new Map<string, number>(); // m²
      let cantoMetros = 0;
      const herrajesMap = new Map<string, { nombre: string; categoria: string; cantidad: number }>();

      for (const mod of prod.modulos) {
        for (const p of mod.piezas) {
          const key = `${p.material}|${p.color}|${p.espesor}`;
          const area = (p.cantidad * mod.cantidad * p.largo * p.ancho) / 1_000_000;
          areas.set(key, (areas.get(key) ?? 0) + area);
          cantoMetros += metrosCantoPieza(p) * mod.cantidad;
        }
        // herrajes desde el motor de reglas (no se almacenan; siempre reflejan la regla vigente)
        const { herrajes } = generarDespiece(mod as ModuloInput, cfg);
        for (const h of herrajes) {
          const prev = herrajesMap.get(h.nombre);
          const cant = h.cantidad * mod.cantidad;
          if (prev) prev.cantidad += cant;
          else herrajesMap.set(h.nombre, { ...h, cantidad: cant });
        }
      }

      cantoMetros *= 1 + cfg.reglas.desperdicioCantoPct / 100;

      const tableros: ConsumoTablero[] = [];
      for (const [key, area] of areas) {
        const [material, color, espesorStr] = key.split("|");
        const teorico = area / areaTab;
        const optimizado =
          optimizadoPorProductoGrupo.get(`${prod.id}|${key}`) ?? teorico;
        tableros.push({
          material,
          color,
          espesor: +espesorStr,
          teorico,
          optimizado,
          merma: optimizado - teorico,
          costo: optimizado * precioTablero(material, cfg),
        });
      }

      const herrajes = [...herrajesMap.values()].map((h) => ({
        ...h,
        costo: h.cantidad * precioHerraje(h.categoria, cfg),
      }));

      const codigos = new Set(prod.modulos.map((mo) => mo.codigo).filter(Boolean));
      const accesorios = proyecto.accesorios
        .filter((a) => a.moduloRef && codigos.has(a.moduloRef))
        .map((a) => ({ nombre: a.nombre, cantidad: a.cantidad, costo: a.cantidad * a.precio }));

      const cantoCosto = cantoMetros * cfg.precios.cantoMetro;
      const costoTotal =
        tableros.reduce((s, tb) => s + tb.costo, 0) +
        cantoCosto +
        herrajes.reduce((s, h) => s + h.costo, 0) +
        accesorios.reduce((s, a) => s + a.costo, 0);

      productos.push({
        id: prod.id,
        nombre: prod.nombre,
        ambiente: amb.nombre,
        unidad: prod.unidad,
        cantidad: prod.cantidad,
        tableros,
        cantoMetros,
        cantoCosto,
        herrajes,
        accesorios,
        costoTotal,
      });
    }
  }

  const codigosAsignados = new Set(
    proyecto.ambientes.flatMap((a) =>
      a.productos.flatMap((p) => p.modulos.map((mo) => mo.codigo).filter(Boolean))
    )
  );
  const accesoriosSinAsignar = proyecto.accesorios
    .filter((a) => !a.moduloRef || !codigosAsignados.has(a.moduloRef))
    .map((a) => ({ nombre: a.nombre, cantidad: a.cantidad, costo: a.cantidad * a.precio }));

  // totales de tableros por grupo (con plan de corte: tableros físicos enteros)
  const totalMap = new Map<string, number>();
  if (cutPlan) {
    for (const g of cutPlan.grupos) {
      totalMap.set(`${g.material}|${g.color}|${g.espesor}`, g.tableros.length);
    }
  } else {
    for (const p of productos)
      for (const tb of p.tableros) {
        const k = `${tb.material}|${tb.color}|${tb.espesor}`;
        totalMap.set(k, (totalMap.get(k) ?? 0) + tb.teorico);
      }
  }
  const totalTableros = [...totalMap.entries()].map(([k, cantidad]) => {
    const [material, color, espesorStr] = k.split("|");
    return { material, color, espesor: +espesorStr, cantidad };
  });

  const costoTotal =
    productos.reduce((s, p) => s + p.costoTotal, 0) +
    accesoriosSinAsignar.reduce((s, a) => s + a.costo, 0);

  return {
    productos,
    accesoriosSinAsignar,
    totalTableros,
    cantoMetrosTotal: productos.reduce((s, p) => s + p.cantoMetros, 0),
    costoTotal,
    tienePlanCorte: !!cutPlan,
  };
}
