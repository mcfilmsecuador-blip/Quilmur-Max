import Link from "next/link";

export const ESTADOS: Record<string, { label: string; color: string }> = {
  BORRADOR: { label: "Borrador", color: "bg-zinc-700 text-zinc-200" },
  PDF_CARGADO: { label: "PDF cargado", color: "bg-sky-900 text-sky-200" },
  EN_ANALISIS: { label: "En análisis", color: "bg-indigo-900 text-indigo-200" },
  ANALISIS_COMPLETADO: { label: "Análisis completado", color: "bg-violet-900 text-violet-200" },
  REQUIERE_REVISION: { label: "Requiere revisión", color: "bg-red-900 text-red-200" },
  APROBADO_DESPIECE: { label: "Aprobado para despiece", color: "bg-teal-900 text-teal-200" },
  DESPIECE_GENERADO: { label: "Despiece generado", color: "bg-cyan-900 text-cyan-200" },
  LISTO_PRODUCCION: { label: "Listo para producción", color: "bg-lime-900 text-lime-200" },
  APROBADO_PRODUCCION: { label: "Aprobado · en producción", color: "bg-green-900 text-green-200" },
  CERRADO: { label: "Cerrado", color: "bg-zinc-800 text-zinc-400" },
};

export function EstadoBadge({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? { label: estado, color: "bg-zinc-700 text-zinc-200" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${e.color}`}>
      {e.label}
    </span>
  );
}

export const CONFIANZAS: Record<string, string> = {
  ALTA: "bg-green-900/60 text-green-300 border-green-800",
  MEDIA: "bg-amber-900/60 text-amber-300 border-amber-800",
  BAJA: "bg-orange-900/60 text-orange-300 border-orange-800",
  NO_IDENTIFICADO: "bg-red-900/60 text-red-300 border-red-800",
};

export function ConfianzaBadge({ nivel }: { nivel: string }) {
  const cls = CONFIANZAS[nivel] ?? CONFIANZAS.MEDIA;
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {nivel.replace("_", " ")}
    </span>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 ${className}`}>
      {title && (
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-[11px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export function BotonPrimario({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

export function BotonSecundario({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

export function LinkBoton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
    >
      {children}
    </Link>
  );
}

export const fmt = (n: number, dec = 2) =>
  n.toLocaleString("es-EC", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const usd = (n: number) => `$ ${fmt(n)}`;

export const MATERIAL_LABEL: Record<string, string> = {
  melamina_color: "Melamina de color",
  melamina_blanca: "Melamina blanca",
};
