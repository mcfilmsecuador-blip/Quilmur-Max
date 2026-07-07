import Link from "next/link";
import { db } from "@/lib/db";
import { Card, EstadoBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Proyectos() {
  const proyectos = await db.project.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proyectos</h1>
          <p className="text-sm text-zinc-500">{proyectos.length} proyectos registrados</p>
        </div>
        <Link
          href="/proyectos/nuevo"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          + Nuevo proyecto
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {proyectos.map((p) => (
          <Link key={p.id} href={`/proyectos/${p.id}`}>
            <Card className="hover:border-amber-500/40 transition-colors h-full">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{p.nombre}</div>
                  <div className="text-sm text-zinc-500">{p.cliente || "Sin cliente"}</div>
                </div>
                <EstadoBadge estado={p.estado} />
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                {p.pdfNombre
                  ? `PDF: ${p.pdfNombre} · ${p.pdfPaginas} pág. · v${p.pdfVersion}`
                  : "Sin PDF cargado"}
              </div>
            </Card>
          </Link>
        ))}
        {proyectos.length === 0 && (
          <p className="text-sm text-zinc-500">No hay proyectos. Crea el primero.</p>
        )}
      </div>
    </div>
  );
}
