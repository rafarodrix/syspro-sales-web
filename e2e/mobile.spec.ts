import { expect, test } from "@playwright/test";

const rotas = ["/dashboard", "/vendas", "/relatorios"];

for (const rota of rotas) {
  test(`${rota} permanece utilizável em viewport mobile`, async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (erro) => erros.push(erro.message));
    page.on("console", (mensagem) => {
      if (mensagem.type() === "error") erros.push(mensagem.text());
    });

    await page.goto(rota);
    await expect(page.locator("main")).toBeVisible();

    const dimensoes = await page.evaluate(() => ({
      largura: document.documentElement.clientWidth,
      conteudo: document.documentElement.scrollWidth,
    }));
    expect(dimensoes.conteudo).toBeLessThanOrEqual(dimensoes.largura + 1);

    const menu = page.getByRole("button", { name: "Abrir menu" });
    await expect(menu).toBeVisible();
    const caixa = await menu.boundingBox();
    expect(caixa?.width).toBeGreaterThanOrEqual(44);
    expect(caixa?.height).toBeGreaterThanOrEqual(44);

    if (rota === "/dashboard") {
      await expect(page.getByRole("combobox", { name: "Comparar com" })).toContainText("Mesmo intervalo");
    }

    await menu.click();
    await expect(page.getByRole("dialog", { name: "Navegação principal" })).toBeVisible();
    await page.getByRole("button", { name: "Fechar menu" }).click();
    await expect(page.getByRole("dialog", { name: "Navegação principal" })).toHaveCount(0);
    expect(erros).toEqual([]);
  });
}
