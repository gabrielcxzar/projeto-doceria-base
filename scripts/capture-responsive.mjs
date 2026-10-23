import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Executar com npm run dev na porta 5173. Somente fixtures locais.
const output = new URL("../docs/design/responsividade/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
try {
  for (const [name, width, height, screen] of [
    ["login-celular", 390, 844, "login"],
    ["painel-celular", 390, 844, "dashboard"],
    ["menu-celular", 390, 844, "menu"],
    ["menu-notebook", 1366, 600, "menu"],
    ["venda-paisagem", 844, 390, "sale"],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:5173/?demo=${screen === "login" ? "login" : "1"}${screen === "sale" ? "#vendas" : ""}`);
    await page.getByRole("heading").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (screen === "menu") {
      const toggle = page.getByRole("button", { name: "Abrir navegação", exact: true });
      if (await toggle.isVisible()) await toggle.click();
      await page.getByRole("button", { name: "Sair", exact: true }).scrollIntoViewIfNeeded();
    } else if (screen === "sale") {
      await page.getByRole("button", { name: "Registrar venda", exact: true }).click();
      await page.getByLabel("Cliente", { exact: true }).selectOption("c1");
      await page.getByLabel("Produto", { exact: true }).selectOption("p2");
      await page.getByLabel("Quantidade", { exact: true }).fill("3");
      await page.getByRole("button", { name: "Salvar", exact: true }).scrollIntoViewIfNeeded();
    }
    await page.screenshot({
      path: fileURLToPath(new URL(`${name}.png`, output)),
      fullPage: screen === "dashboard" || screen === "login",
      animations: "disabled",
    });
    await page.close();
  }
} finally {
  await browser.close();
}
