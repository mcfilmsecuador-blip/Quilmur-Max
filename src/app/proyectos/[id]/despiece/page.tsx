import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { generarDespiece, metrosCantoPieza, type ModuloInput } from "@/lib/despiece";
import { generarDespieceProyecto } from "@/lib/actions";
import { BotonSecundario, Card, MATERIAL_LABEL, fmt } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DespiecePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cfg = await getConfig();
  const p = await db.project.findUnique({
    where: { id },
    include: {
      ambientes: {
        include: { productos: { include: { modulos: { include: { piezas: true } } } } },
      },
    },
  });
  if (!p) notFound();

  const modulos = p.ambientes.flatMap((a) =>
    a.productos.flatMap((pr) => pr.modulos.map((m) => ({ ...m, producto: pr.nombre, ambiente: a.nombre })))
  );
  const tieneDespiece = modulos.some((m) => m.piezas.length > 0);

  if (!tieneDespiece) {
    return (
      <Card>
        <p className="mb-4 text-sm text-zinc-400">
          El despiece aún no se ha generado. Requiere la revisión aprobada (estado
          &quot;Aprobado para despiece&quot;).
        </p>
        {["APROBADO_DESPIECE", "DESPIECE_GENERADO", "LISTO_PRODUCCION", "APROBADO_PRODUCCION"].includes(p.estado) && (
          <form action={generarDespieceProyecto.bind(null, p.id)}>
            <BotonSecundario>Generar despiece</BotonSecundario>
          </form>
        )}
      </Card>
    );
  }

  let totalPiezas = 0;
  let totalCanto = 0;
  const herrajesTotales = new Map<string, number>();
  for (const m of modulos) {
    for (const pz of m.piezas) {
      totalPiezas += pz.cantidad * m.cantidad;
      totalCanto += metrosCantoPieza(pz) * m.cantidad;
    }
    const { herrajes } = generarDespiece(m as unknown as ModuloInput, cfg);
    for (const h of herrajes) {
      herrajesTotales.set(h.nombre, (herrajesTotales.get(h.nombre) ?? 0) + h.cantidad * m.cantidad);
    }
  }
  totalCanto *= 1 + cfg.reglas.desperdicioCantoPct / 100;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          {totalPiezas} piezas · {fmt(totalCanto)} m de canto (incluye{" "}
          {cfg.reglas.desperdicioCantoPct}% de desperdicio) ·{" "}
          {[...herrajesTotales.values()].reduce((a, b) => a + b, 0)} herrajes
        </p>
        <form action={generarDespieceProyecto.bind(null, p.id)}>
          <BotonSecundario>Regenerar despiece</BotonSecundario>
        </form>
      </div>

      <Card title="Herrajes calculados (motor de reglas)">
        <div className="flex flex-wrap gap-2">
          {[...herrajesTotales.entries()].map(([nombre, cant]) => (
            <span
              key={nombre}
              className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm"
            >
              {nombre}: <b>{cant}</b>
            </span>
          ))}
        </div>
      </Card>

      {modulos.map((m) => (
        <Card
          key={m.id}
          title={`${m.codigo || ""} ${m.nombre} · ${m.ancho}×${m.alto}×${m.profundidad} mm · x${m.cantidad} — ${m.ambiente} / ${m.producto}`}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="py-1.5 pr-3">Código</th>
                <th className="py-1.5 pr-3">Pieza</th>
                <th className="py-1.5 pr-3 text-right">Cant.</th>
                <th className="py-1.5 pr-3 text-right">Largo</th>
                <th className="py-1.5 pr-3 text-right">Ancho</th>
                <th className="py-1.5 pr-3 text-right">Esp.</th>
                <th className="py-1.5 pr-3">Material</th>
                <th className="py-1.5 pr-3">Veta</th>
                <th className="py-1.5 pr-3">Cantos</th>
                <th className="py-1.5 text-right">Canto (m)</th>
              </tr>
            </thead>
            <tbody>
              {m.piezas.map((pz) => (
                <tr key={pz.id} className="border-b border-zinc-800/50">
                  <td className="py-1.5 pr-3 font-mono text-xs text-zinc-500">{pz.codigo}</td>
                  <td className="py-1.5 pr-3">{pz.nombre}</td>
                  <td className="py-1.5 pr-3 text-right">{pz.cantidad * m.cantidad}</td>
                  <td className="py-1.5 pr-3 text-right">{pz.largo}</td>
                  <td className="py-1.5 pr-3 text-right">{pz.ancho}</td>
                  <td className="py-1.5 pr-3 text-right">{pz.espesor}</td>
                  <td className="py-1.5 pr-3 text-zinc-400">
                    {MATERIAL_LABEL[pz.material] ?? pz.material}
                    {pz.color && pz.color !== "Blanco" ? ` · ${pz.color}` : ""}
                  </td>
                  <td className="py-1.5 pr-3">{pz.veta ? "→" : "—"}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{pz.cantos}</td>
                  <td className="py-1.5 text-right">{fmt(metrosCantoPieza(pz) * m.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}
