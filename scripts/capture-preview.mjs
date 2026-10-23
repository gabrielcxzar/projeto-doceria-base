import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
const output = new URL("../docs/design/aplicacao/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
for (const [file, url, viewport, sale] of [
  ["painel-desktop.png", "/?demo=1", { width: 1440, height: 1050 }, false],
  ["venda-celular.png", "/?demo=1#vendas", { width: 390, height: 844 }, true],
  ["login-desktop.png", "/?demo=login", { width: 1440, height: 1000 }, false],
]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.goto(`http://127.0.0.1:5173${url}`);
  await page
    .getByRole("button", {
      name: sale
        ? "Registrar venda"
        : url.includes("login")
          ? "Entrar"
          : "Abrir navegação",
      exact: true,
    })
    .count();
  if (sale) {
    await page
      .getByRole("button", { name: "Registrar venda", exact: true })
      .click();
    await page.getByLabel("Cliente", { exact: true }).selectOption("c1");
    await page.getByLabel("Produto", { exact: true }).selectOption("p2");
    await page.getByLabel("Quantidade", { exact: true }).fill("3");
  } else
    await page
      .getByRole("heading", {
        name: url.includes("login") ? "Que bom ter você aqui." : /Marina/,
      })
      .waitFor();
  await page.screenshot({
    path: fileURLToPath(new URL(file, output)),
    fullPage: !sale,
  });
  await page.close();
}
await browser.close();
