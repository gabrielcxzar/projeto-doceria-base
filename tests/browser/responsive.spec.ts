import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

async function fits(page: Page) {
  const bounds = await page.evaluate(() => ({
    actual: document.documentElement.scrollWidth,
    available: document.documentElement.clientWidth,
  }));
  expect(bounds.actual).toBeLessThanOrEqual(bounds.available + 1);
  // Detect content clipped inside cards/forms even when the document itself fits.
  const clipped = await page.locator(
    '.metric, .section-tools, .page-heading, .panel-header, .form-summary, .field, .recipe-add, .modal-footer',
  ).evaluateAll((elements) => elements.filter((element) =>
    element.getClientRects().length && element.scrollWidth > element.clientWidth + 2,
  ).map((element) => element.className));
  expect(clipped).toEqual([]);
}

async function reachable(control: Locator, page: Page) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
  expect(await control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const top = Math.max(0, box.top);
    const bottom = Math.min(innerHeight, box.bottom);
    const hit = document.elementFromPoint(box.x + box.width / 2, (top + bottom) / 2);
    return element === hit || element.contains(hit);
  })).toBe(true);
  await fits(page);
}

async function navigate(page: Page, name: string) {
  const toggle = page.getByRole("button", { name: "Abrir navegação", exact: true });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name, exact: true }).click();
  await expect(page.locator("#conteudo")).toBeVisible();
  await fits(page);
}

async function inspectDialog(page: Page) {
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  for (const control of await dialog.locator("input:visible, select:visible, textarea:visible, button:visible").all()) {
    await reachable(control, page);
  }
  await dialog.getByRole("button", { name: "Fechar janela", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function inspectTables(page: Page) {
  for (const region of await page.locator(".table-scroll").all()) {
    await region.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const lastCell = region.locator("tbody tr").first().locator("td").last();
    if (await lastCell.count()) {
      await lastCell.scrollIntoViewIfNeeded();
      await expect(lastCell).toBeInViewport();
    }
    await region.evaluate((element) => { element.scrollLeft = 0; });
  }
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" || url.protocol === "data:"
      ? route.continue() : route.abort();
  });
});

test("login e identidade original cabem e permitem acesso", async ({ page }) => {
  await page.goto("/?demo=login");
  const logo = page.getByRole("img", { name: "Logo da Lá Divino Sabor" }).filter({ visible: true });
  await expect(logo).toHaveCount(1);
  await reachable(logo, page);
  expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 1024)).toBe(true);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/images/logo.png");
  await reachable(page.getByLabel("E-mail", { exact: true }), page);
  await reachable(page.getByLabel("Senha", { exact: true }), page);
  await reachable(page.getByRole("button", { name: "Entrar", exact: true }), page);
});

test("menu rola até o fim e drawer controla foco, Escape e fundo", async ({ page }) => {
  await page.goto("/?demo=1");
  await expect(page.locator("#conteudo")).toBeVisible();
  const toggle = page.getByRole("button", { name: "Abrir navegação", exact: true });
  const compact = await toggle.isVisible();
  if (compact) await toggle.click();
  const side = page.locator(".sidebar");
  await expect(side.getByRole("img", { name: "Logo da Lá Divino Sabor" })).toBeVisible();
  expect(await side.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
  for (const title of ["Visão geral", "Vendas", "Encomendas", "Financeiro", "Cadastros", "Cobranças", "Relatórios"]) {
    await reachable(side.getByRole("button", { name: title, exact: true }), page);
  }
  await reachable(side.getByRole("button", { name: "Exportar arquivo completo", exact: true }), page);
  const exit = side.getByRole("button", { name: "Sair", exact: true });
  await reachable(exit, page);
  if (compact) {
    expect(await page.locator(".workspace").evaluate((element) => element.inert)).toBe(true);
    expect(await page.locator("body").evaluate((element) => getComputedStyle(element).overflow)).toBe("hidden");
    await exit.focus();
    await page.keyboard.press("Tab");
    await expect(side.getByRole("button", { name: "Fechar menu", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(exit).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(await page.locator("body").evaluate((element) => element.style.overflow)).toBe("");
    await toggle.click();
    await side.getByRole("button", { name: "Fechar menu", exact: true }).click();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.mouse.click(page.viewportSize()!.width - 8, page.viewportSize()!.height / 2);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: 1024, height: viewport.height });
    await expect(side).not.toHaveAttribute("role", "dialog");
    expect(await page.locator("body").evaluate((element) => element.style.overflow)).toBe("");
    await page.setViewportSize(viewport);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  } else {
    const workspace = page.locator(".workspace");
    const initialMargin = await workspace.evaluate((element) => element.getBoundingClientRect().x);
    const collapse = page.getByRole("button", { name: "Ocultar menu lateral", exact: true });
    await collapse.focus();
    await page.keyboard.press("Enter");
    await expect(side).toBeHidden();
    expect(await side.evaluate((element) => element.inert)).toBe(true);
    await expect(workspace).toHaveCSS("margin-left", "0px");
    expect(initialMargin).toBeGreaterThan(200);
    const expand = page.getByRole("button", { name: "Mostrar menu lateral", exact: true });
    await expect(expand).toBeFocused();
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".topbar .brand-logo")).toBeVisible();
    await fits(page);
    await page.keyboard.press("Enter");
    await expect(side).toBeVisible();
    await expect(collapse).toHaveAttribute("aria-expanded", "true");
    expect(await workspace.evaluate((element) => element.getBoundingClientRect().x)).toBe(initialMargin);
  }
  await navigate(page, "Relatórios");
});

test("todas as áreas, cadastros e diálogos mantêm controles acessíveis", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?demo=1");
  await fits(page);
  await page.getByRole("button", { name: /meta/i }).click();
  await inspectDialog(page);
  for (const [name, action] of [
    ["Vendas", "Registrar venda"], ["Encomendas", "Nova encomenda"], ["Financeiro", "Registrar despesa"],
  ]) {
    await navigate(page, name);
    await inspectTables(page);
    await page.getByRole("button", { name: action, exact: true }).click();
    await inspectDialog(page);
    if (name !== "Vendas") {
      await page.getByRole("button", { name: /^Editar / }).first().click();
      await inspectDialog(page);
    }
    await page.getByRole("button", { name: /^Excluir / }).first().click();
    await inspectDialog(page);
  }
  await navigate(page, "Cadastros");
  for (const [tab, action] of [
    ["Clientes", "cliente"], ["Produtos", "produto"], ["Receitas", "receita"],
    ["Ingredientes", "ingrediente"], ["Materiais", "material"],
  ]) {
    await page.getByRole("tab", { name: new RegExp(`^${tab}`) }).click();
    await fits(page);
    await inspectTables(page);
    await page.getByRole("button", { name: `Cadastrar ${action}`, exact: true }).click();
    await inspectDialog(page);
    await page.getByRole("button", { name: /^Editar / }).first().click();
    await inspectDialog(page);
    await page.getByRole("button", { name: /^Arquivar / }).first().click();
    await inspectDialog(page);
  }
  await page.getByRole("tab", { name: /^Receitas/ }).click();
  await page.getByRole("button", { name: /^Ver receita / }).first().click();
  await inspectDialog(page);
  await navigate(page, "Cobranças");
  await inspectTables(page);
  await page.getByRole("button", { name: "Mensagem", exact: true }).first().click();
  await inspectDialog(page);
  await page.getByRole("button", { name: "Quitar", exact: true }).first().click();
  await inspectDialog(page);
  await navigate(page, "Relatórios");
  await inspectTables(page);
  const toggle = page.getByRole("button", { name: "Abrir navegação", exact: true });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole("button", { name: "Exportar arquivo completo", exact: true }).click();
  await inspectDialog(page);
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole("button", { name: "Usar tema escuro", exact: true }).click();
  if (await toggle.isVisible()) await page.keyboard.press("Escape");
  for (const name of ["Visão geral", "Vendas", "Encomendas", "Financeiro", "Cadastros", "Cobranças", "Relatórios"]) {
    await navigate(page, name);
  }
  expect(errors).toEqual([]);
});
