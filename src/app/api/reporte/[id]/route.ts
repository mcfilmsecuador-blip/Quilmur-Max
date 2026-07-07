import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { calcularCostos, type ProyectoConDatos } from "@/lib/costos";
import { metrosCantoPieza } from "@/lib/despiece";

// Exportación de reportes (secciones 42-43): despiece CSV, orden de producción
// JSON y baja de materia prima CSV/JSON.

function csv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c);
          return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(";")
    )
    .join("\n");
}

function respuesta(nombre: string, contenido: string, formato: string) {
  return new NextResponse(formato === "csv" ? "﻿" + contenido : contenido, {
    headers: {
      "Content-Type": formato === "csv" ? "text/csv; charset=utf-8" : "application/json",
      "Content-Disposition": `attachment; filename="${nombre}.${formato}"`,
    },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo") ?? "orden";
  const formato = url.searchParams.get("formato") ?? "json";

  const cfg = await getConfig();
  const p = await db.project.findUnique({
    where: { id },
    include: {
      ambientes: {
        include: { productos: { include: { modulos: { include: { piezas: true } } } } },
      },
      accesorios: true,
      electrodomesticos: true,
      observaciones: true,
    },
  });
  if (!p) return new NextResponse("No encontrado", { status: 404 });

  const slug = p.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  if (tipo === "despiece") {
    const rows: (string | number)[][] = [
      ["Proyecto", "Ambiente", "Producto", "Módulo", "Código pieza", "Pieza", "Cantidad", "Largo (mm)", "Ancho (mm)", "Espesor (mm)", "Material", "Color", "Veta", "Cantos", "Canto (m)"],
    ];
    for (const a of p.ambientes)
      for (const pr of a.productos)
        for (const m of pr.modulos)
          for (const pz of m.piezas)
            rows.push([
              p.nombre,
              a.nombre,
              pr.nombre,
              `${m.codigo} ${m.nombre}`.trim(),
              pz.codigo,
              pz.nombre,
              pz.cantidad * m.cantidad,
              pz.largo,
              pz.ancho,
              pz.espesor,
              pz.material,
              pz.color,
              pz.veta ? "SI" : "NO",
              pz.cantos,
              (metrosCantoPieza(pz) * m.cantidad).toFixed(2),
            ]);
    return respuesta(`despiece-${slug}`, csv(rows), "csv");
  }

  const costos = calcularCostos(p as unknown as ProyectoConDatos, cfg);

  if (tipo === "baja") {
    if (formato === "csv") {
      const rows: (string | number)[][] = [
        ["Proyecto", "Cliente", "Ambiente", "Producto terminado", "Material", "Descripción", "Unidad", "Cantidad", "Costo unitario (USD)", "Costo total (USD)"],
      ];
      for (const prod of costos.productos) {
        for (const t of prod.tableros)
          rows.push([
            p.nombre, p.cliente, prod.ambiente, prod.nombre,
            `${t.material}|${t.color}|${t.espesor}mm`,
            `Tablero ${t.material === "melamina_color" ? "de color" : "blanco"} ${t.espesor} mm (incluye merma ${t.merma.toFixed(2)})`,
            "tablero", t.optimizado.toFixed(3),
            (t.material === "melamina_color" ? cfg.precios.tableroColor : cfg.precios.tableroBlanco).toFixed(2),
            t.costo.toFixed(2),
          ]);
        rows.push([
          p.nombre, p.cliente, prod.ambiente, prod.nombre, "CANTO",
          "Canto (incluye desperdicio)", "metro", prod.cantoMetros.toFixed(2),
          cfg.precios.cantoMetro.toFixed(2), prod.cantoCosto.toFixed(2),
        ]);
        for (const h of prod.herrajes)
          rows.push([
            p.nombre, p.cliente, prod.ambiente, prod.nombre, "HERRAJE",
            h.nombre, "unidad", h.cantidad,
            (h.costo / Math.max(1, h.cantidad)).toFixed(2), h.costo.toFixed(2),
          ]);
        for (const a of prod.accesorios)
          rows.push([
            p.nombre, p.cliente, prod.ambiente, prod.nombre, "ACCESORIO",
            a.nombre, "unidad", a.cantidad,
            (a.costo / Math.max(1, a.cantidad)).toFixed(2), a.costo.toFixed(2),
          ]);
      }
      for (const a of costos.accesoriosSinAsignar)
        rows.push([p.nombre, p.cliente, "", "(proyecto)", "ACCESORIO", a.nombre, "unidad", a.cantidad, "", a.costo.toFixed(2)]);
      return respuesta(`baja-materia-prima-${slug}`, csv(rows), "csv");
    }
    return respuesta(
      `baja-materia-prima-${slug}`,
      JSON.stringify(
        {
          proyecto: p.nombre,
          cliente: p.cliente,
          estado: p.estado,
          fecha: new Date().toISOString(),
          consumoPorProducto: costos.productos,
          accesoriosSinAsignar: costos.accesoriosSinAsignar,
          totalTableros: costos.totalTableros,
          cantoMetrosTotal: costos.cantoMetrosTotal,
          costoTotal: costos.costoTotal,
        },
        null,
        2
      ),
      "json"
    );
  }

  // orden de producción completa
  return respuesta(
    `orden-produccion-${slug}`,
    JSON.stringify(
      {
        codigo: `OP-${p.id.slice(-6).toUpperCase()}`,
        proyecto: p.nombre,
        cliente: p.cliente,
        disenador: p.disenador,
        estado: p.estado,
        pdf: { nombre: p.pdfNombre, paginas: p.pdfPaginas, version: p.pdfVersion },
        fecha: new Date().toISOString(),
        ambientes: p.ambientes.map((a) => ({
          nombre: a.nombre,
          productos: a.productos.map((pr) => ({
            nombre: pr.nombre,
            unidad: pr.unidad,
            cantidad: pr.cantidad,
            modulos: pr.modulos.map((m) => ({
              codigo: m.codigo,
              nombre: m.nombre,
              tipo: m.tipo,
              medidas: `${m.ancho}x${m.alto}x${m.profundidad}`,
              cantidad: m.cantidad,
              color: m.color,
              observaciones: m.observaciones,
              piezas: m.piezas.map((pz) => ({
                codigo: pz.codigo,
                nombre: pz.nombre,
                cantidad: pz.cantidad * m.cantidad,
                largo: pz.largo,
                ancho: pz.ancho,
                espesor: pz.espesor,
                material: pz.material,
                color: pz.color,
                veta: pz.veta,
                cantos: pz.cantos,
              })),
            })),
          })),
        })),
        electrodomesticos: p.electrodomesticos,
        accesorios: p.accesorios,
        observaciones: p.observaciones,
        planCorte: p.cutPlanJson ? JSON.parse(p.cutPlanJson) : null,
        costos,
      },
      null,
      2
    ),
    "json"
  );
}
