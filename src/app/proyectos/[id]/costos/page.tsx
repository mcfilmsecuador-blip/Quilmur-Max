import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { calcularCostos, type ProyectoConDatos } from "@/lib/costos";
import { Card, MATERIAL_LABEL, Stat, fmt, usd } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CostosPage({
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
      accesorios: true,
    },
  });
  if (!p) notFound();

  const tieneDespiece = p.ambientes.some((a) =>
    a.productos.some((pr) => pr.modulos.some((m) => m.piezas.length > 0))
  );
  if (!tieneDespiece) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">
          Los costos se calculan a partir del despiece. Genera el despiece primero.
        </p>
      </Card>
    );
  }

  const r = calcularCostos(p as unknown as ProyectoConDatos, cfg);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Costo total del proyecto" value={usd(r.costoTotal)} />
        <Stat
          label="Tableros"
          value={r.totalTableros
            .filter((t) => t.espesor >= 12)
            .reduce((s, t) => s + t.cantidad, 0)
            .toFixed(r.tienePlanCorte ? 0 : 2)}
          sub={r.tienePlanCorte ? "según plan de corte" : "consumo teórico"}
        />
        <Stat label="Canto total" value={`${fmt(r.cantoMetrosTotal)} m`} />
        <Stat
          label="Consumo"
          value={r.tienePlanCorte ? "Optimizado" : "Teórico"}
          sub={r.tienePlanCorte ? "merma distribuida por área" : "ejecuta la optimización"}
        />
      </div>

      <Card title="Tableros por material">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="py-1.5 pr-3">Material</th>
              <th className="py-1.5 pr-3">Color</th>
              <th className="py-1.5 pr-3 text-right">Espesor</th>
              <th className="py-1.5 text-right">Tableros</th>
            </tr>
          </thead>
          <tbody>
            {r.totalTableros.map((t, i) => (
              <tr key={i} className="border-b border-zinc-800/50">
                <td className="py-1.5 pr-3">{MATERIAL_LABEL[t.material] ?? t.material}</td>
                <td className="py-1.5 pr-3 text-zinc-400">{t.color || "—"}</td>
                <td className="py-1.5 pr-3 text-right">{t.espesor} mm</td>
                <td className="py-1.5 text-right font-medium">
                  {r.tienePlanCorte ? t.cantidad : fmt(t.cantidad)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {r.productos.map((prod) => (
        <Card
          key={prod.id}
          title={`${prod.ambiente} — ${prod.nombre} (${fmt(prod.cantidad, prod.unidad === "metro lineal" ? 2 : 0)} ${prod.unidad})`}
        >
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <h4 className="mb-1.5 text-xs font-semibold text-zinc-400">Tableros</h4>
              <ul className="space-y-1 text-sm">
                {prod.tableros.map((t, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-zinc-400">
                      {MATERIAL_LABEL[t.material]} {t.espesor}mm
                    </span>
                    <span>
                      {fmt(t.optimizado)} tab.{" "}
                      <span className="text-zinc-500">
                        (teórico {fmt(t.teorico)}, merma {fmt(t.merma)})
                      </span>
                    </span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-zinc-800 pt-1">
                  <span className="text-zinc-400">Canto ({fmt(prod.cantoMetros)} m)</span>
                  <span>{usd(prod.cantoCosto)}</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-1.5 text-xs font-semibold text-zinc-400">Herrajes</h4>
              <ul className="space-y-1 text-sm">
                {prod.herrajes.map((h, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-zinc-400">
                      {h.nombre} × {h.cantidad}
                    </span>
                    <span>{usd(h.costo)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-1.5 text-xs font-semibold text-zinc-400">Accesorios y total</h4>
              <ul className="space-y-1 text-sm">
                {prod.accesorios.map((a, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-zinc-400">
                      {a.nombre} × {fmt(a.cantidad, 0)}
                    </span>
                    <span>{usd(a.costo)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-zinc-800 pt-1 font-semibold">
                  <span>Costo del producto</span>
                  <span className="text-amber-400">{usd(prod.costoTotal)}</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      ))}

      {r.accesoriosSinAsignar.length > 0 && (
        <Card title="Accesorios sin asignar a producto">
          <ul className="space-y-1 text-sm">
            {r.accesoriosSinAsignar.map((a, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-zinc-400">
                  {a.nombre} × {fmt(a.cantidad, 1)}
                </span>
                <span>{usd(a.costo)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-zinc-600">
        Precios de prueba (editables en Configuración): melamina color {usd(cfg.precios.tableroColor)} ·
        blanca {usd(cfg.precios.tableroBlanco)} · canto {usd(cfg.precios.cantoMetro)}/m · herraje pequeño{" "}
        {usd(cfg.precios.herrajePequeno)} · mediano {usd(cfg.precios.herrajeMediano)} · jaladera{" "}
        {usd(cfg.precios.jaladera)}.
      </p>
    </div>
  );
}
