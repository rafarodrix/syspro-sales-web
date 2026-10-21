import { expect, test } from "@playwright/test";

/**
 * Regressões de navegação dos relatórios.
 * Não depende de dados do Syspro: valida estrutura, seletor de visão e menu.
 */

test("menu de relatórios não tem mais a aba redundante de descontos", async ({ page }) => {
  await page.goto("/relatorios");

  const menuRelatorios = page.getByRole("link", { name: "Curva ABC" });
  await expect(menuRelatorios.first()).toBeVisible();

  await expect(page.getByRole("link", { name: "Vendas & Margem" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Descontos/ })).toHaveCount(0);
});

test("cada visão do relatório mantém o seletor acessível (não fica preso)", async ({ page }) => {
  await page.goto("/relatorios?aba=departamentos");

  const seletorResumo = page.getByRole("button", { name: "Resumo" }).first();
  const seletorComparativo = page.getByRole("button", { name: "Comparativo" }).first();

  await expect(seletorResumo).toBeVisible();

  // Comparativo sem período comparado não renderiza tabela — o seletor precisa continuar ali.
  await seletorComparativo.click();
  await expect(seletorComparativo).toBeVisible();
  await expect(seletorResumo).toBeVisible();

  // E precisa ser possível voltar.
  await seletorResumo.click();
  await expect(seletorResumo).toBeVisible();
});

test("período e comparação ficam no painel de consulta com botão Consultar", async ({ page }) => {
  await page.goto("/relatorios");

  await expect(page.getByRole("button", { name: "Consultar" }).first()).toBeVisible();
  await expect(page.getByText("Período", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Comparação", { exact: true }).first()).toBeVisible();
});
