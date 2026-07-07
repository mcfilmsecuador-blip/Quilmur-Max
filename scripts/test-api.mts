// Verifica que la ANTHROPIC_API_KEY de .env funciona.
// Ejecutar: npx tsx scripts/test-api.mts
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

// carga .env sin dependencias
try {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ No hay ANTHROPIC_API_KEY en quilmur/.env");
    process.exit(1);
  }
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-fable-5";
  try {
    const r = await client.messages.create({
      model,
      max_tokens: 20,
      messages: [{ role: "user", content: "Responde solo: OK" }],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    console.log(`✓ API funcionando · modelo ${model} · respuesta: ${text.trim()}`);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 401) console.error("✗ Clave inválida (401). Revisa la key en .env");
    else if (err.status === 404) console.error(`✗ El modelo "${model}" no existe para tu cuenta. Prueba ANTHROPIC_MODEL=claude-sonnet-5 en .env`);
    else console.error("✗ Error:", err.status ?? "", err.message);
    process.exit(1);
  }
}
main();
