import Link from "next/link";
import { db } from "@/lib/db";
import { Card, EstadoBadge, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const proyectos = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      ambientes: {
        include: { productos: { include: { modulos: true } } },
      },
    },
  });

  const activos = proyectos.filter((p) => p.estado !== "CERRADO");
  const enRevision = proyectos.filter((p) =>
    ["ANALISIS_COMPLETADO", "REQUIERE_REVISION", "EN_VALIDACION"].includes(p.estado)
  );
  const listos = proyectos.filter((p) =>
    ["LISTO_PRODUCCION", "APROBADO_PRODUCCION"].includes(p.estado)
  );
  const modulosPendientes = proyectos
    .flatMap((p) => p.ambientes.flatMap((a) => a.productos.flatMap((pr) => pr.modulos)))
    .filter((m) => !m.confirmado).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-zinc-500">Estado general de la planta</p>
        </div>
        <Link
          href="/proyectos/nuevo"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          + Nuevo proyecto
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Proyectos activos" value={String(activos.length)} />
        <Stat label="En revisión" value={String(enRevision.length)} />
        <Stat label="Listos para producción" value={String(listos.length)} />
        <Stat label="Módulos sin confirmar" value={String(modulosPendientes)} />
      </div>

      <Card title="Proyectos recientes">
        {proyectos.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No hay proyectos todavía. Crea uno y carga su PDF técnico.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                <th className="py-2 pr-4">Proyecto</th>
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Módulos</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {proyectos.slice(0, 10).map((p) => {
                const nMod = p.ambientes.reduce(
                  (s, a) => s + a.productos.reduce((s2, pr) => s2 + pr.modulos.length, 0),
                  0
                );
                return (
                  <tr key={p.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                    <td className="py-2.5 pr-4 font-medium">{p.nombre}</td>
                    <td className="py-2.5 pr-4 text-zinc-400">{p.cliente || "—"}</td>
                    <td className="py-2.5 pr-4 text-zinc-400">{nMod}</td>
                    <td className="py-2.5 pr-4">
                      <EstadoBadge estado={p.estado} />
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        href={`/proyectos/${p.id}`}
                        className="text-amber-400 hover:text-amber-300"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
