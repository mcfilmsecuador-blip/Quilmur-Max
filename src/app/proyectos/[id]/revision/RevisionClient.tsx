"use client";

// Pantalla de revisión asistida (secciones 24-27): tres zonas —
// izquierda: navegación por ambientes/productos/módulos; centro: visor del PDF
// que salta a la página de origen del dato; derecha: edición y confirmación.

import { useMemo, useState } from "react";
import {
  actualizarModulo,
  agregarModulo,
  aprobarRevision,
  confirmarModulo,
  eliminarModulo,
} from "@/lib/actions";
import { ConfianzaBadge } from "@/components/ui";

interface ModuloDTO {
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
  puertas: number;
  cajones: number;
  repisas: number;
  lateralVisto: boolean;
  observaciones: string;
  confianza: string;
  pagina: number;
  confirmado: boolean;
}

interface ProyectoDTO {
  id: string;
  pdfPath: string | null;
  pdfPaginas: number;
  estado: string;
  ambientes: {
    id: string;
    nombre: string;
    confianza: string;
    productos: {
      id: string;
      nombre: string;
      unidad: string;
      cantidad: number;
      modulos: ModuloDTO[];
    }[];
  }[];
  observaciones: { id: string; texto: string; moduloRef: string; pagina: number; confianza: string }[];
}

interface TemplateDTO {
  key: string;
  nombre: string;
  categoria: string;
}

const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none";
const labelCls = "mb-0.5 block text-[11px] font-medium text-zinc-400";

export default function RevisionClient({
  proyecto,
  templates,
}: {
  proyecto: ProyectoDTO;
  templates: TemplateDTO[];
}) {
  const modulos = useMemo(
    () => proyecto.ambientes.flatMap((a) => a.productos.flatMap((p) => p.modulos)),
    [proyecto]
  );
  const [seleccionado, setSeleccionado] = useState<string | null>(modulos[0]?.id ?? null);
  const [filtro, setFiltro] = useState<string>("TODOS");
  const mod = modulos.find((m) => m.id === seleccionado) ?? null;

  const pendientes = modulos.filter((m) => !m.confirmado).length;
  const alertas = modulos.filter(
    (m) => !m.ancho || !m.alto || !m.profundidad || m.confianza === "NO_IDENTIFICADO"
  );

  if (modulos.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Todavía no hay módulos detectados. Ejecuta el análisis del PDF desde la pestaña Resumen.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm"
          >
            <option value="TODOS">Todas las confianzas</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
            <option value="NO_IDENTIFICADO">No identificado</option>
            <option value="PENDIENTES">Sin confirmar</option>
          </select>
          <span className="text-zinc-500">
            {pendientes} módulos sin confirmar · {alertas.length} alertas
          </span>
        </div>
        <form action={aprobarRevision.bind(null, proyecto.id)}>
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 cursor-pointer"
          >
            Aprobar revisión y pasar a despiece
          </button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_360px]">
        {/* Zona izquierda: navegación */}
        <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          {proyecto.ambientes.map((amb) => (
            <div key={amb.id}>
              <div className="px-1 text-[11px] font-semibold uppercase tracking-widest text-amber-500/80">
                {amb.nombre}
              </div>
              {amb.productos.map((prod) => (
                <div key={prod.id} className="mt-1">
                  <div className="px-1 text-xs text-zinc-400">{prod.nombre}</div>
                  <ul className="mt-1 space-y-0.5">
                    {prod.modulos
                      .filter((m) =>
                        filtro === "TODOS"
                          ? true
                          : filtro === "PENDIENTES"
                            ? !m.confirmado
                            : m.confianza === filtro
                      )
                      .map((m) => (
                        <li key={m.id}>
                          <button
                            onClick={() => setSeleccionado(m.id)}
                            className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                              seleccionado === m.id
                                ? "bg-amber-500/15 text-amber-200"
                                : "text-zinc-300 hover:bg-zinc-800"
                            }`}
                          >
                            <span className="truncate">
                              {m.confirmado ? "✓ " : ""}
                              {m.codigo ? `${m.codigo} · ` : ""}
                              {m.nombre}
                            </span>
                            <ConfianzaBadge nivel={m.confianza} />
                          </button>
                        </li>
                      ))}
                  </ul>
                  <form
                    action={agregarModulo.bind(null, prod.id)}
                    className="mt-1 flex items-center gap-1 px-1"
                  >
                    <select name="tipo" className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-1 py-1 text-[11px]">
                      {templates.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded border border-zinc-700 px-1.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                      title="Agregar módulo"
                    >
                      +
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Zona central: visor del PDF */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
          {proyecto.pdfPath ? (
            <iframe
              key={mod?.pagina ?? 0}
              src={`/api/pdf/${proyecto.id}#page=${mod?.pagina || 1}`}
              className="h-[70vh] w-full rounded-lg bg-zinc-950"
              title="Visor PDF"
            />
          ) : (
            <div className="flex h-[70vh] items-center justify-center text-sm text-zinc-500">
              Sin PDF cargado
            </div>
          )}
          {mod && (
            <div className="px-2 py-1.5 text-xs text-zinc-500">
              Trazabilidad: dato detectado en la página {mod.pagina || "?"} del documento.
            </div>
          )}
        </div>

        {/* Zona derecha: edición del módulo */}
        <div className="max-h-[74vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          {mod ? (
            <form action={actualizarModulo.bind(null, mod.id)} key={mod.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {mod.codigo || "Módulo"} <ConfianzaBadge nivel={mod.confianza} />
                </h3>
                {mod.confirmado && (
                  <span className="text-xs text-green-400">Confirmado</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Código</label>
                  <input name="codigo" defaultValue={mod.codigo} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cantidad</label>
                  <input name="cantidad" type="number" min={1} defaultValue={mod.cantidad} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Nombre</label>
                <input name="nombre" defaultValue={mod.nombre} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tipo (biblioteca de módulos)</label>
                <select name="tipo" defaultValue={mod.tipo} className={inputCls}>
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      [{t.categoria}] {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Ancho (mm)</label>
                  <input name="ancho" type="number" defaultValue={mod.ancho} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Alto (mm)</label>
                  <input name="alto" type="number" defaultValue={mod.alto} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Prof. (mm)</label>
                  <input name="profundidad" type="number" defaultValue={mod.profundidad} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Puertas</label>
                  <input name="puertas" type="number" min={0} defaultValue={mod.puertas} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cajones</label>
                  <input name="cajones" type="number" min={0} defaultValue={mod.cajones} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Repisas</label>
                  <input name="repisas" type="number" min={0} defaultValue={mod.repisas} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Material estructura</label>
                  <select name="materialEstructura" defaultValue={mod.materialEstructura} className={inputCls}>
                    <option value="melamina_blanca">Melamina blanca</option>
                    <option value="melamina_color">Melamina de color</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Material frentes</label>
                  <select name="materialFrentes" defaultValue={mod.materialFrentes} className={inputCls}>
                    <option value="melamina_color">Melamina de color</option>
                    <option value="melamina_blanca">Melamina blanca</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Color frentes</label>
                  <input name="color" defaultValue={mod.color} placeholder="Negro Matt Soft" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Color estructura interna</label>
                  <input
                    name="colorEstructura"
                    defaultValue={mod.colorEstructura}
                    placeholder="Plomo mate (vacío = blanco)"
                    className={inputCls}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" name="lateralVisto" defaultChecked={mod.lateralVisto} />
                Lateral visto (panel de terminación en color)
              </label>
              <div>
                <label className={labelCls}>Observaciones</label>
                <textarea name="observaciones" defaultValue={mod.observaciones} rows={2} className={inputCls} />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 cursor-pointer"
                >
                  Guardar y confirmar
                </button>
                <button
                  formAction={confirmarModulo.bind(null, mod.id)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                >
                  Confirmar sin cambios
                </button>
                <button
                  formAction={eliminarModulo.bind(null, mod.id)}
                  className="rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950 cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
              {mod.observaciones && (
                <p className="text-xs text-zinc-500">Obs. IA: {mod.observaciones}</p>
              )}
            </form>
          ) : (
            <p className="text-sm text-zinc-500">Selecciona un módulo para revisarlo.</p>
          )}

          {proyecto.observaciones.length > 0 && (
            <div className="mt-5 border-t border-zinc-800 pt-3">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Observaciones del proyecto
              </h4>
              <ul className="space-y-1.5 text-xs text-zinc-400">
                {proyecto.observaciones.map((o) => (
                  <li key={o.id}>
                    • {o.texto} {o.moduloRef && <span className="text-amber-500">[{o.moduloRef}]</span>}{" "}
                    <span className="text-zinc-600">pág. {o.pagina}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
