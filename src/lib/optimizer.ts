import type { QuilmurConfig } from "./config";

// Optimizador bidimensional de corte (sección 35): heurística de estantes
// (guillotina FFDH) por grupo de material/color/espesor, con kerf de sierra,
// márgenes, control de veta y detección de retazos reutilizables.

export interface PiezaCorte {
  label: string;
  largo: number;
  ancho: number;
  cantidad: number;
  material: string;
  color: string;
  espesor: number;
  veta: boolean;
  productoId: string;
  productoNombre: string;
  moduloCodigo: string;
}

export interface Placement {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  moduloCodigo: string;
  productoId: string;
  rotada: boolean;
}

export interface TableroPlan {
  placements: Placement[];
  areaUsada: number; // mm²
}

export interface GrupoPlan {
  material: string;
  color: string;
  espesor: number;
  tableros: TableroPlan[];
  areaPiezas: number; // mm²
  aprovechamiento: number; // 0-1
  retazos: { largo: number; ancho: number }[];
  // área de piezas por producto terminado, para distribuir consumo y merma
  areaPorProducto: Record<string, number>;
}

export interface CutPlan {
  grupos: GrupoPlan[];
  tablero: { largo: number; ancho: number };
  generado: string;
}

interface Shelf {
  y: number;
  height: number;
  usedWidth: number;
}

interface Board {
  shelves: Shelf[];
  usedHeight: number;
  placements: Placement[];
}

export function optimizar(piezas: PiezaCorte[], cfg: QuilmurConfig): CutPlan {
  const kerf = cfg.sierra.kerf;
  const usableL = cfg.tablero.largo - 2 * cfg.sierra.margen;
  const usableA = cfg.tablero.ancho - 2 * cfg.sierra.margen;

  const grupos = new Map<string, PiezaCorte[]>();
  for (const p of piezas) {
    const key = `${p.material}|${p.color}|${p.espesor}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(p);
  }

  const result: GrupoPlan[] = [];

  for (const [key, lista] of grupos) {
    const [material, color, espesorStr] = key.split("|");
    // expandir por cantidad
    const items: (Omit<PiezaCorte, "cantidad"> & { w: number; h: number })[] = [];
    const areaPorProducto: Record<string, number> = {};
    let areaPiezas = 0;
    for (const p of lista) {
      for (let i = 0; i < p.cantidad; i++) {
        // orientación base: largo de la pieza a lo largo del tablero (veta)
        let w = p.largo;
        let h = p.ancho;
        if (!p.veta && h > w) [w, h] = [h, w]; // sin veta: apaisar para estantes bajos
        items.push({ ...p, w, h });
        areaPiezas += p.largo * p.ancho;
        areaPorProducto[p.productoId] = (areaPorProducto[p.productoId] ?? 0) + p.largo * p.ancho;
      }
    }
    // FFDH: ordenar por alto de estante descendente
    items.sort((a, b) => b.h - a.h || b.w - a.w);

    const boards: Board[] = [];
    for (const it of items) {
      let placed = false;
      let rotada = false;
      for (const board of boards) {
        for (const shelf of board.shelves) {
          let w = it.w;
          let h = it.h;
          let rot = false;
          const fits = (ww: number, hh: number) =>
            hh <= shelf.height && shelf.usedWidth + ww + kerf <= usableL;
          if (!fits(w, h) && !it.veta && fits(h, w)) {
            [w, h] = [h, w];
            rot = true;
          }
          if (fits(w, h)) {
            board.placements.push({
              x: shelf.usedWidth,
              y: shelf.y,
              w,
              h,
              label: it.label,
              moduloCodigo: it.moduloCodigo,
              productoId: it.productoId,
              rotada: rot,
            });
            shelf.usedWidth += w + kerf;
            placed = true;
            rotada = rot;
            break;
          }
        }
        if (placed) break;
        // estante nuevo en este tablero
        if (board.usedHeight + it.h + kerf <= usableA && it.w <= usableL) {
          const shelf: Shelf = { y: board.usedHeight, height: it.h, usedWidth: 0 };
          board.shelves.push(shelf);
          board.placements.push({
            x: 0,
            y: shelf.y,
            w: it.w,
            h: it.h,
            label: it.label,
            moduloCodigo: it.moduloCodigo,
            productoId: it.productoId,
            rotada,
          });
          shelf.usedWidth = it.w + kerf;
          board.usedHeight += it.h + kerf;
          placed = true;
          break;
        }
      }
      if (!placed) {
        // tablero nuevo
        const board: Board = { shelves: [], usedHeight: 0, placements: [] };
        const shelf: Shelf = { y: 0, height: it.h, usedWidth: it.w + kerf };
        board.shelves.push(shelf);
        board.placements.push({
          x: 0,
          y: 0,
          w: it.w,
          h: it.h,
          label: it.label,
          moduloCodigo: it.moduloCodigo,
          productoId: it.productoId,
          rotada: false,
        });
        board.usedHeight = it.h + kerf;
        boards.push(board);
      }
    }

    // retazos recuperables
    const retazos: { largo: number; ancho: number }[] = [];
    const min = cfg.sierra.retazoMinimo;
    for (const board of boards) {
      const restoAlto = usableA - board.usedHeight;
      if (restoAlto >= min) retazos.push({ largo: usableL, ancho: restoAlto });
      for (const shelf of board.shelves) {
        const restoAncho = usableL - shelf.usedWidth;
        if (restoAncho >= min && shelf.height >= min)
          retazos.push({ largo: restoAncho, ancho: shelf.height });
      }
    }

    const areaTablero = cfg.tablero.largo * cfg.tablero.ancho;
    result.push({
      material,
      color,
      espesor: +espesorStr,
      tableros: boards.map((b) => ({
        placements: b.placements,
        areaUsada: b.placements.reduce((s, p) => s + p.w * p.h, 0),
      })),
      areaPiezas,
      aprovechamiento: boards.length ? areaPiezas / (boards.length * areaTablero) : 0,
      retazos,
      areaPorProducto,
    });
  }

  return {
    grupos: result,
    tablero: cfg.tablero,
    generado: new Date().toISOString(),
  };
}
