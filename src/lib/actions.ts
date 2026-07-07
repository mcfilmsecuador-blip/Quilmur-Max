"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put, del } from "@vercel/blob";
import { PDFDocument } from "pdf-lib";
import { db } from "./db";
import { analizarPDF, persistirExtraccion } from "./analyze";
import { generarDespiece, type ModuloInput } from "./despiece";
import { optimizar, type PiezaCorte } from "./optimizer";
import { getConfig, saveConfig, DEFAULT_CONFIG, type QuilmurConfig } from "./config";
import { getTemplate } from "./templates";

// ---------- Proyectos ----------

export async function crearProyecto(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  const p = await db.project.create({
    data: {
      nombre,
      cliente: String(formData.get("cliente") ?? ""),
      disenador: String(formData.get("disenador") ?? ""),
    },
  });
  redirect(`/proyectos/${p.id}`);
}

export async function eliminarProyecto(id: string) {
  const p = await db.project.findUnique({ where: { id } });
  if (p?.pdfBlobPath) await del(p.pdfBlobPath).catch(() => {});
  await db.project.delete({ where: { id } });
  revalidatePath("/proyectos");
  redirect("/proyectos");
}

export async function subirPDF(projectId: string, formData: FormData) {
  const file = formData.get("pdf") as File | null;
  if (!file || file.size === 0) return;
  const bytes = Buffer.from(await file.arrayBuffer());
  let paginas = 0;
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    paginas = doc.getPageCount();
  } catch {
    paginas = 0;
  }
  const proyecto = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const version = proyecto.pdfUrl ? proyecto.pdfVersion + 1 : 1;
  if (proyecto.pdfBlobPath) await del(proyecto.pdfBlobPath).catch(() => {});
  const blob = await put(`pdfs/${projectId}-v${version}.pdf`, bytes, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
  });
  await db.project.update({
    where: { id: projectId },
    data: {
      pdfUrl: blob.url,
      pdfBlobPath: blob.pathname,
      pdfNombre: file.name,
      pdfPaginas: paginas,
      pdfVersion: version,
      estado: "PDF_CARGADO",
    },
  });
  revalidatePath(`/proyectos/${projectId}`);
}

export async function analizarProyecto(projectId: string) {
  const proyecto = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  await db.project.update({ where: { id: projectId }, data: { estado: "EN_ANALISIS" } });
  try {
    const { ext, demo } = await analizarPDF(proyecto.pdfUrl ?? "");
    await persistirExtraccion(projectId, ext, demo);
  } catch (e) {
    await db.project.update({
      where: { id: projectId },
      data: { estado: "REQUIERE_REVISION" },
    });
    throw e;
  }
  revalidatePath(`/proyectos/${projectId}`);
  redirect(`/proyectos/${projectId}/revision`);
}

// ---------- Revisión ----------

export async function actualizarModulo(id: string, formData: FormData) {
  const num = (k: string, def = 0) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) ? v : def;
  };
  const tipo = String(formData.get("tipo") ?? "personalizado");
  await db.modulo.update({
    where: { id },
    data: {
      codigo: String(formData.get("codigo") ?? ""),
      nombre: String(formData.get("nombre") ?? getTemplate(tipo).nombre),
      tipo,
      ancho: num("ancho"),
      alto: num("alto"),
      profundidad: num("profundidad"),
      cantidad: Math.max(1, num("cantidad", 1)),
      color: String(formData.get("color") ?? ""),
      colorEstructura: String(formData.get("colorEstructura") ?? ""),
      materialEstructura: String(formData.get("materialEstructura") ?? "melamina_blanca"),
      materialFrentes: String(formData.get("materialFrentes") ?? "melamina_color"),
      puertas: num("puertas"),
      cajones: num("cajones"),
      repisas: num("repisas"),
      lateralVisto: formData.get("lateralVisto") === "on",
      observaciones: String(formData.get("observaciones") ?? ""),
      confirmado: true,
      confianza: "ALTA",
    },
  });
  const modulo = await db.modulo.findUniqueOrThrow({
    where: { id },
    include: { producto: { include: { ambiente: true } } },
  });
  revalidatePath(`/proyectos/${modulo.producto.ambiente.projectId}/revision`);
}

export async function confirmarModulo(id: string) {
  const modulo = await db.modulo.update({
    where: { id },
    data: { confirmado: true },
    include: { producto: { include: { ambiente: true } } },
  });
  revalidatePath(`/proyectos/${modulo.producto.ambiente.projectId}/revision`);
}

export async function eliminarModulo(id: string) {
  const modulo = await db.modulo.delete({
    where: { id },
    include: { producto: { include: { ambiente: true } } },
  });
  revalidatePath(`/proyectos/${modulo.producto.ambiente.projectId}/revision`);
}

export async function agregarModulo(productoId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "personalizado");
  const tpl = getTemplate(tipo);
  const producto = await db.producto.findUniqueOrThrow({
    where: { id: productoId },
    include: { ambiente: true },
  });
  await db.modulo.create({
    data: {
      productoId,
      nombre: tpl.nombre,
      tipo: tpl.key,
      ancho: tpl.dimsDefault.ancho,
      alto: tpl.dimsDefault.alto,
      profundidad: tpl.dimsDefault.profundidad,
      puertas: tpl.defaults.puertas,
      cajones: tpl.defaults.cajones,
      repisas: tpl.defaults.repisas,
      confianza: "ALTA",
      confirmado: false,
    },
  });
  revalidatePath(`/proyectos/${producto.ambiente.projectId}/revision`);
}

export async function aprobarRevision(projectId: string) {
  await db.modulo.updateMany({
    where: { producto: { ambiente: { projectId } } },
    data: { confirmado: true },
  });
  await db.project.update({
    where: { id: projectId },
    data: { estado: "APROBADO_DESPIECE" },
  });
  revalidatePath(`/proyectos/${projectId}`);
  redirect(`/proyectos/${projectId}`);
}

// ---------- Producción ----------

export async function generarDespieceProyecto(projectId: string) {
  const cfg = await getConfig();
  const modulos = await db.modulo.findMany({
    where: { producto: { ambiente: { projectId } } },
  });
  await db.$transaction(async (tx) => {
    for (const m of modulos) {
      await tx.pieza.deleteMany({ where: { moduloId: m.id } });
      const { piezas } = generarDespiece(m as ModuloInput, cfg);
      let i = 1;
      for (const p of piezas) {
        await tx.pieza.create({
          data: {
            moduloId: m.id,
            codigo: `${m.codigo || m.id.slice(-4).toUpperCase()}-${String(i++).padStart(2, "0")}`,
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
      }
    }
    await tx.project.update({
      where: { id: projectId },
      data: { estado: "DESPIECE_GENERADO", cutPlanJson: null },
    });
  });
  revalidatePath(`/proyectos/${projectId}`);
  redirect(`/proyectos/${projectId}/despiece`);
}

export async function optimizarProyecto(projectId: string) {
  const cfg = await getConfig();
  const ambientes = await db.ambiente.findMany({
    where: { projectId },
    include: { productos: { include: { modulos: { include: { piezas: true } } } } },
  });
  const piezasCorte: PiezaCorte[] = [];
  for (const amb of ambientes) {
    for (const prod of amb.productos) {
      for (const mod of prod.modulos) {
        for (const p of mod.piezas) {
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
        }
      }
    }
  }
  const plan = optimizar(piezasCorte, cfg);
  await db.project.update({
    where: { id: projectId },
    data: { cutPlanJson: JSON.stringify(plan), estado: "LISTO_PRODUCCION" },
  });
  revalidatePath(`/proyectos/${projectId}`);
  redirect(`/proyectos/${projectId}/optimizacion`);
}

export async function aprobarProduccion(projectId: string) {
  await db.project.update({
    where: { id: projectId },
    data: { estado: "APROBADO_PRODUCCION" },
  });
  revalidatePath(`/proyectos/${projectId}`);
  redirect(`/proyectos/${projectId}/reportes`);
}

export async function cerrarProyecto(projectId: string) {
  await db.project.update({ where: { id: projectId }, data: { estado: "CERRADO" } });
  revalidatePath(`/proyectos/${projectId}`);
  redirect(`/proyectos/${projectId}`);
}

// ---------- Configuración ----------

export async function guardarConfiguracion(formData: FormData) {
  const base = await getConfig();
  const num = (k: string, def: number) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) && v >= 0 ? v : def;
  };
  const cfg: QuilmurConfig = {
    tablero: {
      largo: num("tablero.largo", base.tablero.largo),
      ancho: num("tablero.ancho", base.tablero.ancho),
    },
    sierra: {
      kerf: num("sierra.kerf", base.sierra.kerf),
      margen: num("sierra.margen", base.sierra.margen),
      retazoMinimo: num("sierra.retazoMinimo", base.sierra.retazoMinimo),
    },
    reglas: {
      espesor: num("reglas.espesor", base.reglas.espesor),
      espesorFondo: num("reglas.espesorFondo", base.reglas.espesorFondo),
      holguraPuerta: num("reglas.holguraPuerta", base.reglas.holguraPuerta),
      separacionFrentes: num("reglas.separacionFrentes", base.reglas.separacionFrentes),
      holguraRepisa: num("reglas.holguraRepisa", base.reglas.holguraRepisa),
      retranqueoRepisa: num("reglas.retranqueoRepisa", base.reglas.retranqueoRepisa),
      alturaZocalo: num("reglas.alturaZocalo", base.reglas.alturaZocalo),
      alturaLateralCajon: num("reglas.alturaLateralCajon", base.reglas.alturaLateralCajon),
      descuentoProfCajon: num("reglas.descuentoProfCajon", base.reglas.descuentoProfCajon),
      desperdicioCantoPct: num("reglas.desperdicioCantoPct", base.reglas.desperdicioCantoPct),
    },
    precios: {
      tableroColor: num("precios.tableroColor", base.precios.tableroColor),
      tableroBlanco: num("precios.tableroBlanco", base.precios.tableroBlanco),
      herrajePequeno: num("precios.herrajePequeno", base.precios.herrajePequeno),
      herrajeMediano: num("precios.herrajeMediano", base.precios.herrajeMediano),
      jaladera: num("precios.jaladera", base.precios.jaladera),
      cantoMetro: num("precios.cantoMetro", base.precios.cantoMetro),
    },
    herrajes: base.herrajes,
  };
  await saveConfig(cfg);
  revalidatePath("/configuracion");
}

export async function restaurarConfiguracion() {
  await saveConfig(DEFAULT_CONFIG);
  revalidatePath("/configuracion");
}
