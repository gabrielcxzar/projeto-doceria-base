import { expect, test } from "@playwright/test";
import { demoData } from "../../src/demo";

const project = "demo-doceria";
const firestore = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`;
let viewerToken = "";
let adminToken = "";
const password = "test-only-password-123";
function encode(value: unknown): unknown {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "number")
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(encode) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value as object).map(([k, v]) => [k, encode(v)]),
      ),
    },
  };
}
async function seed(request: import("@playwright/test").APIRequestContext) {
  const reset = await request.delete(
    `http://127.0.0.1:8080/emulator/v1/projects/${project}/databases/(default)/documents`,
  );
  expect(reset.ok()).toBe(true);
  await request.delete(
    `http://127.0.0.1:9099/emulator/v1/projects/${project}/accounts`,
  );
  const store = demoData();
  store.usuarios = [];
  for (const role of ["admin", "viewer"]) {
    const result = await request.post(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-key",
      {
        data: {
          email: `${role}@example.test`,
          password,
          returnSecureToken: true,
        },
      },
    );
    expect(result.ok()).toBe(true);
    const user = await result.json();
    if (role === "viewer") viewerToken = user.idToken;
    if (role === "admin") adminToken = user.idToken;
    store.usuarios.push({
      id: user.localId,
      nome: `Equipe ${role}`,
      role: role as "admin" | "viewer",
    });
  }
  for (const [collection, rows] of Object.entries(store))
    for (const row of rows) {
      const { id, ...data } = row;
      const result = await request.patch(`${firestore}/${collection}/${id}`, {
        headers: { Authorization: "Bearer owner" },
        data: {
          fields: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, encode(v)]),
          ),
        },
      });
      expect(result.ok(), `seed ${collection}`).toBe(true);
    }
}
async function loginAs(page: import("@playwright/test").Page, role: string) {
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill(`${role}@example.test`);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /equipe/i }).first(),
  ).toBeVisible();
  await expect(page.getByText("Carregando os registros…")).toHaveCount(0);
}
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
test.beforeEach(async ({ page, request }) => {
  await seed(request);
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.protocol === "data:"
      ? route.continue()
      : route.abort();
  });
});
test("login real no emulador, venda, encomenda, despesa e saída", async ({
  page,
  request,
}) => {
  await loginAs(page, "admin");
  await navigate(page, "Vendas");
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
  const sales = await request.get(`${firestore}/vendas`, {
    headers: { Authorization: "Bearer owner" },
  });
  expect((await sales.json()).documents).toHaveLength(4);
  await navigate(page, "Encomendas");
  await page.getByRole("button", { name: "Nova encomenda" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cliente", { exact: true }).selectOption("c1");
  await dialog.getByLabel("Produto cadastrado").selectOption("p1");
  await dialog.getByRole("button", { name: "Adicionar produto" }).click();
  await dialog
    .getByLabel("Observações de preparo, sabor, tamanho e personalização")
    .fill("Bolo validado no emulador");
  await dialog.getByLabel("Valor já recebido (R$)").fill("30");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const orderRow = page
    .getByRole("row")
    .filter({ hasText: "ANA OLIVEIRA" })
    .filter({ hasText: "BOLO DE CHOCOLATE" })
    .first();
  await expect(orderRow).toBeVisible();
  await orderRow.getByRole("button", { name: "Ver detalhes" }).click();
  await expect(page.getByText("Obs.: Bolo validado no emulador")).toBeVisible();
  await navigate(page, "Financeiro");
  await page.getByRole("button", { name: "Registrar despesa" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Descrição", { exact: true })
    .fill("Chocolate de teste");
  await dialog.getByLabel("Quantidade / observação").fill("5kg");
  await dialog.getByLabel("Total pago (R$)").fill("20");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Chocolate de teste" }),
  ).toContainText("20,00");
  const menu = page.getByRole("button", { name: "Abrir navegação" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
  // Sair pelo drawer não pode deixar o login com a rolagem bloqueada.
  expect(await page.locator("body").evaluate((element) => element.style.overflow)).toBe("");
});
test("viewer consulta todas as áreas e regra nega gravação direta", async ({
  page,
  request,
}) => {
  await loginAs(page, "viewer");
  await navigate(page, "Vendas");
  await expect(
    page.getByRole("button", { name: "Registrar venda", exact: true }),
  ).toHaveCount(0);
  for (const name of [
    "Encomendas",
    "Financeiro",
    "Cadastros",
    "Cobranças",
    "Relatórios",
  ])
    await navigate(page, name);
  const response = await request.patch(`${firestore}/vendas/v1`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
    data: { fields: { status: { stringValue: "A" } } },
  });
  expect(response.status()).toBe(403);
});
test("conta sem perfil recebe erro claro e não acessa dados", async ({
  page,
  request,
}) => {
  const result = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-key",
    {
      data: {
        email: "sem-perfil@example.test",
        password,
        returnSecureToken: true,
      },
    },
  );
  expect(result.ok()).toBe(true);
  await page.goto("/");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("sem-perfil@example.test");
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "não possui um perfil autorizado",
  );
});

test("formulário aberto não sobrescreve uma alteração concorrente", async ({
  page,
  request,
}) => {
  await loginAs(page, "admin");
  await navigate(page, "Cadastros");
  await page
    .getByRole("button", { name: "Editar ANA OLIVEIRA", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Nome", { exact: true })
    .fill("ANA FORMULÁRIO ANTIGO");
  const response = await request.patch(
    `${firestore}/clientes/c1?updateMask.fieldPaths=nome&updateMask.fieldPaths=atualizadoEm`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        fields: {
          nome: { stringValue: "ANA EDIÇÃO CONCORRENTE" },
          atualizadoEm: { timestampValue: new Date().toISOString() },
        },
      },
    },
  );
  expect(response.ok()).toBe(true);
  await expect(page.locator("tbody")).toContainText("ANA EDIÇÃO CONCORRENTE");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "alterado por outra pessoa",
  );
  const current = await request.get(`${firestore}/clientes/c1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect((await current.json()).fields.nome.stringValue).toBe(
    "ANA EDIÇÃO CONCORRENTE",
  );
});

test("cadastros, receita e precificação usam os custos calculados", async ({
  page,
}) => {
  await loginAs(page, "admin");
  await navigate(page, "Cadastros");
  await page.getByRole("tab", { name: /^Ingredientes/ }).click();
  await page
    .getByRole("button", { name: "Cadastrar ingrediente", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Açúcar de teste");
  await dialog.getByLabel("Embalagem de compra").fill("Pacote de 1 kg");
  await dialog.getByLabel("Preço da compra (R$)").fill("10");
  await dialog.getByLabel("Quantidade na unidade escolhida").fill("1000");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("tab", { name: /^Receitas/ }).click();
  await page
    .getByRole("button", { name: "Cadastrar receita", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome da receita").fill("Receita de teste");
  await dialog.getByLabel("Rendimento em unidades").fill("10");
  await dialog
    .getByLabel("Ingrediente", { exact: true })
    .selectOption({ label: "Açúcar de teste" });
  await dialog.getByLabel("Quantidade", { exact: true }).fill("200");
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog.locator(".form-summary")).toContainText("2,00");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Receita de teste" }),
  ).toContainText("0,20");
  await page.getByRole("tab", { name: /^Produtos/ }).click();
  await page
    .getByRole("button", { name: "Cadastrar produto", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("DOCE DE TESTE");
  await dialog.getByRole("checkbox", { name: /Receita de teste/ }).check();
  await dialog.getByLabel("Mão de obra por unidade (R$)").fill("0.8");
  await dialog.getByLabel("Custos indiretos (%)").fill("10");
  await dialog.getByLabel("Como definir o preço").selectOption("automatic");
  await dialog.getByLabel("Acréscimo sobre custo (%)").fill("100");
  await expect(dialog.locator(".form-summary").last()).toContainText("2,20");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "DOCE DE TESTE" }),
  ).toContainText("2,20");
  await page
    .getByRole("button", { name: "Arquivar DOCE DE TESTE", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Arquivar cadastro", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "DOCE DE TESTE" }),
  ).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Mostrar arquivados" }).check();
  await expect(
    page.getByRole("button", { name: "Reativar DOCE DE TESTE", exact: true }),
  ).toBeVisible();
});

test("baixa individual, quitação por cliente e relatório conferem", async ({
  page,
  request,
}) => {
  await loginAs(page, "admin");
  await navigate(page, "Cobranças");
  const pendingPanel = page
    .locator("section.panel")
    .filter({ hasText: "Pendências por lançamento" });
  const saleRow = pendingPanel
    .getByRole("row")
    .filter({ hasText: "50 × BRIGADEIRO GOURMET" });
  await saleRow.getByRole("button", { name: "Baixar lançamento" }).click();
  let launchDialog = page.getByRole("dialog");
  await expect(
    launchDialog.getByRole("checkbox", {
      name: "Quitar saldo restante (pagamento total)",
    }),
  ).not.toBeChecked();
  await launchDialog.getByLabel("Valor recebido agora (R$) *").fill("40");
  await launchDialog
    .getByRole("button", { name: "Confirmar recebimento", exact: true })
    .click();
  await expect(launchDialog).not.toBeVisible();
  const partialDoc = await request.get(`${firestore}/vendas/v2`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const partialFields = (await partialDoc.json()).fields;
  expect(partialFields.status.stringValue).toBe("P");
  expect(Number(partialFields.valorPago.integerValue ?? partialFields.valorPago.doubleValue)).toBe(40);
  await pendingPanel
    .getByRole("row")
    .filter({ hasText: "50 × BRIGADEIRO GOURMET" })
    .getByRole("button", { name: "Baixar lançamento" })
    .click();
  launchDialog = page.getByRole("dialog");
  await launchDialog
    .getByRole("checkbox", { name: "Quitar saldo restante (pagamento total)" })
    .check();
  await expect(
    launchDialog.getByLabel("Valor recebido agora (R$) *"),
  ).toHaveValue("185");
  await launchDialog
    .getByRole("button", { name: "Confirmar recebimento", exact: true })
    .click();
  await expect(launchDialog).not.toBeVisible();
  const current = await request.get(`${firestore}/vendas/v2`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect((await current.json()).fields.status.stringValue).toBe("A");
  const receiptsRes = await request.get(`${firestore}/recebimentos`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect((await receiptsRes.json()).documents).toHaveLength(2);
  // Verifica proteção contra concorrência ao baixar lançamento desatualizado
  await pendingPanel
    .getByRole("row")
    .filter({ hasText: "ANA OLIVEIRA" })
    .getByRole("button", { name: "Baixar lançamento" })
    .click();
  const staleDialog = page.getByRole("dialog");
  const concurrentPatch = await request.patch(
    `${firestore}/encomendas/e1?updateMask.fieldPaths=atualizadoEm`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        fields: {
          atualizadoEm: { timestampValue: new Date().toISOString() },
        },
      },
    },
  );
  expect(concurrentPatch.ok()).toBe(true);
  await staleDialog
    .getByRole("checkbox", { name: "Quitar saldo restante (pagamento total)" })
    .check();
  await staleDialog
    .getByRole("button", { name: "Confirmar recebimento", exact: true })
    .click();
  await expect(staleDialog.getByRole("alert")).toContainText(
    "alterado por outra pessoa",
  );
  await staleDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(staleDialog).not.toBeVisible();
  const customerRow = page
    .getByRole("row")
    .filter({ hasText: "ANA OLIVEIRA" })
    .filter({ has: page.getByRole("button", { name: "Quitar", exact: true }) });
  await customerRow
    .getByRole("button", { name: "Quitar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar recebimento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const order = await request.get(`${firestore}/encomendas/e1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect((await order.json()).fields.valorEntrada.integerValue).toBe("280");
  await navigate(page, "Relatórios");
  await page.getByLabel("Cliente", { exact: true }).selectOption("c1");
  await expect(
    page.getByRole("heading", { name: "Produtos por cliente" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toContain("Vendas_");
});

test("nota fiscal com múltiplos itens persiste no emulador e movimenta estoque", async ({
  page,
  request,
}) => {
  await loginAs(page, "admin");
  await navigate(page, "Financeiro");
  await page.getByRole("button", { name: "Registrar nota fiscal" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fornecedor (opcional)").fill("Casa do Confeiteiro");
  await dialog.getByLabel("Número da nota (opcional)").fill("NF-900");
  await dialog.getByLabel("Item cadastrado").selectOption("i1");
  await dialog.getByRole("button", { name: "1", exact: true }).click();
  await dialog.getByLabel("Unidade").selectOption("kg");
  await dialog.getByLabel("Valor unitário (R$)").fill("45");
  await dialog.getByRole("button", { name: "Adicionar item" }).click();
  await dialog.getByLabel("Tipo do item").selectOption("material");
  await dialog.getByLabel("Item cadastrado").selectOption("m1");
  await dialog.getByRole("button", { name: "3", exact: true }).click();
  await dialog.getByLabel("Valor unitário (R$)").fill("5");
  await dialog.getByRole("button", { name: "Adicionar item" }).click();
  await dialog.getByRole("button", { name: "Salvar nota fiscal" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Casa do Confeiteiro" }),
  ).toContainText("60,00");
  const movsRes = await request.get(`${firestore}/movimentacoes_estoque`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect((await movsRes.json()).documents.length).toBeGreaterThanOrEqual(2);
  await navigate(page, "Estoque");
  await expect(
    page.getByRole("row").filter({ hasText: "Chocolate meio amargo" }),
  ).toContainText("3.000 g (3 kg)");
  await expect(
    page.getByRole("row").filter({ hasText: "Caixa para bolo" }),
  ).toContainText("18 un.");
});
