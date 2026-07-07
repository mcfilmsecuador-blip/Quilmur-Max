// Importa el caso real "ARCHIVO DE PRODUCCIÓN COCINA DIEGO MONGE.pdf" con la
// extracción multimodal realizada por Claude sobre las 12 páginas del documento.
// Ejecutar: npx tsx scripts/import-diego-monge.mts "<ruta al PDF>"
import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { PDFDocument } from "pdf-lib";
import { db } from "../src/lib/db";
import { persistirExtraccion, type ExtraccionPDF } from "../src/lib/analyze";

const M = (
  codigo: string, nombre: string, tipo: string,
  ancho: number, alto: number, profundidad: number,
  opts: Partial<ExtraccionPDF["ambientes"][0]["productos"][0]["modulos"][0]> = {}
) => ({
  codigo, nombre, tipo, ancho, alto, profundidad,
  cantidad: 1,
  color: "Gris Matt Soft",
  colorEstructura: "Plomo mate",
  materialEstructura: "melamina_color",
  materialFrentes: "melamina_color",
  puertas: 0, cajones: 0, repisas: 0,
  lateralVisto: false, observaciones: "",
  confianza: "MEDIA" as const, pagina: 6,
  ...opts,
});

const NEGRO = { color: "Negro Matt Soft", colorEstructura: "Negro normal" };

const extraccion: ExtraccionPDF = {
  datosGenerales: {
    proyecto: "Propuesta Sr. Diego Monje",
    cliente: "Diego Monje",
    disenador: "Quilmur Home",
    version: "1",
    paginas: [
      { numero: 1, categorias: ["portada"] },
      { numero: 2, categorias: ["accesorios"] },
      { numero: 3, categorias: ["electrodomesticos", "ficha_tecnica"] },
      { numero: 4, categorias: ["electrodomesticos", "ficha_tecnica"] },
      { numero: 5, categorias: ["electrodomesticos", "ficha_tecnica"] },
      { numero: 6, categorias: ["planta"] },
      { numero: 7, categorias: ["planta"] },
      { numero: 8, categorias: ["elevacion", "observaciones"] },
      { numero: 9, categorias: ["elevacion"] },
      { numero: 10, categorias: ["render", "materiales", "observaciones"] },
      { numero: 11, categorias: ["render", "materiales"] },
      { numero: 12, categorias: ["render", "materiales"] },
    ],
  },
  ambientes: [
    {
      nombre: "Cocina",
      confianza: "ALTA",
      pagina: 6,
      productos: [
        {
          nombre: "Muebles bajos de pared — 2,88 metros lineales",
          unidad: "metro lineal",
          cantidad: 2.88,
          confianza: "ALTA",
          modulos: [
            M("MB01", "Mueble bajo 1 puerta 1 repisa", "bajo_1p", 330, 900, 560, {
              puertas: 1, repisas: 1, confianza: "ALTA",
              observaciones: "Profundidad no acotada en el PDF (asumida 560).",
            }),
            M("MB02", "Mueble bajo condimentero", "bajo_condimentero", 330, 900, 560, {
              puertas: 1, pagina: 6, confianza: "ALTA",
              observaciones: "Condimentero extraíble MOD 30 (pág. 2).",
            }),
            M("MB03", "Mueble bajo encimera 2 cajones", "bajo_cajones", 900, 900, 560, {
              cajones: 2, confianza: "ALTA",
              observaciones:
                "Encimera de inducción empotrada arriba (hueco 860×490, pág. 5). Portacubiertos MOD 90 en cajón superior (pág. 2).",
            }),
            M("MB04", "Mueble bajo 2 cajones", "bajo_cajones", 660, 900, 560, {
              cajones: 2, confianza: "ALTA",
            }),
            M("MB05", "Mueble bajo 2 puertas 1 repisa", "bajo_2p", 660, 900, 560, {
              puertas: 2, repisas: 1, confianza: "ALTA",
            }),
          ],
        },
        {
          nombre: "Muebles altos primera altura — 2,88 metros lineales",
          unidad: "metro lineal",
          cantidad: 2.88,
          confianza: "MEDIA",
          modulos: [
            M("MA01", "Mueble alto 1 puerta de vidrio", "alto_1p", 660, 700, 350, {
              puertas: 1, pagina: 7, confianza: "MEDIA",
              observaciones: "Puerta de vidrio bronce (pág. 10). Alto/prof no acotados: 700/350 asumidos; más profundo para tira LED (pág. 8).",
            }),
            M("MA02", "Mueble alto para extractor", "alto_extractor", 900, 700, 350, {
              puertas: 1, pagina: 8, confianza: "MEDIA",
              observaciones:
                "Extractor escondido (campana Teka GFI 97350, kit para muebles de 31-36 cm de prof.). Puerta con pistón, más alta para dejar visibles los mandos (pág. 8).",
            }),
            M("MA03", "Mueble alto 1 puerta con pistón", "alto_1p", 660, 700, 350, {
              puertas: 1, pagina: 7, confianza: "MEDIA",
              observaciones: "Puerta con pistón (pág. 10).",
            }),
            M("MA04", "Mueble alto 1 puerta de vidrio", "alto_1p", 660, 700, 350, {
              puertas: 1, pagina: 7, confianza: "MEDIA",
              observaciones: "Puerta de vidrio bronce (pág. 10).",
            }),
          ],
        },
        {
          nombre: "Muebles altos doble altura — 2,88 metros lineales",
          unidad: "metro lineal",
          cantidad: 2.88,
          confianza: "MEDIA",
          modulos: [
            M("MD01", "Mueble alto doble altura 1 puerta", "alto_1p", 480, 700, 320, {
              ...NEGRO, puertas: 1, pagina: 7, confianza: "MEDIA",
              observaciones: "Puertas pasadas (pág. 8). Alto de segunda altura no acotado (700 asumido).",
            }),
            M("MD02", "Mueble alto doble altura 2 puertas", "alto_2p", 960, 700, 320, {
              ...NEGRO, puertas: 2, pagina: 7, confianza: "MEDIA",
              observaciones: "Puertas pasadas (pág. 8).",
            }),
            M("MD03", "Mueble alto doble altura 2 puertas", "alto_2p", 960, 700, 320, {
              ...NEGRO, puertas: 2, pagina: 7, confianza: "MEDIA",
              observaciones: "Puertas pasadas (pág. 8).",
            }),
            M("MD04", "Mueble alto doble altura 1 puerta", "alto_1p", 480, 700, 320, {
              ...NEGRO, puertas: 1, pagina: 7, confianza: "MEDIA",
              observaciones: "Puertas pasadas (pág. 8).",
            }),
          ],
        },
        {
          nombre: "Torre de hornos",
          unidad: "mueble",
          cantidad: 1,
          confianza: "ALTA",
          modulos: [
            M("TH01", "Torre de hornos 4 puertas 2 repisas", "torre_hornos", 650, 2340, 580, {
              ...NEGRO, puertas: 4, repisas: 2, lateralVisto: true, pagina: 6, confianza: "MEDIA",
              observaciones:
                "Empotrar horno Teka HSB (hueco mín. 560×590×580, pág. 4) y microondas. Alto total no acotado (2340 asumido); revisar alturas del levantamiento (pág. 8).",
            }),
          ],
        },
        {
          nombre: "Módulo refrigeradora",
          unidad: "mueble",
          cantidad: 1,
          confianza: "MEDIA",
          modulos: [
            M("REF01", "Módulo para refrigeradora", "modulo_refri", 950, 2340, 700, {
              ...NEGRO, pagina: 6, confianza: "BAJA",
              observaciones:
                "Estructura metálica para refri de 8,5 cm de alto (pág. 8). Puertas pasadas encima. Refrigerador del cliente como referencia dimensional.",
            }),
          ],
        },
        {
          nombre: "Repisero decorativo",
          unidad: "mueble",
          cantidad: 1,
          confianza: "MEDIA",
          modulos: [
            M("RD01", "Repisero decorativo 4 repisas", "estanteria_abierta", 400, 2340, 350, {
              ...NEGRO, puertas: 1, repisas: 4, lateralVisto: true, pagina: 6, confianza: "BAJA",
              observaciones:
                "Puerta de vidrio bronce. Ranuras de iluminación solo en laterales (pág. 10). Tiras de luz a la mitad del módulo (pág. 8). Alto/prof no acotados.",
            }),
          ],
        },
        {
          nombre: "Isla — 3,69 metros lineales",
          unidad: "metro lineal",
          cantidad: 3.69,
          confianza: "ALTA",
          modulos: [
            M("IS01", "Mueble bajo fregadero 2 puertas", "bajo_fregadero", 900, 900, 600, {
              puertas: 2, pagina: 9, confianza: "ALTA",
              observaciones: "Triturador Teka TRS 520 bajo el fregadero (pág. 4).",
            }),
            M("IS02", "Mueble bajo basurero extraíble", "bajo_basurero", 465, 900, 600, {
              puertas: 1, pagina: 9, confianza: "ALTA",
              observaciones: "Basurero doble extraíble MOD 40 (pág. 2).",
            }),
            M("IS03", "Mueble bajo 1 puerta 1 repisa", "bajo_1p", 465, 900, 600, {
              puertas: 1, repisas: 1, pagina: 9, confianza: "ALTA",
            }),
            M("IS04", "Mueble bajo 3 cajones", "bajo_cajones", 615, 900, 600, {
              cajones: 3, pagina: 9, confianza: "ALTA",
            }),
            M("IS05", "Mueble bajo 3 cajones", "bajo_cajones", 615, 900, 600, {
              cajones: 3, pagina: 9, confianza: "ALTA",
            }),
            M("IS06", "Mueble bajo vinera + 1 cajón", "bajo_cajones", 300, 900, 600, {
              cajones: 1, lateralVisto: true, pagina: 9, confianza: "MEDIA",
              observaciones:
                "Vinera Teka RVC 10008 GBK empotrada arriba (475×260×495, pág. 5); cajón inferior. Encimera volada 30 cm; trastapa con 4 divisiones (págs. 9-10).",
            }),
          ],
        },
      ],
    },
  ],
  electrodomesticos: [
    { categoria: "Campana integrable", marca: "Teka", modelo: "INTEGRA GFI 97350 EOS", ancho: 892, alto: 305, profundidad: 302, origen: "QUILMUR", confianza: "ALTA", pagina: 3 },
    { categoria: "Horno empotrable", marca: "Teka", modelo: "HSB (70 L HydroClean)", ancho: 595, alto: 595, profundidad: 537, origen: "QUILMUR", confianza: "ALTA", pagina: 4 },
    { categoria: "Triturador de residuos", marca: "Teka", modelo: "TRS 520", ancho: 160, alto: 361, profundidad: 160, origen: "QUILMUR", confianza: "ALTA", pagina: 4 },
    { categoria: "Encimera de inducción", marca: "Teka", modelo: "IZF 99700 MST BK", ancho: 900, alto: 57, profundidad: 510, origen: "QUILMUR", confianza: "ALTA", pagina: 5 },
    { categoria: "Vinera 8 botellas", marca: "Teka", modelo: "RVC 10008 GBK", ancho: 260, alto: 475, profundidad: 495, origen: "QUILMUR", confianza: "ALTA", pagina: 5 },
    { categoria: "Refrigeradora", marca: "", modelo: "", ancho: 950, alto: 0, profundidad: 700, origen: "CLIENTE", confianza: "BAJA", pagina: 6 },
    { categoria: "Microondas empotrable", marca: "Teka", modelo: "", ancho: 595, alto: 388, profundidad: 334, origen: "REFERENCIA", confianza: "MEDIA", pagina: 8 },
  ],
  accesoriosExtras: [
    { nombre: "Basurero doble extraíble (MOD 40)", categoria: "Extraíble", cantidad: 1, unidad: "unidad", moduloRef: "IS02", confianza: "ALTA", pagina: 2 },
    { nombre: "Condimentero extraíble (MOD 30)", categoria: "Extraíble", cantidad: 1, unidad: "unidad", moduloRef: "MB02", confianza: "ALTA", pagina: 2 },
    { nombre: "Portacubiertos (MOD 90)", categoria: "Organizador", cantidad: 1, unidad: "unidad", moduloRef: "MB03", confianza: "ALTA", pagina: 2 },
    { nombre: "Puerta con vidrio bronce", categoria: "Vidrio", cantidad: 3, unidad: "unidad", moduloRef: "", confianza: "MEDIA", pagina: 10 },
    { nombre: "Pistón para puerta", categoria: "Herraje especial", cantidad: 2, unidad: "unidad", moduloRef: "", confianza: "MEDIA", pagina: 10 },
    { nombre: "Tira LED cálida", categoria: "Iluminación", cantidad: 6, unidad: "metro", moduloRef: "", confianza: "BAJA", pagina: 8 },
    { nombre: "Estructura metálica para refrigeradora (h 8,5 cm)", categoria: "Estructura metálica", cantidad: 1, unidad: "unidad", moduloRef: "REF01", confianza: "ALTA", pagina: 8 },
  ],
  observaciones: [
    { texto: "Todo el mobiliario va con tablero de color como estructura interna: para Gris Matt Soft usar Plomo mate; para Negro Matt Soft usar Negro normal.", moduloRef: "", confianza: "ALTA", pagina: 8 },
    { texto: "Base doble en muebles altos para iluminación y tomacorrientes, como manda el Arq. Cisneros.", moduloRef: "", confianza: "ALTA", pagina: 8 },
    { texto: "Revisar alturas del levantamiento antes de fabricar.", moduloRef: "", confianza: "ALTA", pagina: 8 },
    { texto: "Muebles altos de primera altura más profundos para pasar la tira LED por detrás del extractor.", moduloRef: "MA02", confianza: "ALTA", pagina: 8 },
    { texto: "Extractor escondido: puerta con pistón, más alta para dejar visibles los mandos.", moduloRef: "MA02", confianza: "ALTA", pagina: 8 },
    { texto: "Iluminación cálida bajo muebles altos; tiras de luz a la mitad del módulo en el repisero.", moduloRef: "RD01", confianza: "ALTA", pagina: 8 },
    { texto: "Vidrio bronce en todas las puertas de vidrio.", moduloRef: "", confianza: "ALTA", pagina: 10 },
    { texto: "Ranuras de iluminación solo en laterales del repisero decorativo.", moduloRef: "RD01", confianza: "ALTA", pagina: 10 },
    { texto: "Encimera de la isla volada 30 cm para barra.", moduloRef: "", confianza: "ALTA", pagina: 9 },
    { texto: "Trastapa de la isla con 4 divisiones, separación mínima entre tableros.", moduloRef: "", confianza: "ALTA", pagina: 10 },
    { texto: "Todas las puertas de los módulos de doble altura pasadas.", moduloRef: "", confianza: "ALTA", pagina: 8 },
    { texto: "Profundidades de bajos (560/600) y altos de doble altura no acotadas en el PDF: confirmar antes del despiece.", moduloRef: "", confianza: "MEDIA", pagina: 6 },
  ],
};

async function main() {
  const srcPdf = process.argv[2];
  if (!srcPdf) throw new Error("Uso: npx tsx scripts/import-diego-monge.mts <ruta al PDF>");
  const bytes = await fs.readFile(srcPdf);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const proyecto = await db.project.create({
    data: { nombre: "Cocina Diego Monje", cliente: "Diego Monje", disenador: "Quilmur Home" },
  });
  const blob = await put(`pdfs/${proyecto.id}-v1.pdf`, bytes, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
  });
  await db.project.update({
    where: { id: proyecto.id },
    data: {
      pdfUrl: blob.url,
      pdfBlobPath: blob.pathname,
      pdfNombre: path.basename(srcPdf),
      pdfPaginas: doc.getPageCount(),
      estado: "PDF_CARGADO",
    },
  });
  await persistirExtraccion(proyecto.id, extraccion, false);
  console.log("Proyecto importado:", proyecto.id);
  console.log("URL: /proyectos/" + proyecto.id + "/revision");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
