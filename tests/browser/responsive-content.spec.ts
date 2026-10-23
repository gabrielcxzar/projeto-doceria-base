import { expect, test } from "@playwright/test";

test("nomes extensos e valores altos não cortam campos, totais ou ações", async ({ page }) => {
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1"
    ? route.continue() : route.abort());
  await page.goto("/?demo=1#cadastros");
  await page.getByRole("button", { name: "Cadastrar cliente", exact: true }).click();
  const name = "CLIENTE DE TESTE " + "N".repeat(100);
  let dialog = page.locator("dialog[open]");
  await dialog.getByLabel("Nome", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir navegação", exact: true }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Vendas", exact: true }).click();
  await page.getByRole("button", { name: "Registrar venda", exact: true }).click();
  dialog = page.locator("dialog[open]");
  await dialog.getByLabel("Cliente", { exact: true }).selectOption({ label: name });
  await dialog.getByLabel("Produto", { exact: true }).selectOption("p2");
  await dialog.getByLabel("Quantidade", { exact: true }).fill("1000");
  await dialog.getByLabel("Preço unitário (R$)", { exact: true }).fill("9999.99");
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  const region = page.locator(".table-scroll");
  await region.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  const action = page.getByRole("button", { name: `Excluir venda de ${name}`, exact: true });
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeInViewport();
  await page.getByRole("button", { name: "Abrir navegação", exact: true }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Visão geral", exact: true }).click();
  for (const area of ["Visão geral", "Financeiro", "Relatórios"]) {
    const toggle = page.getByRole("button", { name: "Abrir navegação", exact: true });
    if (await toggle.isVisible()) await toggle.click();
    await page.getByRole("navigation").getByRole("button", { name: area, exact: true }).click();
    for (const width of [320, 390, 568, 768, 901, 1024, 1280, 1366, 1920]) {
      await page.setViewportSize({ width, height: 700 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${area}: página em ${width}px`).toBe(true);
      expect(await page.locator(".metric, .simple-list li, .panel-header").evaluateAll((elements) => elements
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => ({ className: element.className, width: element.clientWidth, content: element.scrollWidth }))), `${area}: conteúdo em ${width}px`).toEqual([]);
      expect(await page.locator(".long-amount").evaluateAll((elements) => elements.every((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect().height <= parseFloat(getComputedStyle(element).lineHeight) * 1.3;
      })), `${area}: total sem quebra em ${width}px`).toBe(true);
    }
  }
});
