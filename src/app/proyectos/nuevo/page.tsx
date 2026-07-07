import { crearProyecto } from "@/lib/actions";
import { BotonPrimario, Card } from "@/components/ui";

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none";

export default function NuevoProyecto() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Nuevo proyecto</h1>
        <p className="text-sm text-zinc-500">
          Crea el proyecto y luego carga el PDF técnico para analizarlo.
        </p>
      </header>
      <Card>
        <form action={crearProyecto} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Nombre del proyecto *
            </label>
            <input name="nombre" required placeholder="Cocina Diego Monje" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Cliente</label>
            <input name="cliente" placeholder="Diego Monje" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Diseñador</label>
            <input name="disenador" placeholder="Quilmur Diseño" className={inputCls} />
          </div>
          <BotonPrimario>Crear proyecto</BotonPrimario>
        </form>
      </Card>
    </div>
  );
}
