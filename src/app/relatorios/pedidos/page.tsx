import { redirect } from "next/navigation";

/** Rota antiga — o relatório passou a ser "Análise de Entrega". */
export default async function PedidosRedirect({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa } = await searchParams;
  redirect(empresa ? `/relatorios/entregas?empresa=${encodeURIComponent(empresa)}` : "/relatorios/entregas");
}
