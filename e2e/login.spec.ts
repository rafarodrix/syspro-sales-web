import { expect, test } from "@playwright/test";

test("exibe o portal de login", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveTitle(/SysproERP Reports/i);
  await expect(page.getByText("Portal de Inteligência Comercial", { exact: true })).toBeVisible();
  await expect(page.getByLabel("E-mail Corporativo")).toBeVisible();
  await expect(page.getByLabel("Senha de Acesso")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar no Sistema" })).toBeVisible();
});

test("redireciona visitante de rota protegida para o login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByText("Portal de Inteligência Comercial", { exact: true })).toBeVisible();
});
