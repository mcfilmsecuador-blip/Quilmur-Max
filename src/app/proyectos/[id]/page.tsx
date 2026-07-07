import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  analizarProyecto,
  aprobarProduccion,
  cerrarProyecto,
  eliminarProyecto,
  generarDespieceProyecto,
  optimizarProyecto,
  subirPDF,
} from "@/lib/actions";
import {
  BotonPrimario,
  BotonSecundario,
  Card,
  ConfianzaBadge,
  LinkBoton,
  Stat,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProyectoResumen({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await db.project.findUnique({
    where: { id },
    include: {
      ambientes: { include: { productos: { include: { modulos: { include: { piezas: true } } } } } },
      electrodomesticos: true,
      accesorios: true,
      observaciones: true,
    },
  });
  if (!p) notFound();

  const modulos = p.ambientes.flatMap((a) => a.productos.flatMap((pr) => pr.modulos));
  const nPiezas = modulos.reduce(
    (s, m) => s + m.piezas.reduce((s2, pz) => s2 + pz.cantidad * m.cantidad, 0),
    0
  );
  const sinConfirmar = modulos.filter((m) => !m.confirmado).length;
  const tieneAnalisis = modulos.length > 0;
  const tieneDespiece = modulos.some((m) => m.piezas.length > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Ambientes" value={String(p.ambientes.length)} />
        <Stat
          label="Productos terminados"
          value={String(p.ambientes.reduce((s, a) => s + a.productos.length, 0))}
        />
        <Stat label="Módulos" value={String(modulos.length)} sub={sinConfirmar ? `${sinConfirmar} sin confirmar` : "todos confirmados"} />
        <Stat label="Piezas" value={String(nPiezas)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="PDF técnico">
          {p.pdfPath ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-zinc-400">Archivo:</span> {p.pdfNombre} ·{" "}
                {p.pdfPaginas} páginas · versión {p.pdfVersion}
              </p>
              <iframe
                src={`/api/pdf/${p.id}`}
                className="h-64 w-full rounded-lg border border-zinc-800 bg-zinc-950"
                title="PDF"
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Aún no se ha cargado el PDF técnico de este proyecto.
            </p>
          )}
          <form action={subirPDF.bind(null, p.id)} className="mt-4 flex items-center gap-3">
            <input
              type="file"
              name="pdf"
              accept="application/pdf"
              required
              className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-sm file:text-zinc-100 hover:file:bg-zinc-600"
            />
            <BotonSecundario>{p.pdfPath ? "Subir nueva versión" : "Cargar PDF"}</BotonSecundario>
          </form>
        </Card>

        <Card title="Flujo de producción">
          <ol className="space-y-3 text-sm">
            <Paso n={1} listo={!!p.pdfPath} titulo="Cargar PDF técnico" />
            <Paso n={2} listo={tieneAnalisis} titulo="Analizar documento con IA">
              {p.pdfPath && (
                <form action={analizarProyecto.bind(null, p.id)}>
                  <BotonPrimario>
                    {tieneAnalisis ? "Reanalizar PDF" : "Analizar PDF"}
                  </BotonPrimario>
                </form>
              )}
            </Paso>
            <Paso
              n={3}
              listo={tieneAnalisis && sinConfirmar === 0 && ["APROBADO_DESPIECE", "DESPIECE_GENERADO", "LISTO_PRODUCCION", "APROBADO_PRODUCCION", "CERRADO"].includes(p.estado)}
              titulo="Revisar y aprobar interpretación"
            >
              {tieneAnalisis && <LinkBoton href={`/proyectos/${p.id}/revision`}>Ir a revisión</LinkBoton>}
            </Paso>
            <Paso n={4} listo={tieneDespiece} titulo="Generar despiece (motor de reglas)">
              {["APROBADO_DESPIECE", "DESPIECE_GENERADO", "LISTO_PRODUCCION", "APROBADO_PRODUCCION"].includes(p.estado) && (
                <form action={generarDespieceProyecto.bind(null, p.id)}>
                  <BotonSecundario>{tieneDespiece ? "Regenerar despiece" : "Generar despiece"}</BotonSecundario>
                </form>
              )}
            </Paso>
            <Paso n={5} listo={!!p.cutPlanJson} titulo="Optimizar tableros">
              {tieneDespiece && (
                <form action={optimizarProyecto.bind(null, p.id)}>
                  <BotonSecundario>{p.cutPlanJson ? "Reoptimizar" : "Optimizar corte"}</BotonSecundario>
                </form>
              )}
            </Paso>
            <Paso
              n={6}
              listo={["APROBADO_PRODUCCION", "CERRADO"].includes(p.estado)}
              titulo="Aprobar producción y baja de materia prima"
            >
              {p.estado === "LISTO_PRODUCCION" && (
                <form action={aprobarProduccion.bind(null, p.id)}>
                  <BotonPrimario>Aprobar producción</BotonPrimario>
                </form>
              )}
              {p.estado === "APROBADO_PRODUCCION" && (
                <form action={cerrarProyecto.bind(null, p.id)}>
                  <BotonSecundario>Cerrar proyecto</BotonSecundario>
                </form>
              )}
            </Paso>
          </ol>
        </Card>
      </div>

      {(p.electrodomesticos.length > 0 || p.accesorios.length > 0 || p.observaciones.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title={`Electrodomésticos (${p.electrodomesticos.length})`}>
            <ul className="space-y-2 text-sm">
              {p.electrodomesticos.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{e.categoria}</div>
                    <div className="text-xs text-zinc-500">
                      {[e.marca, e.modelo].filter(Boolean).join(" ")} ·{" "}
                      {e.ancho}×{e.alto}×{e.profundidad} mm · {e.origen.toLowerCase()} · pág. {e.pagina}
                    </div>
                  </div>
                  <ConfianzaBadge nivel={e.confianza} />
                </li>
              ))}
            </ul>
          </Card>
          <Card title={`Accesorios extras (${p.accesorios.length})`}>
            <ul className="space-y-2 text-sm">
              {p.accesorios.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{a.nombre}</div>
                    <div className="text-xs text-zinc-500">
                      {a.cantidad} {a.unidad}
                      {a.moduloRef ? ` · módulo ${a.moduloRef}` : ""} · pág. {a.pagina}
                    </div>
                  </div>
                  <ConfianzaBadge nivel={a.confianza} />
                </li>
              ))}
            </ul>
          </Card>
          <Card title={`Observaciones (${p.observaciones.length})`}>
            <ul className="space-y-2 text-sm">
              {p.observaciones.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-2">
                  <div>
                    {o.texto}
                    <span className="text-xs text-zinc-500">
                      {" "}
                      {o.moduloRef ? `· ${o.moduloRef}` : ""} · pág. {o.pagina}
                    </span>
                  </div>
                  <ConfianzaBadge nivel={o.confianza} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <form action={eliminarProyecto.bind(null, p.id)}>
        <button
          type="submit"
          className="text-xs text-red-500/70 hover:text-red-400 cursor-pointer"
        >
          Eliminar proyecto
        </button>
      </form>
    </div>
  );
}

function Paso({
  n,
  listo,
  titulo,
  children,
}: {
  n: number;
  listo: boolean;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          listo ? "bg-green-600 text-white" : "bg-zinc-700 text-zinc-300"
        }`}
      >
        {listo ? "✓" : n}
      </span>
      <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
        <span className={listo ? "text-zinc-400" : ""}>{titulo}</span>
        {children}
      </div>
    </li>
  );
}
