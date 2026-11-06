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

test("cada visão do relatório mantém a navegação de relatórios acessível", async ({ page }) => {
  await page.goto("/relatorios?aba=departamentos");

  const destino = page.getByRole("link", { name: "Cidade e UF" }).first();
  await expect(destino).toBeVisible();
  await destino.click();
  await expect(page).toHaveURL(/aba=geografico/);
  await expect(page.getByRole("link", { name: "Cidade e UF" }).first()).toBeVisible();
});

test("período e comparação ficam no painel de consulta com botão Consultar", async ({ page }) => {
  await page.goto("/relatorios");

  await expect(page.getByRole("button", { name: "Consultar" }).first()).toBeVisible();
  await expect(page.getByText("Período", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Comparação", { exact: true }).first()).toBeVisible();
});
