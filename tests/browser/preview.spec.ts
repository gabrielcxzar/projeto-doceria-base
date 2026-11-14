import { expect, test } from "@playwright/test";
async function navigate(page: import("@playwright/test").Page, name: string) {
  const menu = page.getByRole("button", {
    name: "Abrir navegação",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name, exact: true })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" || url.protocol === "data:"
      ? route.continue()
      : route.abort();
  });
});
test("navega em todas as áreas e mantém layout dentro da tela", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?demo=1");
  await expect(
    page.getByText("Prévia com dados fictícios", { exact: false }),
  ).toBeVisible();
  for (const name of [
    "Vendas",
    "Encomendas",
    "Financeiro",
    "Estoque",
    "Cadastros",
    "Cobranças",
    "Relatórios",
    "Visão geral",
  ]) {
    await navigate(page, name);
    await expect(page.locator("main")).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("lateral recolhida persiste, respeita celular e tolera armazenamento bloqueado", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?demo=1");
  const side = page.locator(".sidebar");
  const show = page.getByRole("button", { name: "Mostrar menu lateral", exact: true });
  const hide = page.getByRole("button", { name: "Ocultar menu lateral", exact: true });
  await hide.click();
  await expect(side).toBeHidden();
  await expect(show).toBeFocused();
  await page.evaluate(() => { location.hash = "vendas"; });
  await expect(page.getByRole("heading", { name: "Vendas", exact: true })).toBeVisible();
  await expect(side).toBeHidden();
  await page.reload();
  await expect(show).toHaveAttribute("aria-expanded", "false");
  await expect(side).toBeHidden();
  await expect(page.locator(".workspace")).toHaveCSS("margin-left", "0px");
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = page.getByRole("button", { name: "Abrir navegação", exact: true });
  await mobile.click();
  await expect(side).toHaveAttribute("role", "dialog");
  await page.keyboard.press("Escape");
  await expect(mobile).toBeFocused();
  await mobile.click();
  await page.setViewportSize({ width: 901, height: 600 });
  await expect(show).toBeVisible();
  await expect(side).toBeHidden();
  expect(await page.locator("body").evaluate((element) => element.style.overflow)).toBe("");
  await expect(page.locator(".topbar .brand-logo")).toBeVisible();
  await show.focus();
  await page.keyboard.press("Enter");
  await expect(side).toBeVisible();
  await page.reload();
  await expect(hide).toHaveAttribute("aria-expanded", "true");
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "sidebar-collapsed") throw new DOMException("Storage indisponível", "SecurityError");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "sidebar-collapsed") throw new DOMException("Storage indisponível", "SecurityError");
      return set.call(this, key, value);
    };
  });
  await page.reload();
  await hide.click();
  await expect(side).toBeHidden();
  await expect(show).toBeVisible();
  await page.reload();
  await expect(hide).toBeVisible();
  await expect(side).toBeVisible();
});

test("registra venda e encomenda e atualiza os registros sem recarregar", async ({
  page,
}) => {
  await page.goto("/?demo=1#vendas");
  await page
    .getByRole("button", { name: "Registrar venda", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cliente", { exact: true }).selectOption("c1");
  await dialog.getByLabel("Produto", { exact: true }).selectOption("p2");
  await dialog.getByLabel("Quantidade", { exact: true }).fill("3");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Salvo com sucesso" }),
  ).toBeVisible();
  await navigate(page, "Encomendas");
  await page.getByRole("button", { name: "Nova encomenda" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cliente", { exact: true }).selectOption("c2");
  await dialog.getByLabel("Produto cadastrado").selectOption("p1");
  await dialog.getByRole("button", { name: "Adicionar produto" }).click();
  await dialog
    .getByLabel("Observações de preparo, sabor, tamanho e personalização")
    .fill("Encomenda de teste com entrada");
  await dialog.getByLabel("Valor já recebido (R$)").fill("30");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const orderRow = page
    .getByRole("row")
    .filter({ hasText: "BEATRIZ LIMA" })
    .filter({ hasText: "BOLO DE CHOCOLATE" });
  await expect(orderRow).toBeVisible();
  await orderRow.getByRole("button", { name: "Ver detalhes" }).click();
  await expect(page.getByText("Obs.: Encomenda de teste com entrada")).toBeVisible();
});
test("viewer e dispositivo offline não oferecem gravações", async ({
  page,
  context,
}) => {
  await page.goto("/?demo=viewer#vendas");
  await expect(
    page.getByRole("button", { name: "Registrar venda", exact: true }),
  ).toHaveCount(0);
  await page.goto("/?demo=1#vendas");
  await context.setOffline(true);
  await expect(
    page.getByText("Você está sem conexão.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar venda", exact: true }),
  ).toHaveCount(0);
  await context.setOffline(false);
});
test("exporta todas as coleções e IDs em JSON", async ({ page }) => {
  await page.goto("/?demo=1");
  const menu = page.getByRole("button", { name: "Abrir navegação" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Exportar arquivo completo" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar JSON completo" }).click();
  const download = await downloaded;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(Object.keys(parsed.collections)).toHaveLength(14);
  expect(parsed.collections.clientes[0].id).toBe("c1");
});

test("novo formulário usa a data atual após a PWA atravessar meia-noite", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-23T12:00:00"));
  await page.goto("/?demo=1#vendas");
  await expect(
    page.getByRole("button", { name: "Registrar venda", exact: true }),
  ).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-10-24T12:00:00"));
  await page
    .getByRole("button", { name: "Registrar venda", exact: true })
    .click();
  await expect(page.getByLabel("Data da venda", { exact: true })).toHaveValue(
    "2026-10-24",
  );
});

test("cadastros mantêm ordem alfabética A-Z após novo registro", async ({
  page,
}) => {
  await page.goto("/?demo=1#cadastros");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("AARON ÁVILA");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const firstCustomer = await page
    .locator("tbody tr")
    .first()
    .locator("td")
    .first()
    .innerText();
  expect(firstCustomer).toContain("AARON ÁVILA");
});

test("vendas com Salvar e continuar agrupam produtos diferentes no pedido", async ({
  page,
}) => {
  await page.goto("/?demo=1#vendas");
  await page
    .getByRole("button", { name: "Registrar venda", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cliente", { exact: true }).selectOption("c1");
  await dialog.getByLabel("Produto", { exact: true }).selectOption("p1");
  await dialog.getByLabel("Quantidade", { exact: true }).fill("1");
  await dialog.getByRole("button", { name: "Salvar e continuar" }).click();
  await expect(dialog.getByText("Itens já salvos nesta compra (1)")).toBeVisible();
  await dialog.getByLabel("Produto", { exact: true }).selectOption("p2");
  await dialog.getByLabel("Quantidade", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("2 produtos")).toBeVisible();
  await page.getByRole("button", { name: "Ver detalhes" }).first().click();
  await expect(page.getByText("Itens deste pedido (2)")).toBeVisible();
});

test("cobranças suporta recebimento parcial sucessivo e quitação do saldo", async ({
  page,
}) => {
  await page.goto("/?demo=1#cobrancas");
  const pendingPanel = page
    .locator("section.panel")
    .filter({ hasText: "Pendências por lançamento" });
  const targetRow = pendingPanel
    .getByRole("row")
    .filter({ hasText: "50 × BRIGADEIRO GOURMET" });
  await targetRow.getByRole("button", { name: "Baixar lançamento" }).click();
  let dialog = page.getByRole("dialog");
  const settleFlag = dialog.getByRole("checkbox", {
    name: "Quitar saldo restante (pagamento total)",
  });
  const amountInput = dialog.getByLabel("Valor recebido agora (R$) *");
  await expect(settleFlag).not.toBeChecked();
  await expect(amountInput).toHaveValue("");
  await expect(amountInput).toHaveAttribute("inputmode", "decimal");

  // Rejeita valor vazio, zero/negativo e acima do saldo
  await dialog.getByRole("button", { name: "Confirmar recebimento" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Informe o valor recebido");
  await amountInput.fill("0");
  await dialog.getByRole("button", { name: "Confirmar recebimento" }).click();
  await expect(dialog.getByRole("alert")).toContainText("maior que zero");
  await amountInput.fill("300");
  await dialog.getByRole("button", { name: "Confirmar recebimento" }).click();
  await expect(dialog.getByRole("alert")).toContainText("excede o saldo pendente");

  // Registra pagamento parcial de R$ 40,00 sobre R$ 225,00 -> fica R$ 185,00
  await amountInput.fill("40");
  await expect(dialog).toContainText("Saldo que permanecerá em aberto:");
  await dialog.getByRole("button", { name: "Confirmar recebimento" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    pendingPanel.getByRole("row").filter({ hasText: "50 × BRIGADEIRO GOURMET" }),
  ).toContainText("185,00");

  // Reabre, marca (auto 185 readonly), desmarca (volta edição manual) e remarca para quitar sem duplicar
  await pendingPanel
    .getByRole("row")
    .filter({ hasText: "50 × BRIGADEIRO GOURMET" })
    .getByRole("button", { name: "Baixar lançamento" })
    .click();
  dialog = page.getByRole("dialog");
  const reopenFlag = dialog.getByRole("checkbox", {
    name: "Quitar saldo restante (pagamento total)",
  });
  const reopenAmount = dialog.getByLabel("Valor recebido agora (R$) *");
  await expect(reopenFlag).not.toBeChecked();
  await reopenFlag.check();
  await expect(reopenAmount).toHaveValue("185");
  await expect(reopenAmount).toHaveAttribute("readonly", "");
  await expect(dialog).toContainText("R$ 0,00");

  await reopenFlag.uncheck();
  await expect(reopenAmount).not.toHaveAttribute("readonly", "");
  await reopenAmount.fill("25");
  await expect(dialog).toContainText("160,00");

  await reopenFlag.check();
  await expect(reopenAmount).toHaveValue("185");
  await expect(reopenAmount).toHaveAttribute("readonly", "");
  await dialog.getByRole("button", { name: "Confirmar recebimento" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    pendingPanel.getByRole("row").filter({ hasText: "50 × BRIGADEIRO GOURMET" }),
  ).toHaveCount(0);
  const historyPanel = page
    .locator("section.panel")
    .filter({ hasText: "Histórico de recebimentos" });
  await expect(historyPanel).toBeVisible();
  await expect(historyPanel.locator("tbody tr")).toHaveCount(2);
});

test("financeiro registra nota fiscal e atualiza saldo na tela de estoque", async ({
  page,
}) => {
  await page.goto("/?demo=1#financeiro");
  await page.getByRole("button", { name: "Registrar nota fiscal" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fornecedor (opcional)").fill("Atacadão Doce");
  await dialog.getByLabel("Item cadastrado").selectOption("i1");
  await dialog.getByRole("button", { name: "2", exact: true }).click();
  await dialog.getByLabel("Unidade").selectOption("kg");
  await dialog.getByLabel("Valor unitário (R$)").fill("42");
  await dialog.getByRole("button", { name: "Adicionar item" }).click();
  await expect(dialog.getByText("R$ 84,00").first()).toBeVisible();
  await dialog.getByRole("button", { name: "Salvar nota fiscal" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Nota fiscal (1)" }),
  ).toBeVisible();
  await navigate(page, "Estoque");
  await expect(
    page.getByRole("row").filter({ hasText: "Chocolate meio amargo" }),
  ).toContainText("4.000 g (4 kg)");
});
