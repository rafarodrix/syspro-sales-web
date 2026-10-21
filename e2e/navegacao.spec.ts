import { expect, test } from "@playwright/test";

/**
 * Estoque é módulo operacional: Kardex, devoluções e transferências.
 * A aba "Posição por produto" foi removida por duplicar a Análise de Compras.
 */
test("estoque expõe apenas as abas operacionais", async ({ page }) => {
  await page.goto("/estoque");

  const abas = page.getByRole("tab");
  await expect(abas.filter({ hasText: "Movimentações" })).toBeVisible();
  await expect(abas.filter({ hasText: "Devoluções" })).toBeVisible();
  await expect(abas.filter({ hasText: "Transferências" })).toBeVisible();
  await expect(abas.filter({ hasText: "Posição por produto" })).toHaveCount(0);

  // Aviso aponta para a Análise de Compras, que passou a ser dona da posição.
  await expect(page.getByRole("link", { name: "Análise de Compras" }).first()).toBeVisible();
});

test("vendas abre com o painel de consulta e o resumo de filtros", async ({ page }) => {
  await page.goto("/vendas");

  await expect(page.getByRole("button", { name: "Consultar" }).first()).toBeVisible();
  await expect(page.getByText("Consulta de Vendas")).toBeVisible();
});
