import { prisma } from "../src/lib/database";

const PERFIS_LEGADOS: Record<string, "gerente" | "vendas"> = {
  gerencia: "gerente",
  user: "vendas",
};

async function main() {
  for (const [legado, perfilAtual] of Object.entries(PERFIS_LEGADOS)) {
    const resultado = await prisma.user.updateMany({
      where: { role: legado },
      data: { role: perfilAtual },
    });
    if (resultado.count > 0) console.log(`${legado} → ${perfilAtual}: ${resultado.count} usuário(s)`);
  }

  const perfisInvalidos = await prisma.user.findMany({
    where: { role: { notIn: ["admin", "gerente", "supervisor", "vendas"] } },
    select: { id: true, email: true, role: true },
  });

  if (perfisInvalidos.length > 0) {
    const detalhes = perfisInvalidos.map((usuario) => `${usuario.email} (${usuario.role})`).join(", ");
    throw new Error(`Perfis não reconhecidos: ${detalhes}. Corrija-os antes de concluir a migração.`);
  }

  const perfis = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
  console.log(`Perfis válidos: ${perfis.map((item) => `${item.role}: ${item._count._all}`).join(", ") || "nenhum usuário"}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
