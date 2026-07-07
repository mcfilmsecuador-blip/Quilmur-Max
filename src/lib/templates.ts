// Biblioteca inicial de módulos (sección 13 de la especificación).
// Cada plantilla define la geometría base; el motor de despiece (despiece.ts)
// genera las piezas a partir de estos parámetros + las medidas del módulo.

export interface ModuleTemplate {
  key: string;
  nombre: string;
  categoria: "Cocina" | "Clósets" | "Oficina" | "Hogar" | "Personalizados";
  zocalo: boolean; // mueble bajo con zócalo
  colgado: boolean; // mueble alto colgado (lleva colgadores)
  sinTecho: boolean; // p.ej. fregadero: travesaños en lugar de techo
  defaults: { puertas: number; cajones: number; repisas: number };
  dimsDefault: { ancho: number; alto: number; profundidad: number };
}

const T = (
  key: string,
  nombre: string,
  categoria: ModuleTemplate["categoria"],
  opts: Partial<
    Omit<ModuleTemplate, "key" | "nombre" | "categoria" | "defaults" | "dimsDefault">
  > & {
    defaults?: Partial<ModuleTemplate["defaults"]>;
    dimsDefault?: Partial<ModuleTemplate["dimsDefault"]>;
  } = {}
): ModuleTemplate => ({
  key,
  nombre,
  categoria,
  zocalo: opts.zocalo ?? false,
  colgado: opts.colgado ?? false,
  sinTecho: opts.sinTecho ?? false,
  defaults: { puertas: 0, cajones: 0, repisas: 0, ...opts.defaults },
  dimsDefault: { ancho: 600, alto: 720, profundidad: 560, ...opts.dimsDefault },
});

export const MODULE_TEMPLATES: ModuleTemplate[] = [
  // Cocina — bajos
  T("bajo_1p", "Mueble bajo de una puerta", "Cocina", { zocalo: true, defaults: { puertas: 1, repisas: 1 }, dimsDefault: { ancho: 450, alto: 850, profundidad: 560 } }),
  T("bajo_2p", "Mueble bajo de dos puertas", "Cocina", { zocalo: true, defaults: { puertas: 2, repisas: 1 }, dimsDefault: { ancho: 800, alto: 850, profundidad: 560 } }),
  T("bajo_cajones", "Mueble bajo con cajones", "Cocina", { zocalo: true, defaults: { cajones: 3 }, dimsDefault: { ancho: 600, alto: 850, profundidad: 560 } }),
  T("bajo_fregadero", "Mueble bajo para fregadero", "Cocina", { zocalo: true, sinTecho: true, defaults: { puertas: 2 }, dimsDefault: { ancho: 900, alto: 850, profundidad: 560 } }),
  T("bajo_basurero", "Mueble bajo para basurero", "Cocina", { zocalo: true, defaults: { puertas: 1 }, dimsDefault: { ancho: 450, alto: 850, profundidad: 560 } }),
  T("bajo_condimentero", "Mueble bajo con condimentero", "Cocina", { zocalo: true, defaults: { puertas: 1 }, dimsDefault: { ancho: 300, alto: 850, profundidad: 560 } }),
  T("bajo_esquina", "Módulo de esquina", "Cocina", { zocalo: true, defaults: { puertas: 1, repisas: 1 }, dimsDefault: { ancho: 900, alto: 850, profundidad: 900 } }),
  // Cocina — altos
  T("alto_1p", "Mueble alto de una puerta", "Cocina", { colgado: true, defaults: { puertas: 1, repisas: 2 }, dimsDefault: { ancho: 450, alto: 720, profundidad: 320 } }),
  T("alto_2p", "Mueble alto de dos puertas", "Cocina", { colgado: true, defaults: { puertas: 2, repisas: 2 }, dimsDefault: { ancho: 800, alto: 720, profundidad: 320 } }),
  T("alto_abatible", "Mueble alto abatible", "Cocina", { colgado: true, defaults: { puertas: 1 }, dimsDefault: { ancho: 900, alto: 400, profundidad: 320 } }),
  T("alto_extractor", "Mueble alto para extractor", "Cocina", { colgado: true, sinTecho: true, defaults: { puertas: 1 }, dimsDefault: { ancho: 600, alto: 400, profundidad: 320 } }),
  // Cocina — torres / otros
  T("torre_hornos", "Torre de hornos", "Cocina", { zocalo: true, defaults: { puertas: 1, cajones: 1, repisas: 1 }, dimsDefault: { ancho: 600, alto: 2100, profundidad: 580 } }),
  T("torre_despensa", "Torre de despensa", "Cocina", { zocalo: true, defaults: { puertas: 2, repisas: 4 }, dimsDefault: { ancho: 600, alto: 2100, profundidad: 580 } }),
  T("modulo_refri", "Módulo para refrigeradora", "Cocina", { defaults: { puertas: 1, repisas: 1 }, dimsDefault: { ancho: 950, alto: 2100, profundidad: 620 } }),
  T("isla", "Isla", "Cocina", { zocalo: true, defaults: { puertas: 2, cajones: 2, repisas: 1 }, dimsDefault: { ancho: 1800, alto: 850, profundidad: 900 } }),
  T("botellero", "Botellero", "Cocina", { zocalo: true, defaults: { repisas: 3 }, dimsDefault: { ancho: 300, alto: 850, profundidad: 560 } }),
  T("estanteria_abierta", "Estantería abierta", "Cocina", { defaults: { repisas: 3 }, dimsDefault: { ancho: 600, alto: 900, profundidad: 320 } }),
  // Clósets
  T("closet_colgado", "Módulo de colgado", "Clósets", { defaults: { repisas: 1 }, dimsDefault: { ancho: 900, alto: 2200, profundidad: 550 } }),
  T("closet_repisas", "Módulo con repisas", "Clósets", { defaults: { repisas: 5 }, dimsDefault: { ancho: 900, alto: 2200, profundidad: 550 } }),
  T("cajonera", "Cajonera", "Clósets", { defaults: { cajones: 4 }, dimsDefault: { ancho: 900, alto: 900, profundidad: 550 } }),
  T("zapatera", "Zapatera", "Clósets", { defaults: { repisas: 5 }, dimsDefault: { ancho: 900, alto: 1200, profundidad: 350 } }),
  T("maletero", "Maletero", "Clósets", { defaults: { puertas: 2 }, dimsDefault: { ancho: 900, alto: 500, profundidad: 550 } }),
  T("closet_puertas", "Módulo con puertas", "Clósets", { defaults: { puertas: 2, repisas: 4 }, dimsDefault: { ancho: 900, alto: 2200, profundidad: 550 } }),
  // Oficina
  T("escritorio", "Escritorio", "Oficina", { defaults: {}, dimsDefault: { ancho: 1400, alto: 750, profundidad: 600 } }),
  T("archivo", "Archivo", "Oficina", { defaults: { cajones: 3 }, dimsDefault: { ancho: 500, alto: 750, profundidad: 550 } }),
  T("cajonera_movil", "Cajonera móvil", "Oficina", { defaults: { cajones: 3 }, dimsDefault: { ancho: 420, alto: 600, profundidad: 500 } }),
  T("counter", "Counter", "Oficina", { zocalo: true, defaults: { puertas: 2, repisas: 1 }, dimsDefault: { ancho: 1800, alto: 1100, profundidad: 600 } }),
  T("credenza", "Credenza", "Oficina", { zocalo: true, defaults: { puertas: 3, repisas: 1 }, dimsDefault: { ancho: 1600, alto: 750, profundidad: 450 } }),
  T("biblioteca", "Biblioteca", "Oficina", { defaults: { repisas: 4 }, dimsDefault: { ancho: 900, alto: 1800, profundidad: 320 } }),
  T("aereo_oficina", "Mueble aéreo", "Oficina", { colgado: true, defaults: { puertas: 2, repisas: 1 }, dimsDefault: { ancho: 900, alto: 400, profundidad: 350 } }),
  // Hogar
  T("centro_entretenimiento", "Centro de entretenimiento", "Hogar", { defaults: { puertas: 2, repisas: 2, cajones: 2 }, dimsDefault: { ancho: 1800, alto: 1800, profundidad: 450 } }),
  T("mueble_tv", "Mueble de televisión", "Hogar", { zocalo: true, defaults: { puertas: 2, cajones: 1 }, dimsDefault: { ancho: 1600, alto: 500, profundidad: 400 } }),
  T("mueble_bano", "Mueble de baño", "Hogar", { colgado: true, defaults: { puertas: 2, repisas: 1 }, dimsDefault: { ancho: 800, alto: 550, profundidad: 460 } }),
  T("velador", "Velador", "Hogar", { defaults: { cajones: 2 }, dimsDefault: { ancho: 450, alto: 500, profundidad: 400 } }),
  T("estanteria", "Estantería", "Hogar", { defaults: { repisas: 4 }, dimsDefault: { ancho: 800, alto: 1800, profundidad: 300 } }),
  // Personalizados
  T("personalizado", "Módulo personalizado", "Personalizados", { defaults: { puertas: 0, cajones: 0, repisas: 0 } }),
];

export function getTemplate(key: string): ModuleTemplate {
  return (
    MODULE_TEMPLATES.find((t) => t.key === key) ??
    MODULE_TEMPLATES.find((t) => t.key === "personalizado")!
  );
}
