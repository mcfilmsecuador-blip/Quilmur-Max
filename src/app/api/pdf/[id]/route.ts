import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const p = await db.project.findUnique({ where: { id } });
  if (!p?.pdfPath) return new NextResponse("Sin PDF", { status: 404 });
  try {
    const data = await fs.readFile(p.pdfPath);
    const nombre = (p.pdfNombre ?? "documento.pdf").normalize("NFC");
    // el nombre puede traer tildes/ñ; los headers HTTP solo aceptan ASCII,
    // así que se manda un fallback ASCII más filename* codificado (RFC 5987/6266)
    const nombreAscii = nombre.replace(/[^\x20-\x7E]/g, "_");
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nombreAscii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      },
    });
  } catch {
    return new NextResponse("Archivo no encontrado", { status: 404 });
  }
}
