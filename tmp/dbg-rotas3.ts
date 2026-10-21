/** Sonda: rotas pagar/receber/producao por empresa + campos retornados. */
import "dotenv/config";
import { prisma } from "../src/lib/database";

const ROTAS = ["titulo/pagar", "receber", "producao"] as const;

function isoParaBr(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

async function main() {
  const empresas = await prisma.empresa.findMany({ where: { ativa: true } });
  const hoje = new Date();
  const inicio = new Date(hoje.getTime() - 30 * 86_400_000);

  for (const empresa of empresas) {
    if (!empresa.sysproBaseUrl) continue;
    const base = empresa.sysproBaseUrl.replace(/\/$/, "");
    const prefixo = empresa.sysproUseIis === true
      ? base.includes("sysproserverisapi.dll") ? "" : "/sysproserverisapi.dll/api/exporta"
      : base.includes("/api/exporta") ? "" : "/api/exporta";
    console.log(`\n### ${empresa.razaoSocial} (codigo ${empresa.empresaCodigo})`);

    for (const rota of ROTAS) {
      const url = `${base}${prefixo}/${rota}?dt_inicial=${isoParaBr(inicio.toISOString().slice(0, 10))}&dt_final=${isoParaBr(hoje.toISOString().slice(0, 10))}&empresa_codigo=${empresa.empresaCodigo}`;
      try {
        const resposta = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (resposta.status !== 200) {
          const texto = (await resposta.text()).slice(0, 60).replace(/\s+/g, " ");
          console.log(`  ${rota}: ${resposta.status} | ${texto}`);
          continue;
        }
        const json = (await resposta.json()) as unknown;
        const registros = Array.isArray(json) ? json : [json];
        console.log(`  ${rota}: 200 | registros=${registros.length}`);
        if (registros.length) {
          const chaves = new Set<string>();
          for (const registro of registros.slice(0, 50)) {
            if (registro && typeof registro === "object") for (const chave of Object.keys(registro)) chaves.add(chave);
          }
          console.log(`    campos (${chaves.size}): ${[...chaves].sort().join(", ")}`);
          console.log(`    exemplo: ${JSON.stringify(registros[0]).slice(0, 400)}`);
        }
      } catch (erro) {
        console.log(`  ${rota}: ERRO ${erro instanceof Error ? erro.message.slice(0, 50) : "?"}`);
      }
    }
  }
}

void main().then(() => prisma.$disconnect());
