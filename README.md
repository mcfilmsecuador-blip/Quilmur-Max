# Quilmur Max · Plataforma de lanzamiento de producción

Transforma un PDF técnico de mobiliario en una orden de producción completa:
despiece, cantos, herrajes, optimización de tableros, costos y consumo por
producto terminado, con revisión humana obligatoria antes de aprobar.

**Flujo:** Cargar PDF → Analizar (IA) → Revisar/Corregir → Aprobar → Despiece → Optimización → Costos → Orden de producción → Baja de materia prima.

## Puesta en marcha (local)

1. Copia `.env.example` a `.env` y completa `DATABASE_URL`/`DIRECT_URL` (Postgres),
   `BLOB_READ_WRITE_TOKEN` (Vercel Blob) y `ANTHROPIC_API_KEY`.
2. Instala y prepara la base:

```bash
npm install
npx prisma db push        # crea las tablas en Postgres
npm run dev                # http://localhost:3000
```

Sin `ANTHROPIC_API_KEY`, el análisis corre en **modo DEMO** con datos de
ejemplo (cocina residencial) para probar todo el flujo sin gastar créditos.

Prueba de flujo completo sin UI: `npx tsx scripts/test-flow.mts`

## Despliegue en Vercel

La app necesita dos servicios gratuitos conectados al proyecto de Vercel
(el sistema de archivos de Vercel es efímero: nada que se guarde en disco
sobrevive entre invocaciones, por eso ya no usa SQLite ni carpetas locales):

1. **Importa el repo** en [vercel.com/new](https://vercel.com/new) desde GitHub.
2. **Base de datos:** en el proyecto → *Storage* → *Create Database* → **Postgres**
   (o conecta una de Neon). Vercel inyecta automáticamente `DATABASE_URL` y
   `DIRECT_URL` (o `POSTGRES_URL`/`POSTGRES_URL_NON_POOLING` — en ese caso
   renómbralas a `DATABASE_URL`/`DIRECT_URL` en *Settings → Environment Variables*,
   que es como las lee `prisma/schema.prisma`).
3. **Almacenamiento de PDFs:** *Storage* → *Create Database* → **Blob**. Esto
   inyecta `BLOB_READ_WRITE_TOKEN` automáticamente.
4. Agrega `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL` en *Settings → Environment Variables*.
5. Antes del primer deploy (o desde tu máquina apuntando al `DATABASE_URL` de Vercel),
   corre `npx prisma db push` para crear las tablas.
6. Redeploy. La URL pública queda lista para compartir y probar el flujo completo.

## Arquitectura

- **Next.js 16 + TypeScript + Tailwind** (App Router, server actions).
- **Prisma + Postgres** (`prisma/schema.prisma`) — Vercel Postgres o Neon.
- **PDFs en Vercel Blob** (`@vercel/blob`), con versionado (v1, v2, …) y URL pública por versión.

Núcleo en `src/lib/`:

| Módulo | Responsabilidad |
|---|---|
| `analyze.ts` | Lectura multimodal del PDF con Claude: ambientes, productos terminados, módulos, medidas (mm), materiales/colores, electrodomésticos, accesorios, observaciones — cada dato con nivel de confianza y página de origen. La IA **no** genera piezas. |
| `templates.ts` | Biblioteca de ~35 módulos paramétricos (cocina, clósets, oficina, hogar). |
| `despiece.ts` | Motor de reglas: piezas (laterales, pisos, fondos, puertas, cajones…), cantos por lado (`2L1A`) y herrajes (bisagras por altura, rieles, jaladeras, soportes, patas, colgadores). |
| `optimizer.ts` | Optimización 2D guillotina (FFDH) por material/color/espesor, con kerf, márgenes, veta y retazos recuperables. |
| `costos.ts` | Consumo teórico vs. optimizado, merma distribuida por proporción de área, costos por producto terminado. |
| `config.ts` | Tablero 2440×2150, reglas constructivas y precios de prueba (sección 39), todo editable en `/configuracion`. |
| `actions.ts` | Server actions: flujo de estados del proyecto. |

Pantallas: Dashboard, Proyectos, Resumen del proyecto (flujo de 6 pasos),
Revisión (3 zonas: navegación / visor PDF con salto a página de origen /
edición y confirmación), Despiece, Optimización (planos de corte SVG), Costos,
Reportes (orden JSON, despiece CSV, baja de materia prima CSV/JSON), Configuración.

## Estado respecto a la especificación

Implementado (Fase 1 + parte de Fases 2-4): análisis IA multimodal con
confianza y trazabilidad de página, revisión obligatoria, motor paramétrico,
despiece, cantos, herrajes, optimización, costos, consumo por producto
terminado, baja de materia prima, versionado de PDF, estados del proyecto.

Pendiente para siguientes fases:
- Autenticación y roles (sección 48) — hoy es uso interno sin login.
- Visor PDF avanzado con resaltado de zonas/coordenadas (hoy: visor nativo con salto de página).
- Inventario con existencias y retazos persistentes (sección 41).
- Comparación de versiones del PDF (sección 46).
- Etiquetas con QR por pieza (sección 44) e integraciones Ardis/Teowin/Felder (sección 45).
- Mano de obra, transporte e instalación en costos.

**Antes de producción real**, validar con Quilmur las 25 preguntas de la
sección 60 (espesores, holguras, tipos de fondo, reglas de puertas/cajones,
método de merma, catálogos…) y ajustar `config.ts` / `despiece.ts`.
