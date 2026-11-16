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
  await expect(page.locator(".order-detail-line")).toContainText(["1× BOLO DE CHOCOLATE"]);
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
  expect(Object.keys(parsed.collections)).toHaveLength(15);
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

  // Adiciona item primeiro e depois cria fornecedor inline sem perder os itens da nota.
  await dialog.getByLabel("Item cadastrado").selectOption("i1");
  await dialog.getByRole("button", { name: "2", exact: true }).click();
  await dialog.getByLabel("Unidade").selectOption("kg");
  await dialog.getByLabel("Valor unitário (R$)").fill("42");
  await dialog.getByRole("button", { name: "Adicionar item" }).click();
  await expect(dialog.getByText("R$ 84,00").first()).toBeVisible();

  // Tentar salvar sem selecionar fornecedor mantém o modal aberto pela obrigatoriedade.
  await dialog.getByRole("button", { name: "Salvar nota fiscal" }).click();
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Novo fornecedor" }).click();
  await dialog.getByLabel("Nome / Razão social *").fill("Atacadão Doce");
  await dialog.getByRole("button", { name: "Salvar fornecedor" }).click();
  await expect(dialog.getByLabel("Fornecedor *")).toContainText("Atacadão Doce");
  await expect(
    dialog.locator(".composition-list").getByText("Chocolate meio amargo"),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Salvar nota fiscal" }).click();
  await expect(dialog).not.toBeVisible();
  const noteRow = page.getByRole("row").filter({ hasText: "Atacadão Doce" });
  await expect(noteRow).toContainText("1 item");
  await expect(noteRow).toContainText("84,00");
  await noteRow.getByRole("button", { name: "Exibir itens" }).click();
  await expect(page.getByText("Total da nota: R$ 84,00")).toBeVisible();
  await noteRow.getByRole("button", { name: "Ocultar itens" }).click();
  await expect(page.getByText("Total da nota: R$ 84,00")).toHaveCount(0);

  await navigate(page, "Estoque");
  await expect(
    page.getByRole("row").filter({ hasText: "Chocolate meio amargo" }),
  ).toContainText("4.000 g (4 kg)");
});

test("fornecedores têm aba dedicada, ordenação A-Z, busca, edição, arquivamento e vínculo estável", async ({
  page,
}) => {
  await page.goto("/?demo=1#cadastros");
  const tabNames = await page.getByRole("tab").allInnerTexts();
  expect(tabNames.map((t) => t.replace(/\d+$/, "").trim())).toEqual([
    "Clientes",
    "Produtos",
    "Receitas",
    "Ingredientes",
    "Materiais",
    "Fornecedores",
  ]);
  await page.getByRole("tab", { name: /^Fornecedores/ }).click();
  await page.getByRole("button", { name: "Cadastrar fornecedor" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome / Razão social", { exact: true }).fill("Abastecedora Central");
  await dialog.getByLabel("Nome fantasia (opcional)").fill("Central Doces");
  await dialog.getByLabel("Telefone / WhatsApp (opcional)").fill("71991112222");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();

  // Ordenação alfabética A-Z: Abastecedora Central antes de Distribuidora ABC
  const firstSupplier = await page
    .locator("tbody tr")
    .first()
    .locator("td")
    .first()
    .innerText();
  expect(firstSupplier).toContain("Abastecedora Central");

  // Busca, edição (renomear Distribuidora ABC) e preservação do snapshot histórico no Financeiro
  await page
    .getByRole("button", { name: "Editar Distribuidora ABC", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome / Razão social", { exact: true }).fill("ABC Alimentos Ltda");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();

  // Arquivar Embalagens Bahia e reativar em Mostrar arquivados
  await page
    .getByRole("button", { name: "Arquivar Embalagens Bahia", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Arquivar cadastro", exact: true })
    .click();
  await expect(page.getByText("Embalagens Bahia")).toHaveCount(0);

  await navigate(page, "Financeiro");
  // Fornecedor arquivado e renomeado não quebram histórico nem seleção de nova nota
  const historicalRow = page
    .getByRole("row")
    .filter({ hasText: "Distribuidora ABC" });
  await expect(historicalRow).toContainText("NF 001");
  await expect(historicalRow).toContainText("Cadastro atual: ABC Alimentos Ltda");

  await page.getByRole("button", { name: "Registrar nota fiscal" }).click();
  dialog = page.getByRole("dialog");
  const selectText = await dialog.getByLabel("Fornecedor *").innerText();
  expect(selectText).not.toContain("Embalagens Bahia");
  await dialog.getByRole("button", { name: "Fechar janela", exact: true }).click();

  await navigate(page, "Cadastros");
  await page.getByRole("tab", { name: /^Fornecedores/ }).click();
  await page.getByLabel("Mostrar arquivados").check();
  await page.getByRole("button", { name: "Reativar Embalagens Bahia" }).click();
  await page.getByLabel("Mostrar arquivados").uncheck();
  await expect(page.getByText("Embalagens Bahia")).toBeVisible();
});

test("financeiro mantém duas notas do mesmo fornecedor separadas, permite filtros e despesa simples sem fornecedor", async ({
  page,
}) => {
  await page.goto("/?demo=1#financeiro");

  // Registra uma segunda nota para Distribuidora ABC (f1) com 2 itens
  await page.getByRole("button", { name: "Registrar nota fiscal" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fornecedor *").selectOption("f1");
  await dialog.getByLabel("Número da nota (opcional)").fill("002");
  await dialog.getByLabel("Tipo do item").selectOption("outro");
  await dialog.getByLabel("Descrição do item").fill("Gás cozinha");
  await dialog.getByRole("button", { name: "1", exact: true }).click();
  await dialog.getByLabel("Valor unitário (R$)").fill("115");
  await dialog.getByRole("button", { name: "Adicionar item" }).click();
  await dialog.getByLabel("Descrição do item").fill("Taxa entrega");
  await dialog.getByRole("button", { name: "1", exact: true }).click();
  await dialog.getByLabel("Valor unitário (R$)").fill("15");
  await dialog.getByRole("button", { name: "Adicionar item" }).click();
  await dialog.getByRole("button", { name: "Salvar nota fiscal" }).click();
  await expect(dialog).not.toBeVisible();

  // Ambas as notas do mesmo fornecedor aparecem em linhas independentes
  await expect(page.getByRole("row").filter({ hasText: "NF 001" })).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: "NF 002" })).toHaveCount(1);

  const nf2Row = page.getByRole("row").filter({ hasText: "NF 002" });
  await nf2Row.getByRole("button", { name: "Exibir itens" }).click();
  await expect(page.getByText("Total da nota: R$ 130,00")).toBeVisible();

  // Despesa simples continua funcionando sem fornecedor
  await page.getByRole("button", { name: "Registrar despesa" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Descrição", { exact: true }).fill("Passagem de ônibus");
  await dialog.getByLabel("Total pago (R$)").fill("18");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Passagem de ônibus" }),
  ).toContainText("Despesa simples");

  // Filtro por tipo de lançamento e fornecedor
  await page.getByLabel("Filtrar tipo de lançamento").selectOption("invoice");
  await expect(page.getByRole("row").filter({ hasText: "Passagem de ônibus" })).toHaveCount(0);
  await page.getByLabel("Filtrar fornecedor").selectOption("f1");
  await expect(
    page.locator("tbody > tr:not(.detail-row)").filter({ hasText: "Distribuidora ABC" }),
  ).toHaveCount(2);
});

test("nota fiscal permite escolher por item se adiciona ao estoque mantendo o valor total", async ({
  page,
}) => {
  await page.goto("/?demo=1#financeiro");
  await page.getByRole("button", { name: "Registrar nota fiscal" }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByLabel("Fornecedor *").selectOption("f1");
  await dialog.getByLabel("Número da nota (opcional)").fill("003");

  // Item 1 (Chocolate): checkbox marcada por padrão -> entra no estoque
  const addStockCheck = dialog.getByLabel("Adicionar ao estoque", { exact: true });
  await expect(addStockCheck).toBeChecked();
  await dialog.getByLabel("Item cadastrado").selectOption("i1");
  await dialog.getByRole("button", { name: "1", exact: true }).click();
  await dialog.getByLabel("Unidade").selectOption("kg");
  await dialog.getByLabel("Valor unitário (R$)").fill("45");
  await dialog.getByRole("button", { name: "Adicionar item" }).click();

  // Item 2 (Caixa para bolo): usuário desmarca "Adicionar ao estoque"
  await addStockCheck.uncheck();
  await expect(addStockCheck).not.toBeChecked();
  await dialog.getByLabel("Tipo do item").selectOption("material");
  await dialog.getByLabel("Item cadastrado").selectOption("m1");
  await dialog.getByRole("button", { name: "2", exact: true }).click();
  await dialog.getByLabel("Valor unitário (R$)").fill("10");
  await dialog.getByRole("button", { name: "Adicionar item" }).click();

  // Na lista adicionada, é possível alternar a opção antes de salvar sem mudar o total R$ 65,00
  await expect(dialog.getByText("R$ 65,00")).toBeVisible();
  const listMatCheck = dialog.getByLabel("Adicionar Caixa para bolo ao estoque", {
    exact: true,
  });
  await expect(listMatCheck).not.toBeChecked();
  await listMatCheck.check();
  await expect(
    dialog.locator(".composition-list").getByText("Adicionar ao estoque: Sim"),
  ).toHaveCount(2);
  await expect(dialog.getByText("R$ 65,00")).toBeVisible();
  await listMatCheck.uncheck();
  await expect(listMatCheck).not.toBeChecked();
  await expect(dialog.getByText("R$ 65,00")).toBeVisible();

  await dialog.getByRole("button", { name: "Salvar nota fiscal" }).click();
  await expect(dialog).not.toBeVisible();

  const row = page.getByRole("row").filter({ hasText: "NF 003" });
  await expect(row).toContainText("2 itens");
  await expect(row).toContainText("65,00");
  await row.getByRole("button", { name: "Exibir itens" }).click();
  await expect(page.getByText("Chocolate meio amargo")).toBeVisible();
  await expect(page.getByText("Caixa para bolo")).toBeVisible();
  await expect(page.getByText("Total da nota: R$ 65,00")).toBeVisible();

  // Estoque: Chocolate subiu de 2 kg para 3 kg; Caixa para bolo manteve 15 un.
  await navigate(page, "Estoque");
  await expect(
    page.getByRole("row").filter({ hasText: "Chocolate meio amargo" }),
  ).toContainText("3.000 g (3 kg)");
  await expect(
    page.getByRole("row").filter({ hasText: "Caixa para bolo" }),
  ).toContainText("15 un.");
});

test("encomendas exibem itens e acessórios em linhas separadas nos detalhes agrupados", async ({
  page,
}) => {
  await page.goto("/?demo=1#encomendas");

  // Cria uma nova encomenda multi-produto + acessório cobrado para ANA OLIVEIRA (já possui e1 legado na mesma data)
  await page.getByRole("button", { name: "Nova encomenda" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cliente", { exact: true }).selectOption("c1");
  await dialog.getByLabel("Produto cadastrado").selectOption("p1");
  await dialog.getByRole("button", { name: "Adicionar produto" }).click();
  await dialog.getByLabel("Produto cadastrado").selectOption("p3");
  await dialog.getByRole("button", { name: "Adicionar produto" }).click();
  await dialog.getByLabel("Material", { exact: true }).selectOption("m1");
  await dialog.getByLabel("Valor cobrado (R$)").fill("10");
  await dialog.getByRole("button", { name: "Adicionar acessório" }).click();
  await dialog.getByLabel("Valor já recebido (R$)").fill("50");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();

  // Grupo de ANA OLIVEIRA reúne a encomenda legada (R$ 280) e a nova estruturada (120 + 85 + 10 = R$ 215) = R$ 495,00
  const groupRow = page.getByRole("row").filter({ hasText: "ANA OLIVEIRA" });
  await expect(groupRow).toContainText("2 encomendas");
  await expect(groupRow).toContainText("495,00");

  await groupRow.getByRole("button", { name: "Ver detalhes" }).click();
  const detailBox = page.locator(".detail-box");
  await expect(detailBox).toBeVisible();

  // Encomenda legada preservada e nova discrimina cada item em sua própria linha sem concatenação com ·
  await expect(detailBox.getByText("Bolo de aniversário · chocolate e morango")).toBeVisible();
  await expect(detailBox.getByText(/Encomenda [12] \(3 itens\)/)).toBeVisible();

  const lines = detailBox.locator(".order-detail-line");
  await expect(lines).toHaveCount(3);
  await expect(lines.nth(0)).toContainText("1× BOLO DE CHOCOLATE");
  await expect(lines.nth(0)).toContainText("120,00");
  await expect(lines.nth(1)).toContainText("1× TORTA DE LIMÃO");
  await expect(lines.nth(1)).toContainText("85,00");
  await expect(lines.nth(2)).toContainText("1× Caixa para bolo");
  await expect(lines.nth(2)).toContainText("10,00");

  // Não repete "Produtos:" nem título concatenado "1× BOLO DE CHOCOLATE · 1× TORTA DE LIMÃO" dentro dos detalhes
  await expect(detailBox.getByText("1× BOLO DE CHOCOLATE · 1× TORTA DE LIMÃO")).toHaveCount(0);
  await expect(detailBox.getByText("Produtos:")).toHaveCount(0);
});

test("encomendas permite cadastrar produto completo sem perder rascunho, trata erros e funciona na edição", async ({
  page,
}) => {
  await page.goto("/?demo=1#encomendas");
  await page.getByRole("button", { name: "Nova encomenda" }).click();
  const orderDialog = page.getByRole("dialog", { name: "Encomenda" });

  // Preenche rascunho completo da encomenda (cliente, data, 1 produto, 1 acessório e observações)
  await orderDialog.getByLabel("Cliente", { exact: true }).selectOption("c2");
  await orderDialog.getByLabel("Entrega", { exact: true }).fill("2026-12-20");
  await orderDialog.getByLabel("Produto cadastrado").selectOption("p1");
  await orderDialog.getByRole("button", { name: "Adicionar produto" }).click();
  await orderDialog.getByLabel("Material", { exact: true }).selectOption("m1");
  await orderDialog.getByLabel("Valor cobrado (R$)").fill("10");
  await orderDialog.getByRole("button", { name: "Adicionar acessório" }).click();
  await orderDialog
    .getByLabel("Observações de preparo, sabor, tamanho e personalização")
    .fill("Massa de baunilha e laço dourado");

  // 1) Abrir cadastro a partir de Nova Encomenda e cancelar por Escape sem perder nada
  await orderDialog.getByRole("button", { name: "Cadastrar produto" }).click();
  let productDialog = page.getByRole("dialog", { name: "Produto" });
  await expect(productDialog).toBeVisible();
  await productDialog.getByLabel("Nome", { exact: true }).fill("RASCUNHO TEMPORARIO");
  await productDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(productDialog).toHaveCount(0);
  await expect(orderDialog).toBeVisible();
  await expect(orderDialog.getByLabel("Cliente", { exact: true })).toHaveValue("c2");
  await expect(orderDialog.getByLabel("Entrega", { exact: true })).toHaveValue("2026-12-20");
  await expect(
    orderDialog.getByLabel("Observações de preparo, sabor, tamanho e personalização"),
  ).toHaveValue("Massa de baunilha e laço dourado");

  // 2) Abrir novamente, testar bloqueio de nome duplicado e falha simulada de gravação sem perder os formulários
  await orderDialog.getByRole("button", { name: "Cadastrar produto" }).click();
  productDialog = page.getByRole("dialog", { name: "Produto" });
  await productDialog.getByLabel("Nome", { exact: true }).fill("BOLO DE CHOCOLATE");
  await productDialog.getByLabel("Preço de venda (R$)").fill("95");
  await productDialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(productDialog.getByRole("alert")).toContainText("Já existe um cadastro com esse nome");

  // Corrige nome, preenche composição completa e simula erro na gravação
  await productDialog.getByLabel("Nome", { exact: true }).fill("BOLO RED VELVET 15CM");
  await productDialog.getByLabel("Categoria", { exact: true }).selectOption("Bolos");
  await productDialog.getByLabel(/Brigadeiro de chocolate/).check();
  await productDialog.getByLabel("Preço de venda (R$)").fill("140");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
  });
  await productDialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(productDialog.getByRole("alert")).toContainText("Conecte-se à internet");
  await expect(productDialog.getByLabel("Nome", { exact: true })).toHaveValue("BOLO RED VELVET 15CM");
  await expect(orderDialog).toBeVisible();

  // Restaura conexão simulada, salva produto e verifica retorno com seleção automática na encomenda
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  });
  await productDialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(productDialog).toHaveCount(0);
  await expect(orderDialog).toBeVisible();
  await expect(orderDialog.getByLabel("Produto cadastrado")).toContainText("BOLO RED VELVET 15CM");
  const selectedText = await orderDialog
    .getByLabel("Produto cadastrado")
    .locator("option:checked")
    .innerText();
  expect(selectedText).toContain("BOLO RED VELVET 15CM");

  // Inclui o novo produto e confirma preservação dos anteriores (120 + 140 + 10 = R$ 270,00)
  await orderDialog.getByRole("button", { name: "Adicionar produto" }).click();
  await expect(orderDialog.getByText("R$ 270,00").first()).toBeVisible();
  await orderDialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(orderDialog).toHaveCount(0);

  // 3) Abrir cadastro a partir de Editar Encomenda, cadastrar outro produto e cancelar sem perder edição
  const savedOrderRow = page
    .getByRole("row")
    .filter({ hasText: "BEATRIZ LIMA" })
    .filter({ hasText: "BOLO RED VELVET 15CM" });
  await expect(savedOrderRow).toContainText("270,00");
  await savedOrderRow.getByRole("button", { name: "Editar encomenda de BEATRIZ LIMA" }).click();
  const editOrderDialog = page.getByRole("dialog", { name: "Editar Encomenda" });
  await editOrderDialog.getByRole("button", { name: "Cadastrar produto" }).click();
  const editProdDialog = page.getByRole("dialog", { name: "Produto" });
  await editProdDialog.getByLabel("Nome", { exact: true }).fill("DOCINHO PERSONALIZADO");
  await editProdDialog.getByLabel("Preço de venda (R$)").fill("6");
  await editProdDialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(editProdDialog).toHaveCount(0);
  await expect(editOrderDialog.getByLabel("Produto cadastrado")).toContainText("DOCINHO PERSONALIZADO");
  await editOrderDialog.getByRole("button", { name: "Cancelar", exact: true }).click();

  // Viewer não vê ações de edição/cadastro
  await page.goto("/?demo=viewer#encomendas");
  await expect(page.getByRole("button", { name: "Nova encomenda" })).toHaveCount(0);
});

test("encomendas permite alteração rápida individual sem alterar recebimentos e funciona em agrupamentos", async ({
  page,
}) => {
  await page.goto("/?demo=1#encomendas");

  // 1) Mudança rápida em encomenda individual (BEATRIZ LIMA: 400,00 total, 200,00 recebido, 200,00 pendente)
  const beatrizRow = page.getByRole("row").filter({ hasText: "BEATRIZ LIMA" });
  await beatrizRow
    .getByRole("button", { name: "Alterar situação da encomenda de BEATRIZ LIMA" })
    .click();
  let dialog = page.getByRole("dialog", { name: "Situação da encomenda" });
  await expect(dialog).toContainText("BEATRIZ LIMA");
  await expect(dialog).toContainText("Pendente");
  await dialog.getByLabel("Nova situação").selectOption("Finalizado");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  // Atualiza status visualmente para Finalizado SEM zerar os R$ 200,00 em aberto
  await expect(beatrizRow).toContainText("Finalizado");
  await expect(beatrizRow).toContainText("200,00");

  // 2) Cria segunda encomenda no mesmo dia para ANA OLIVEIRA (já possui e1 Em Produção)
  await page.getByRole("button", { name: "Nova encomenda" }).click();
  const orderDialog = page.getByRole("dialog", { name: "Encomenda" });
  await orderDialog.getByLabel("Cliente", { exact: true }).selectOption("c1");
  await orderDialog.getByLabel("Produto cadastrado").selectOption("p1");
  await orderDialog.getByRole("button", { name: "Adicionar produto" }).click();
  await orderDialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(orderDialog).toHaveCount(0);

  const anaGroupRow = page.getByRole("row").filter({ hasText: "ANA OLIVEIRA" });
  await expect(anaGroupRow).toContainText("Situações diferentes");
  await anaGroupRow.getByRole("button", { name: "Ver detalhes" }).click();

  // Cada item do grupo tem seu próprio botão unitário; alterar apenas Encomenda 1 para Pendente não muda Encomenda 2
  const detailItems = page.locator(".detail-item");
  await expect(detailItems).toHaveCount(2);
  await page
    .getByRole("button", { name: "Alterar situação da encomenda 1 de ANA OLIVEIRA" })
    .click();
  dialog = page.getByRole("dialog", { name: "Situação da encomenda" });
  await dialog.getByLabel("Nova situação").selectOption("Finalizado");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(detailItems.nth(0)).toContainText("Finalizado");

  // Viewer não vê ações de alteração rápida
  await page.goto("/?demo=viewer#encomendas");
  await expect(page.getByRole("button", { name: /^Alterar situação/ })).toHaveCount(0);
});
