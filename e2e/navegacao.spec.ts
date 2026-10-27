import { expect, test } from "@playwright/test";

test("estoque usa uma tela única para o Kardex por grupo de estoque", async ({ page }) => {
  await page.goto("/estoque");

  await expect(page.getByText("Movimentações de Estoque")).toBeVisible();
  await expect(page.getByRole("button", { name: "Consultar" }).first()).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByText(/Todos os demais grupos retornados pelo Kardex/)).toBeVisible();
});

test("vendas abre com o painel de consulta e o resumo de filtros", async ({ page }) => {
  await page.goto("/vendas");

  await expect(page.getByRole("button", { name: "Consultar" }).first()).toBeVisible();
  await expect(page.getByText("Consulta de Vendas")).toBeVisible();
});
