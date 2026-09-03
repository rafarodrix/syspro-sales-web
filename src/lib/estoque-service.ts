import { consultarKardex } from "@/lib/syspro-api";
import {
  normalizarMovimentoKardex,
  validarPeriodoKardex,
  type MovimentoKardex,
} from "@/lib/kardex";
import { dataInputParaSyspro } from "@/lib/vendas";
import type { EmpresaInfo } from "@/lib/sales-service";

export class EstoqueQueryError extends Error {
  constructor(message: string, public status: 400 | 429) {
    super(message);
    this.name = "EstoqueQueryError";
  }
}

export async function obterMovimentosEstoque({
  empresa,
  dtInicial,
  dtFinal,
  signal,
}: {
  empresa: EmpresaInfo;
  dtInicial: string;
  dtFinal: string;
  signal?: AbortSignal;
}): Promise<MovimentoKardex[]> {
  if (!validarPeriodoKardex(dtInicial, dtFinal)) {
    throw new EstoqueQueryError("O Kardex permite consultas de no máximo 31 dias.", 400);
  }
  if (!empresa.sysproBaseUrl) {
    throw new EstoqueQueryError("A empresa selecionada não possui uma origem Syspro configurada.", 400);
  }

  const paraSyspro = (data: string) => data.includes("-") ? dataInputParaSyspro(data) : data;
  const dados = await consultarKardex({
    baseUrl: empresa.sysproBaseUrl,
    useIis: empresa.sysproUseIis === true || empresa.sysproUseIis === "true",
  }, {
    dtInicial: paraSyspro(dtInicial),
    dtFinal: paraSyspro(dtFinal),
  }, signal);

  return dados
    .map(normalizarMovimentoKardex)
    .filter((movimento) => movimento.empresaCodigo === empresa.empresaCodigo)
    .map((movimento) => ({
      ...movimento,
      empresaId: empresa.id,
      empresaCnpj: empresa.cnpj,
      empresaNome: empresa.razaoSocial,
    }));
}
