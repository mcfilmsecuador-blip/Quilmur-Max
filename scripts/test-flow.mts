// Prueba de flujo completo sin UI: análisis DEMO → persistencia → despiece →
// optimización → costos. Ejecutar: npx tsx scripts/test-flow.mts
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { db } from "../src/lib/db";
import { analizarPDF, persistirExtraccion } from "../src/lib/analyze";
import { generarDespiece } from "../src/lib/despiece";
import { optimizar, type PiezaCorte } from "../src/lib/optimizer";
import { calcularCostos, type ProyectoConDatos } from "../src/lib/costos";
import { getConfig } from "../src/lib/config";

async function main() {
  const cfg = await getConfig();

  // PDF de prueba de 5 páginas
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const textos = [
    "QUILMUR - Proyecto Cocina Diego Monje (portada)",
    "Plano en planta - cocina 3600 x 2800 mm",
    "Elevacion frontal - muebles bajos h=850, altos h=720",
    "Accesorios: basurero extraible, condimentero, portacubiertos",
    "Fichas tecnicas: horno Teka HSB 630, encimera GZC 64320",
  ];
  for (const t of textos) {
    const page = doc.addPage([595, 842]);
    page.drawText(t, { x: 40, y: 780, size: 14, font });
  }
  const pdfDir = path.join(process.cwd(), "data", "pdfs");
  await fs.mkdir(pdfDir, { recursive: true });

  const proyecto = await db.project.create({
    data: { nombre: "Cocina Diego Monje (prueba)", cliente: "Diego Monje" },
  });
  const pdfPath = path.join(pdfDir, `${proyecto.id}-v1.pdf`);
  await fs.writeFile(pdfPath, await doc.save());
  await db.project.update({
    where: { id: proyecto.id },
    data: { pdfPath, pdfNombre: "cocina-diego-monje.pdf", pdfPaginas: 5, estado: "PDF_CARGADO" },
  });
  console.log("1. Proyecto creado:", proyecto.id);

  // Análisis (DEMO si no hay API key)
  const { ext, demo } = await analizarPDF(pdfPath);
  await persistirExtraccion(proyecto.id, ext, demo);
  console.log(`2. Análisis ${demo ? "DEMO" : "IA"}: ${ext.ambientes.length} ambientes`);

  // Despiece
  const modulos = await db.modulo.findMany({
    where: { producto: { ambiente: { projectId: proyecto.id } } },
  });
  let nPiezas = 0;
  for (const m of modulos) {
    const { piezas } = generarDespiece(m, cfg);
    let i = 1;
    for (const p of piezas) {
      await db.pieza.create({
        data: {
          moduloId: m.id,
          codigo: `${m.codigo}-${String(i++).padStart(2, "0")}`,
          nombre: p.nombre,
          cantidad: p.cantidad,
          largo: p.largo,
          ancho: p.ancho,
          espesor: p.espesor,
          material: p.material,
          color: p.color,
          veta: p.veta,
          cantos: p.cantos,
        },
      });
      nPiezas += p.cantidad * m.cantidad;
    }
  }
  console.log(`3. Despiece: ${modulos.length} módulos → ${nPiezas} piezas`);

  // Optimización
  const ambientes = await db.ambiente.findMany({
    where: { projectId: proyecto.id },
    include: { productos: { include: { modulos: { include: { piezas: true } } } } },
  });
  const piezasCorte: PiezaCorte[] = [];
  for (const amb of ambientes)
    for (const prod of amb.productos)
      for (const mod of prod.modulos)
        for (const p of mod.piezas)
          piezasCorte.push({
            label: `${p.codigo} ${p.nombre}`,
            largo: p.largo,
            ancho: p.ancho,
            cantidad: p.cantidad * mod.cantidad,
            material: p.material,
            color: p.color,
            espesor: p.espesor,
            veta: p.veta,
            productoId: prod.id,
            productoNombre: prod.nombre,
            moduloCodigo: mod.codigo,
          });
  const plan = optimizar(piezasCorte, cfg);
  for (const g of plan.grupos) {
    console.log(
      `4. ${g.material} ${g.color} ${g.espesor}mm: ${g.tableros.length} tableros, aprovechamiento ${(g.aprovechamiento * 100).toFixed(1)}%, ${g.retazos.length} retazos`
    );
    // validación: ninguna pieza fuera del tablero, sin solapes
    for (const [ti, t] of g.tableros.entries()) {
      for (const pl of t.placements) {
        if (pl.x + pl.w > cfg.tablero.largo || pl.y + pl.h > cfg.tablero.ancho)
          throw new Error(`Pieza fuera del tablero ${ti}: ${JSON.stringify(pl)}`);
        for (const otro of t.placements) {
          if (otro === pl) continue;
          const overlap =
            pl.x < otro.x + otro.w && otro.x < pl.x + pl.w && pl.y < otro.y + otro.h && otro.y < pl.y + pl.h;
          if (overlap) throw new Error(`Solape en tablero ${ti}: ${pl.label} vs ${otro.label}`);
        }
      }
    }
  }
  await db.project.update({
    where: { id: proyecto.id },
    data: { cutPlanJson: JSON.stringify(plan), estado: "LISTO_PRODUCCION" },
  });

  // Costos
  const pFull = await db.project.findUniqueOrThrow({
    where: { id: proyecto.id },
    include: {
      ambientes: { include: { productos: { include: { modulos: { include: { piezas: true } } } } } },
      accesorios: true,
    },
  });
  const costos = calcularCostos(pFull as unknown as ProyectoConDatos, cfg);
  console.log("5. Costos por producto terminado:");
  for (const prod of costos.productos) {
    console.log(
      `   ${prod.nombre}: ${prod.tableros.map((t) => `${t.optimizado.toFixed(2)} tab ${t.material}/${t.espesor}mm`).join(", ")} · ${prod.cantoMetros.toFixed(1)} m canto · $${prod.costoTotal.toFixed(2)}`
    );
  }
  console.log(
    `   TOTAL: $${costos.costoTotal.toFixed(2)} · canto ${costos.cantoMetrosTotal.toFixed(1)} m · tableros: ${costos.totalTableros.map((t) => `${t.cantidad} ${t.material}/${t.espesor}mm`).join(", ")}`
  );

  await db.project.update({ where: { id: proyecto.id }, data: { estado: "APROBADO_PRODUCCION" } });
  console.log("OK: flujo completo válido. Proyecto:", proyecto.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
