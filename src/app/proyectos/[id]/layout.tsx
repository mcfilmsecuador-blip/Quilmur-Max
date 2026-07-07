import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EstadoBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

const TABS = [
  { seg: "", label: "Resumen" },
  { seg: "revision", label: "Revisión" },
  { seg: "despiece", label: "Despiece" },
  { seg: "optimizacion", label: "Optimización" },
  { seg: "costos", label: "Costos" },
  { seg: "reportes", label: "Reportes" },
];

export default async function ProyectoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyecto = await db.project.findUnique({ where: { id } });
  if (!proyecto) notFound();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-500">
            <Link href="/proyectos" className="hover:text-zinc-300">
              Proyectos
            </Link>{" "}
            / {proyecto.cliente || "—"}
          </div>
          <h1 className="text-2xl font-bold">{proyecto.nombre}</h1>
        </div>
        <div className="flex items-center gap-3">
          {proyecto.analisisDemo && (
            <span className="rounded-full border border-amber-700 bg-amber-950 px-2.5 py-0.5 text-xs text-amber-300">
              Análisis DEMO (sin ANTHROPIC_API_KEY)
            </span>
          )}
          <EstadoBadge estado={proyecto.estado} />
        </div>
      </header>

      <nav className="flex gap-1 border-b border-zinc-800 text-sm">
        {TABS.map((t) => (
          <Link
            key={t.seg}
            href={`/proyectos/${id}${t.seg ? `/${t.seg}` : ""}`}
            className="rounded-t-lg px-4 py-2 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
