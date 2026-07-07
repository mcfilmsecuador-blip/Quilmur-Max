import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { CutPlan } from "@/lib/optimizer";
import { optimizarProyecto } from "@/lib/actions";
import { BotonSecundario, Card, MATERIAL_LABEL, fmt } from "@/components/ui";

export const dynamic = "force-dynamic";

const COLORS = [
  "#f59e0b55",
  "#38bdf855",
  "#a3e63555",
  "#f4717155",
  "#c084fc55",
  "#2dd4bf55",
  "#fb923c55",
];

export default async function OptimizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await db.project.findUnique({ where: { id } });
  if (!p) notFound();

  const plan: CutPlan | null = p.cutPlanJson ? JSON.parse(p.cutPlanJson) : null;

  if (!plan) {
    return (
      <Card>
        <p className="mb-4 text-sm text-zinc-400">
          Aún no hay plan de corte. Genera primero el despiece y luego ejecuta la optimización.
        </p>
        {["DESPIECE_GENERADO", "LISTO_PRODUCCION", "APROBADO_PRODUCCION"].includes(p.estado) && (
          <form action={optimizarProyecto.bind(null, p.id)}>
            <BotonSecundario>Optimizar corte</BotonSecundario>
          </form>
        )}
      </Card>
    );
  }

  const { largo: TL, ancho: TA } = plan.tablero;
  const scale = 0.22;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          Tablero {TL} × {TA} mm ({fmt((TL * TA) / 1_000_000, 3)} m²) · plan generado{" "}
          {new Date(plan.generado).toLocaleString("es-EC")}
        </p>
        <form action={optimizarProyecto.bind(null, p.id)}>
          <BotonSecundario>Reoptimizar</BotonSecundario>
        </form>
      </div>

      {plan.grupos.map((g, gi) => (
        <Card
          key={gi}
          title={`${MATERIAL_LABEL[g.material] ?? g.material}${g.color && g.color !== "Blanco" ? ` · ${g.color}` : ""} · ${g.espesor} mm`}
        >
          <div className="mb-3 flex flex-wrap gap-4 text-sm">
            <span>
              Tableros: <b>{g.tableros.length}</b>
            </span>
            <span>
              Área de piezas: <b>{fmt(g.areaPiezas / 1_000_000)} m²</b>
            </span>
            <span>
              Aprovechamiento: <b>{fmt(g.aprovechamiento * 100, 1)}%</b>
            </span>
            <span>
              Desperdicio: <b>{fmt((1 - g.aprovechamiento) * 100, 1)}%</b>
            </span>
            <span>
              Retazos recuperables: <b>{g.retazos.length}</b>
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            {g.tableros.map((t, ti) => (
              <div key={ti}>
                <div className="mb-1 text-xs text-zinc-500">
                  Tablero {ti + 1} · {fmt((t.areaUsada / (TL * TA)) * 100, 1)}% usado
                </div>
                <svg
                  width={TL * scale}
                  height={TA * scale}
                  viewBox={`0 0 ${TL} ${TA}`}
                  className="rounded border border-zinc-700 bg-zinc-950"
                >
                  {t.placements.map((pl, pi) => (
                    <g key={pi}>
                      <rect
                        x={pl.x + 10}
                        y={pl.y + 10}
                        width={pl.w}
                        height={pl.h}
                        fill={COLORS[pi % COLORS.length]}
                        stroke="#d4d4d8"
                        strokeWidth={4}
                      />
                      <text
                        x={pl.x + 10 + pl.w / 2}
                        y={pl.y + 10 + pl.h / 2 - 20}
                        textAnchor="middle"
                        fill="#e4e4e7"
                        fontSize={Math.min(64, pl.h / 3)}
                      >
                        {pl.moduloCodigo}
                      </text>
                      <text
                        x={pl.x + 10 + pl.w / 2}
                        y={pl.y + 10 + pl.h / 2 + 45}
                        textAnchor="middle"
                        fill="#a1a1aa"
                        fontSize={Math.min(52, pl.h / 4)}
                      >
                        {pl.w}×{pl.h}
                        {pl.rotada ? " ↻" : ""}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ))}
          </div>
          {g.retazos.length > 0 && (
            <div className="mt-3 text-xs text-zinc-500">
              Retazos: {g.retazos.map((r) => `${r.largo}×${r.ancho}`).join(" · ")} mm
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
