import { expect, test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const ARQUIVO_SESSAO = "e2e/.auth/user.json";

const email = process.env.SEED_ADMIN_EMAIL ?? "e2e@trilink.local";
const senha = process.env.SEED_ADMIN_PASSWORD ?? "e2e-senha-forte-123";

/**
 * Autentica uma vez e reaproveita a sessão nos demais testes.
 * O usuário vem de `prisma/seed.ts` (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).
 */
setup("autentica usuário de teste", async ({ page }) => {
  mkdirSync(dirname(ARQUIVO_SESSAO), { recursive: true });

  await page.goto("/login");
  await page.getByLabel("E-mail Corporativo").fill(email);
  await page.getByLabel("Senha de Acesso").fill(senha);
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();

  await expect(page).toHaveURL(/\/(dashboard|vendas|relatorios)/, { timeout: 30_000 });
  await page.context().storageState({ path: ARQUIVO_SESSAO });
});
