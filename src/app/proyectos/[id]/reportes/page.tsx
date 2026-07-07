import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { aprobarProduccion } from "@/lib/actions";
import { BotonPrimario, Card, LinkBoton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReportesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await db.project.findUnique({ where: { id } });
  if (!p) notFound();

  const aprobado = ["APROBADO_PRODUCCION", "CERRADO"].includes(p.estado);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Orden de producción">
        <p className="mb-4 text-sm text-zinc-400">
          Orden completa con despiece, materiales, cantos, herrajes, accesorios y costos por
          producto terminado.
        </p>
        <div className="flex flex-wrap gap-2">
          <LinkBoton href={`/api/reporte/${p.id}?tipo=orden&formato=json`}>
            Descargar JSON
          </LinkBoton>
          <LinkBoton href={`/api/reporte/${p.id}?tipo=despiece&formato=csv`}>
            Despiece CSV (sierra / etiquetas)
          </LinkBoton>
        </div>
      </Card>

      <Card title="Baja de materia prima">
        {aprobado ? (
          <>
            <p className="mb-4 text-sm text-zinc-400">
              Reporte de consumo para descargar del inventario: tableros, canto, herrajes y
              accesorios por producto terminado, con merma distribuida.
            </p>
            <div className="flex flex-wrap gap-2">
              <LinkBoton href={`/api/reporte/${p.id}?tipo=baja&formato=csv`}>Baja CSV</LinkBoton>
              <LinkBoton href={`/api/reporte/${p.id}?tipo=baja&formato=json`}>Baja JSON</LinkBoton>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-400">
              La baja de materia prima se habilita al aprobar la producción (requiere despiece y
              plan de corte).
            </p>
            {p.estado === "LISTO_PRODUCCION" && (
              <form action={aprobarProduccion.bind(null, p.id)}>
                <BotonPrimario>Aprobar producción</BotonPrimario>
              </form>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
