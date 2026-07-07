import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { MODULE_TEMPLATES, getTemplate } from "./templates";

// Análisis multimodal del PDF técnico (secciones 7-23). La IA interpreta el
// documento y propone la estructura del proyecto con nivel de confianza y
// página de origen. Nunca genera piezas: eso lo hace el motor de reglas.
// Sin ANTHROPIC_API_KEY el análisis corre en modo DEMO con datos de ejemplo.

type Conf = "ALTA" | "MEDIA" | "BAJA" | "NO_IDENTIFICADO";

export interface ExtraccionPDF {
  datosGenerales: {
    proyecto?: string;
    cliente?: string;
    disenador?: string;
    fecha?: string;
    version?: string;
    paginas?: { numero: number; categorias: string[] }[];
  };
  ambientes: {
    nombre: string;
    confianza: Conf;
    pagina: number;
    productos: {
      nombre: string;
      unidad: string;
      cantidad: number;
      confianza: Conf;
      modulos: {
        codigo: string;
        nombre: string;
        tipo: string;
        ancho: number;
        alto: number;
        profundidad: number;
        cantidad: number;
        color: string;
        colorEstructura?: string;
        materialEstructura: string;
        materialFrentes: string;
        puertas: number;
        cajones: number;
        repisas: number;
        lateralVisto: boolean;
        observaciones: string;
        confianza: Conf;
        pagina: number;
      }[];
    }[];
  }[];
  electrodomesticos: {
    categoria: string;
    marca: string;
    modelo: string;
    ancho: number;
    alto: number;
    profundidad: number;
    origen: "QUILMUR" | "CLIENTE" | "REFERENCIA";
    confianza: Conf;
    pagina: number;
  }[];
  accesoriosExtras: {
    nombre: string;
    categoria: string;
    cantidad: number;
    unidad: string;
    moduloRef: string;
    confianza: Conf;
    pagina: number;
  }[];
  observaciones: { texto: string; moduloRef: string; confianza: Conf; pagina: number }[];
}

const TIPOS_VALIDOS = MODULE_TEMPLATES.map((t) => `- ${t.key}: ${t.nombre} (${t.categoria})`).join("\n");

const PROMPT = `Eres el analista técnico de Quilmur, fabricante de mobiliario de melamina.
Analiza TODAS las páginas del PDF técnico adjunto (plantas, elevaciones, cortes, renders,
fichas técnicas, páginas de accesorios y observaciones constructivas) y extrae la estructura
productiva completa. Relaciona la información distribuida entre páginas: la planta define
ubicación, la elevación define ancho/alto, el render define acabados, las fichas definen
medidas de electrodomésticos.

Reglas estrictas:
- NO inventes medidas. Si una medida no aparece, usa 0 y confianza "NO_IDENTIFICADO".
- Todas las medidas en MILÍMETROS (convierte cm y m).
- Cada dato lleva "confianza" (ALTA | MEDIA | BAJA | NO_IDENTIFICADO) y "pagina" de origen (1-indexada).
- "tipo" de cada módulo debe ser una de estas claves de la biblioteca:
${TIPOS_VALIDOS}
- Agrupa los módulos en productos terminados (ej. "5,50 metros lineales de mueble bajo",
  "Torre de hornos", "Isla completa"); unidad: "metro lineal" | "mueble" | "unidad" | "conjunto".
- materialEstructura y materialFrentes: "melamina_blanca" o "melamina_color".
- "color": nombre comercial de los FRENTES escrito en el PDF (ej. "Negro Matt Soft"); no lo estimes visualmente.
- "colorEstructura": color comercial de la estructura interna cuando el PDF indique tablero de color como estructura (ej. "Plomo mate"); vacío si la estructura es blanca.
- Electrodomésticos: origen QUILMUR (lo vende Quilmur), CLIENTE (lo provee el cliente) o REFERENCIA (solo referencia dimensional).
- Clasifica cada página en datosGenerales.paginas con categorías: portada, datos_generales, planta, elevacion, corte, accesorios, electrodomesticos, materiales, render, observaciones, ficha_tecnica, no_identificada.

Responde ÚNICAMENTE con un JSON válido con esta forma exacta:
{
  "datosGenerales": { "proyecto": "", "cliente": "", "disenador": "", "fecha": "", "version": "", "paginas": [{ "numero": 1, "categorias": ["portada"] }] },
  "ambientes": [{ "nombre": "", "confianza": "ALTA", "pagina": 1, "productos": [{ "nombre": "", "unidad": "metro lineal", "cantidad": 1, "confianza": "MEDIA", "modulos": [{ "codigo": "M01", "nombre": "", "tipo": "bajo_2p", "ancho": 0, "alto": 0, "profundidad": 0, "cantidad": 1, "color": "", "colorEstructura": "", "materialEstructura": "melamina_blanca", "materialFrentes": "melamina_color", "puertas": 2, "cajones": 0, "repisas": 1, "lateralVisto": false, "observaciones": "", "confianza": "MEDIA", "pagina": 2 }] }] }],
  "electrodomesticos": [{ "categoria": "", "marca": "", "modelo": "", "ancho": 0, "alto": 0, "profundidad": 0, "origen": "REFERENCIA", "confianza": "MEDIA", "pagina": 1 }],
  "accesoriosExtras": [{ "nombre": "", "categoria": "", "cantidad": 1, "unidad": "unidad", "moduloRef": "", "confianza": "MEDIA", "pagina": 1 }],
  "observaciones": [{ "texto": "", "moduloRef": "", "confianza": "ALTA", "pagina": 1 }]
}`;

export async function analizarPDF(pdfUrl: string): Promise<{ ext: ExtraccionPDF; demo: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ext: datosDemo(), demo: true };
  }
  const client = new Anthropic();
  const data = Buffer.from(await (await fetch(pdfUrl)).arrayBuffer());
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-fable-5",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error(
      "DEBUG analizarPDF: stop_reason=",
      resp.stop_reason,
      "usage=",
      JSON.stringify(resp.usage),
      "content_types=",
      resp.content.map((b) => b.type).join(","),
      "text_len=",
      text.length,
      "text_head=",
      text.slice(0, 500),
      "text_tail=",
      text.slice(-300)
    );
    throw new Error("La IA no devolvió JSON válido");
  }
  return { ext: JSON.parse(match[0]) as ExtraccionPDF, demo: false };
}

// Persiste la extracción como entidades revisables. Reemplaza el análisis previo.
export async function persistirExtraccion(projectId: string, ext: ExtraccionPDF, demo: boolean) {
  await db.$transaction(async (tx) => {
    await tx.ambiente.deleteMany({ where: { projectId } });
    await tx.electrodomestico.deleteMany({ where: { projectId } });
    await tx.accesorioExtra.deleteMany({ where: { projectId } });
    await tx.observacion.deleteMany({ where: { projectId } });

    for (const amb of ext.ambientes ?? []) {
      const a = await tx.ambiente.create({
        data: {
          projectId,
          nombre: amb.nombre || "Ambiente",
          confianza: amb.confianza ?? "MEDIA",
          pagina: amb.pagina ?? 0,
        },
      });
      for (const prod of amb.productos ?? []) {
        const p = await tx.producto.create({
          data: {
            ambienteId: a.id,
            nombre: prod.nombre || "Producto terminado",
            unidad: prod.unidad || "unidad",
            cantidad: prod.cantidad || 1,
            confianza: prod.confianza ?? "MEDIA",
          },
        });
        for (const mod of prod.modulos ?? []) {
          const tpl = getTemplate(mod.tipo);
          await tx.modulo.create({
            data: {
              productoId: p.id,
              codigo: mod.codigo || "",
              nombre: mod.nombre || tpl.nombre,
              tipo: tpl.key,
              ancho: mod.ancho || tpl.dimsDefault.ancho,
              alto: mod.alto || tpl.dimsDefault.alto,
              profundidad: mod.profundidad || tpl.dimsDefault.profundidad,
              cantidad: mod.cantidad || 1,
              materialEstructura: mod.materialEstructura || "melamina_blanca",
              materialFrentes: mod.materialFrentes || "melamina_color",
              color: mod.color || "",
              colorEstructura: mod.colorEstructura || "",
              puertas: mod.puertas ?? tpl.defaults.puertas,
              cajones: mod.cajones ?? tpl.defaults.cajones,
              repisas: mod.repisas ?? tpl.defaults.repisas,
              lateralVisto: mod.lateralVisto ?? false,
              observaciones: mod.observaciones || "",
              confianza: mod.confianza ?? "MEDIA",
              pagina: mod.pagina ?? 0,
              confirmado: false,
            },
          });
        }
      }
    }
    for (const e of ext.electrodomesticos ?? []) {
      await tx.electrodomestico.create({
        data: {
          projectId,
          categoria: e.categoria || "Electrodoméstico",
          marca: e.marca || "",
          modelo: e.modelo || "",
          ancho: e.ancho || 0,
          alto: e.alto || 0,
          profundidad: e.profundidad || 0,
          origen: e.origen || "REFERENCIA",
          confianza: e.confianza ?? "MEDIA",
          pagina: e.pagina ?? 0,
        },
      });
    }
    for (const acc of ext.accesoriosExtras ?? []) {
      await tx.accesorioExtra.create({
        data: {
          projectId,
          nombre: acc.nombre || "Accesorio",
          categoria: acc.categoria || "",
          cantidad: acc.cantidad || 1,
          unidad: acc.unidad || "unidad",
          moduloRef: acc.moduloRef || "",
          confianza: acc.confianza ?? "MEDIA",
          pagina: acc.pagina ?? 0,
        },
      });
    }
    for (const o of ext.observaciones ?? []) {
      await tx.observacion.create({
        data: {
          projectId,
          texto: o.texto,
          moduloRef: o.moduloRef || "",
          confianza: o.confianza ?? "MEDIA",
          pagina: o.pagina ?? 0,
        },
      });
    }
    await tx.project.update({
      where: { id: projectId },
      data: {
        estado: "ANALISIS_COMPLETADO",
        analisisDemo: demo,
        datosJson: JSON.stringify(ext.datosGenerales ?? {}),
        ...(ext.datosGenerales?.cliente ? { cliente: ext.datosGenerales.cliente } : {}),
        ...(ext.datosGenerales?.disenador ? { disenador: ext.datosGenerales.disenador } : {}),
      },
    });
  });
}

// Datos de ejemplo basados en el caso real de referencia (cocina residencial).
function datosDemo(): ExtraccionPDF {
  return {
    datosGenerales: {
      proyecto: "Cocina Diego Monje (DEMO)",
      cliente: "Diego Monje",
      disenador: "Quilmur Diseño",
      fecha: "2026-07-01",
      version: "1",
      paginas: [
        { numero: 1, categorias: ["portada"] },
        { numero: 2, categorias: ["planta"] },
        { numero: 3, categorias: ["elevacion", "observaciones"] },
        { numero: 4, categorias: ["accesorios"] },
        { numero: 5, categorias: ["ficha_tecnica", "electrodomesticos"] },
      ],
    },
    ambientes: [
      {
        nombre: "Cocina",
        confianza: "ALTA",
        pagina: 2,
        productos: [
          {
            nombre: "5,50 metros lineales de mueble bajo",
            unidad: "metro lineal",
            cantidad: 5.5,
            confianza: "MEDIA",
            modulos: [
              { codigo: "MB01", nombre: "Mueble bajo para fregadero", tipo: "bajo_fregadero", ancho: 900, alto: 850, profundidad: 560, cantidad: 1, color: "Gris Matt Soft", materialEstructura: "melamina_blanca", materialFrentes: "melamina_color", puertas: 2, cajones: 0, repisas: 0, lateralVisto: false, observaciones: "Prever triturador y sifón", confianza: "ALTA", pagina: 3 },
              { codigo: "MB02", nombre: "Mueble bajo con cajones", tipo: "bajo_cajones", ancho: 600, alto: 850, profundidad: 560, cantidad: 1, color: "Gris Matt Soft", materialEstructura: "melamina_blanca", materialFrentes: "melamina_color", puertas: 0, cajones: 3, repisas: 0, lateralVisto: false, observaciones: "", confianza: "ALTA", pagina: 3 },
              { codigo: "MB03", nombre: "Mueble bajo de dos puertas", tipo: "bajo_2p", ancho: 800, alto: 850, profundidad: 560, cantidad: 2, color: "Gris Matt Soft", materialEstructura: "melamina_blanca", materialFrentes: "melamina_color", puertas: 2, cajones: 0, repisas: 1, lateralVisto: false, observaciones: "", confianza: "MEDIA", pagina: 3 },
              { codigo: "MB04", nombre: "Mueble bajo para basurero", tipo: "bajo_basurero", ancho: 450, alto: 850, profundidad: 560, cantidad: 1, color: "Gris Matt Soft", materialEstructura: "melamina_blanca", materialFrentes: "melamina_color", puertas: 1, cajones: 0, repisas: 0, lateralVisto: true, observaciones: "Basurero doble extraíble", confianza: "MEDIA", pagina: 4 },
              { codigo: "MB05", nombre: "Mueble bajo con condimentero", tipo: "bajo_condimentero", ancho: 300, alto: 850, profundidad: 560, cantidad: 1, color: "Gris Matt Soft", materialEstructura: "melamina_blanca", materialFrentes: "melamina_color", puertas: 1, cajones: 0, repisas: 0, lateralVisto: false, observaciones: "Condimentero extraíble", confianza: "MEDIA", pagina: 4 },
            ],
          },
          {
            nombre: "5,30 metros lineales de mueble alto",
            unidad: "metro lineal",
            cantidad: 5.3,
            confianza: "MEDIA",
            modulos: [
              { codigo: "MA01", nombre: "Mueble alto de dos puertas", tipo: "alto_2p", ancho: 900, alto: 720, profundidad: 320, cantidad: 3, color: "Negro Matt Soft", materialEstructura: "melamina_blanca", materialFrentes: "melamina_color", puertas: 2, cajones: 0, repisas: 2, lateralVisto: false, observaciones: "Puertas con pistón", confianza: "MEDIA", pagina: 3 },
              { codigo: "MA02", nombre: "Mueble alto para extractor", tipo: "alto_extractor", ancho: 600, alto: 400, profundidad: 320, cantidad: 1, color: "Negro Matt Soft", materialEstructura: "melamina_blanca", materialFrentes: "melamina_color", puertas: 1, cajones: 0, repisas: 0, lateralVisto: false, observaciones: "Extractor escondido", confianza: "BAJA", pagina: 3 },
              { codigo: "MA03", nombre: "Mueble alto abatible", tipo: "alto_abatible", ancho: 900, alto: 400, profundidad: 320, cantidad: 2, color: "Negro Matt Soft", materialEstructura: "melamina_blanca", materialFrentes: "melamina_color", puertas: 1, cajones: 0, repisas: 0, lateralVisto: false, observaciones: "Apertura abatible con pistón", confianza: "MEDIA", pagina: 3 },
            ],
          },
          {
            nombre: "Torre de hornos",
            unidad: "mueble",
            cantidad: 1,
            confianza: "ALTA",
            modulos: [
              { codigo: "TH01", nombre: "Torre de hornos", tipo: "torre_hornos", ancho: 600, alto: 2100, profundidad: 580, cantidad: 1, color: "Negro Matt Soft", materialEstructura: "melamina_blanca", materialFrentes: "melamina_color", puertas: 1, cajones: 1, repisas: 1, lateralVisto: true, observaciones: "Empotrar horno y microondas; revisar ventilación", confianza: "ALTA", pagina: 5 },
            ],
          },
        ],
      },
    ],
    electrodomesticos: [
      { categoria: "Horno empotrable", marca: "Teka", modelo: "HSB 630", ancho: 595, alto: 595, profundidad: 537, origen: "CLIENTE", confianza: "ALTA", pagina: 5 },
      { categoria: "Microondas empotrable", marca: "Teka", modelo: "MB 620 BI", ancho: 595, alto: 388, profundidad: 334, origen: "CLIENTE", confianza: "ALTA", pagina: 5 },
      { categoria: "Encimera", marca: "Teka", modelo: "GZC 64320", ancho: 600, alto: 45, profundidad: 510, origen: "QUILMUR", confianza: "MEDIA", pagina: 5 },
      { categoria: "Extractor", marca: "Teka", modelo: "CNL 6415", ancho: 600, alto: 335, profundidad: 280, origen: "REFERENCIA", confianza: "MEDIA", pagina: 5 },
    ],
    accesoriosExtras: [
      { nombre: "Basurero doble extraíble", categoria: "Extraíble", cantidad: 1, unidad: "unidad", moduloRef: "MB04", confianza: "ALTA", pagina: 4 },
      { nombre: "Condimentero extraíble", categoria: "Extraíble", cantidad: 1, unidad: "unidad", moduloRef: "MB05", confianza: "ALTA", pagina: 4 },
      { nombre: "Portacubiertos", categoria: "Organizador", cantidad: 1, unidad: "unidad", moduloRef: "MB02", confianza: "MEDIA", pagina: 4 },
      { nombre: "Tira LED cálida", categoria: "Iluminación", cantidad: 5.3, unidad: "metro", moduloRef: "", confianza: "BAJA", pagina: 3 },
    ],
    observaciones: [
      { texto: "Puertas pasadas hasta el piso en muebles bajos", moduloRef: "", confianza: "MEDIA", pagina: 3 },
      { texto: "Iluminación cálida bajo muebles altos", moduloRef: "", confianza: "MEDIA", pagina: 3 },
      { texto: "Lateral visible en torre de hornos: usar tablero de color", moduloRef: "TH01", confianza: "ALTA", pagina: 3 },
    ],
  };
}
