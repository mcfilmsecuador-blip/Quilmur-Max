import { getConfig } from "@/lib/config";
import { guardarConfiguracion, restaurarConfiguracion } from "@/lib/actions";
import { BotonPrimario, BotonSecundario, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none";

function Campo({
  name,
  label,
  value,
  step = "1",
}: {
  name: string;
  label: string;
  value: number;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-[11px] font-medium text-zinc-400">{label}</label>
      <input name={name} type="number" step={step} defaultValue={value} className={inputCls} />
    </div>
  );
}

export default async function ConfiguracionPage() {
  const cfg = await getConfig();

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-zinc-500">
          Reglas constructivas, tablero, sierra y precios. Todos los valores son editables
          (sección 39 de la especificación).
        </p>
      </header>

      <form action={guardarConfiguracion} className="space-y-5">
        <Card title="Tablero estándar">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Campo name="tablero.largo" label="Largo (mm)" value={cfg.tablero.largo} />
            <Campo name="tablero.ancho" label="Ancho (mm)" value={cfg.tablero.ancho} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Área: {((cfg.tablero.largo * cfg.tablero.ancho) / 1_000_000).toFixed(3)} m²
          </p>
        </Card>

        <Card title="Sierra y optimización">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Campo name="sierra.kerf" label="Ancho de sierra (mm)" value={cfg.sierra.kerf} />
            <Campo name="sierra.margen" label="Margen del tablero (mm)" value={cfg.sierra.margen} />
            <Campo
              name="sierra.retazoMinimo"
              label="Retazo mínimo reutilizable (mm)"
              value={cfg.sierra.retazoMinimo}
            />
          </div>
        </Card>

        <Card title="Reglas constructivas">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Campo name="reglas.espesor" label="Espesor tablero (mm)" value={cfg.reglas.espesor} />
            <Campo name="reglas.espesorFondo" label="Espesor fondo (mm)" value={cfg.reglas.espesorFondo} />
            <Campo name="reglas.holguraPuerta" label="Holgura de puerta (mm)" value={cfg.reglas.holguraPuerta} />
            <Campo name="reglas.separacionFrentes" label="Separación frentes (mm)" value={cfg.reglas.separacionFrentes} />
            <Campo name="reglas.holguraRepisa" label="Holgura repisa (mm)" value={cfg.reglas.holguraRepisa} />
            <Campo name="reglas.retranqueoRepisa" label="Retranqueo repisa (mm)" value={cfg.reglas.retranqueoRepisa} />
            <Campo name="reglas.alturaZocalo" label="Altura zócalo (mm)" value={cfg.reglas.alturaZocalo} />
            <Campo name="reglas.alturaLateralCajon" label="Alto lateral cajón (mm)" value={cfg.reglas.alturaLateralCajon} />
            <Campo name="reglas.descuentoProfCajon" label="Descuento prof. cajón (mm)" value={cfg.reglas.descuentoProfCajon} />
            <Campo name="reglas.desperdicioCantoPct" label="Desperdicio de canto (%)" value={cfg.reglas.desperdicioCantoPct} />
          </div>
        </Card>

        <Card title="Precios (USD)">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Campo name="precios.tableroColor" label="Tablero melamina color" value={cfg.precios.tableroColor} step="0.01" />
            <Campo name="precios.tableroBlanco" label="Tablero melamina blanca" value={cfg.precios.tableroBlanco} step="0.01" />
            <Campo name="precios.herrajePequeno" label="Herraje pequeño (u)" value={cfg.precios.herrajePequeno} step="0.01" />
            <Campo name="precios.herrajeMediano" label="Herraje mediano (u)" value={cfg.precios.herrajeMediano} step="0.01" />
            <Campo name="precios.jaladera" label="Jaladera (u)" value={cfg.precios.jaladera} step="0.01" />
            <Campo name="precios.cantoMetro" label="Canto (metro lineal)" value={cfg.precios.cantoMetro} step="0.01" />
          </div>
        </Card>

        <div className="flex gap-3">
          <BotonPrimario>Guardar configuración</BotonPrimario>
        </div>
      </form>
      <form action={restaurarConfiguracion}>
        <BotonSecundario>Restaurar valores por defecto</BotonSecundario>
      </form>
    </div>
  );
}
