import { chromium } from "playwright";
import assert from "node:assert/strict";

const baseURL = "http://127.0.0.1:31987";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });

await page.goto(`${baseURL}/login`);
await page.getByLabel("E-mail Corporativo").fill("qa-stock-2258@example.local");
await page.getByLabel("Senha de Acesso").fill("QaStockPass!2026");
await page.getByRole("button", { name: "Entrar no Sistema" }).click();
await page.waitForURL(/\/dashboard/);

await page.goto(`${baseURL}/configuracoes`);
await page.getByText("Cobertura", { exact: true }).waitFor();
await page.getByTitle("Editar Configurações da Empresa").first().click();
const dialog = page.getByRole("dialog", { name: "Editar Empresa & Conexão Syspro" });
await dialog.getByText("Parâmetros de cobertura", { exact: true }).waitFor();
assert.equal(await dialog.getByLabel("Crítico abaixo de").inputValue(), "7");
assert.equal(await dialog.getByLabel("Atenção abaixo de").inputValue(), "15");
assert.equal(await dialog.getByLabel("Excesso acima de").inputValue(), "90");
assert.equal(await dialog.getByLabel("Alvo inicial de compras").inputValue(), "30");
await page.screenshot({ path: "C:/Users/rafael/AppData/Local/Temp/syspro-config-limites.png", fullPage: true });
await page.getByRole("button", { name: "Cancelar" }).click();

const posicao = {
  codigo: "AUX-001", produto: "Produto crítico", marca: "Marca QA", estoqueAtual: 4,
  quantidadeVendida: 20, quantidadeDevolvida: 2, valorVendido: 2000, valorDevolvido: 200,
  taxaDevolucaoQuantidade: 10, taxaDevolucaoValor: 10, demandaLiquida: 18, mediaDiaria: 1,
  coberturaDias: 4, custoAquisicaoMedio: 50, custoReposicaoMedio: 65,
  valorAquisicao: 200, valorReposicao: 260, ultimaEntrada: "2026-10-18",
  ultimaSaida: "2026-10-19", ultimoMovimento: "2026-10-19", situacao: "critico",
};
const resumo = {
  totalProdutos: 1, valorAquisicao: 200, valorReposicao: 260,
  produtosComCustoAquisicao: 1, produtosComCustoReposicao: 1,
  coberturaCustoAquisicao: 100, coberturaCustoReposicao: 100,
  rupturas: 0, baixaCobertura: 1, excesso: 0, semGiro: 0, saldosNegativos: 0,
  capitalExcesso: 0, taxaDevolucaoQuantidade: 10, taxaDevolucaoValor: 10,
  devolucoesVendaQuantidade: 2, devolucoesVendaValor: 200, movimentosSemProdutoId: 0,
};
await page.route("**/api/estoque", (route) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ movimentos: [], posicoes: [posicao], resumo, limites: { criticoDias: 5, atencaoDias: 20, excessoDias: 60 } }),
}));
await page.goto(`${baseURL}/estoque`);
await page.getByRole("button", { name: /Consultar/ }).click();
await page.getByText(/crítico abaixo de 5 dias.*atenção abaixo de 20 dias.*excesso acima de 60 dias/).waitFor();
await page.getByText("Produtos críticos ou em atenção, com menos de 20 dias", { exact: true }).waitFor();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Exportar visão" }).click();
await page.getByText("Planilha (CSV)", { exact: true }).click();
const download = await downloadPromise;
assert.match(download.suggestedFilename(), /^estoque-visao-geral-.*\.csv$/);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.screenshot({ path: "C:/Users/rafael/AppData/Local/Temp/syspro-estoque-padronizacao-final.png", fullPage: true });

await page.goto(`${baseURL}/vendas`);
await page.getByRole("main").getByText("Consulta de Vendas", { exact: true }).waitFor();
await page.getByText(/Selecione o período e aplique filtros/).waitFor();

await page.goto(`${baseURL}/relatorios?aba=curva-abc`);
await page.getByPlaceholder("Pesquisar registros desta visão...").waitFor();
await page.getByLabel("Classe ABC").waitFor();
await page.screenshot({ path: "C:/Users/rafael/AppData/Local/Temp/syspro-relatorios-filtros-final.png", fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseURL}/estoque`);
await page.getByRole("button", { name: /Consultar/ }).click();
const widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
assert.equal(widths.scroll, widths.client);
await page.screenshot({ path: "C:/Users/rafael/AppData/Local/Temp/syspro-estoque-padronizacao-mobile.png", fullPage: true });

console.log("QA_OK config=ok estoque_limites=ok estoque_export=ok vendas_header=ok relatorios_filtros=ok mobile=ok");
await browser.close();
