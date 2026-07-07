import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MODULE_TEMPLATES } from "@/lib/templates";
import RevisionClient from "./RevisionClient";

export const dynamic = "force-dynamic";

export default async function RevisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await db.project.findUnique({
    where: { id },
    include: {
      ambientes: {
        include: { productos: { include: { modulos: { orderBy: { codigo: "asc" } } } } },
      },
      observaciones: true,
    },
  });
  if (!p) notFound();

  return (
    <RevisionClient
      proyecto={JSON.parse(JSON.stringify(p))}
      templates={MODULE_TEMPLATES.map((t) => ({ key: t.key, nombre: t.nombre, categoria: t.categoria }))}
    />
  );
}
