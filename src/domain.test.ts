import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  buildExpenseDeletionMutations,
  buildInvoiceMutations,
  buildPartialPaymentMutations,
  chargeMessage,
  collectPendingLaunches,
  computeOrderTotal,
  csv,
  customerTotals,
  dateText,
  encodeBackup,
  expenseHasActiveStockEntries,
  expenseMatchesSupplierFilter,
  finances,
  formatStock,
  groupOrders,
  groupSales,
  ingredientCost,
  invoiceItemAddsToStock,
  invoiceItemNetStockDelta,
  isArchivableCollection,
  isLowStock,
  normalizeStockQuantity,
  orderRemaining,
  positive,
  priceFor,
  productCost,
  recipeCost,
  resolveExpenseSupplier,
  saleRemaining,
  sortByTextPtBr,
  validDate,
  validateOrder,
  validateSale,
  validateSupplierInput,
} from "./domain";
import { emptyData } from "./types";
import type { Expense, ExpenseInvoiceItem, Order, Sale, Supplier } from "./types";

const sale: Sale = {
  id: "s",
  data: "2026-10-23",
  pessoa: "ANA",
  produto: "BOLO",
  valor: 8.5,
  quantidade: 3,
  pagamento: "PIX",
  status: "P",
};
const order: Order = {
  id: "o",
  clienteNome: "ANA",
  produtoDescricao: "Bolo",
  dataEntrega: "2026-10-24",
  valorTotal: 100,
  valorEntrada: 30,
  status: "Pendente",
};
describe("valores e datas comerciais", () => {
  it("rejeita datas inexistentes e preserva o dia brasileiro", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2026-13-01")).toBe(false);
    expect(dateText("2026-10-23")).toBe("23/10/2026");
  });
  it("rejeita valores vazios, negativos, infinitos e quantidade fracionária", () => {
    for (const value of ["", undefined, null, -1, Infinity, NaN])
      expect(() => positive(value)).toThrow();
    expect(() => validateSale({ ...sale, quantidade: 1.5 })).toThrow();
    expect(() => validateSale({ ...sale, data: "2026-02-30" })).toThrow();
    expect(() => validateSale(sale)).not.toThrow();
  });
  it("não permite entrada maior que total ou negativa", () => {
    expect(() => validateOrder({ ...order, valorEntrada: 101 })).toThrow();
    expect(() => validateOrder({ ...order, valorEntrada: -1 })).toThrow();
    expect(orderRemaining(order)).toBe(70);
    expect(
      orderRemaining({ ...order, valorEntrada: 100, status: "Finalizado" }),
    ).toBe(0);
  });
});
describe("ordenação pt-BR e agrupamentos", () => {
  it("ordena acentos, maiúsculas e números corretamente em pt-BR", () => {
    const items = [
      { id: "1", nome: "Éclair 10" },
      { id: "2", nome: "açúcar" },
      { id: "3", nome: "Éclair 2" },
      { id: "4", nome: "Bolo" },
    ];
    expect(sortByTextPtBr(items, (i) => i.nome, (i) => i.id).map((i) => i.nome)).toEqual([
      "açúcar",
      "Bolo",
      "Éclair 2",
      "Éclair 10",
    ]);
  });
  it("agrupa vendas por pedidoId e distingue pedidos separados no mesmo dia", () => {
    const groups = groupSales([
      { ...sale, id: "s1", pedidoId: "ped1", produtoId: "p1", produto: "BOLO", quantidade: 1, valor: 60 },
      { ...sale, id: "s2", pedidoId: "ped1", produtoId: "p2", produto: "PRATO", quantidade: 1, valor: 40 },
      { ...sale, id: "s3", pedidoId: "ped2", produtoId: "p1", produto: "BOLO", quantidade: 3, valor: 60 },
      { ...sale, id: "s4", produtoId: "p3", produto: "DOCE", quantidade: 2, valor: 5 },
    ]);
    expect(groups).toHaveLength(3);
    const ped1 = groups.find((g) => g.pedidoId === "ped1")!;
    const ped2 = groups.find((g) => g.pedidoId === "ped2")!;
    expect(ped1.isMultiProduct).toBe(true);
    expect(ped1.distinctProductCount).toBe(2);
    expect(ped1.total).toBe(100);
    expect(ped2.isMultiProduct).toBe(false);
    expect(ped2.totalUnits).toBe(3);
  });
  it("ordena encomendas por data de entrega decrescente por padrão e agrupa por cliente+data", () => {
    const orders: Order[] = [
      { ...order, id: "o1", clienteId: "c1", clienteNome: "ANE", dataEntrega: "2026-11-11", valorTotal: 100, valorEntrada: 50 },
      { ...order, id: "o2", clienteId: "c1", clienteNome: "ANE", dataEntrega: "2026-11-13", valorTotal: 200, valorEntrada: 100 },
      { ...order, id: "o3", clienteId: "c1", clienteNome: "ANE", dataEntrega: "2026-11-13", valorTotal: 40, valorEntrada: 0, produtoDescricao: "Prato" },
      { ...order, id: "o4", clienteId: "c2", clienteNome: "BRUNA", dataEntrega: "2026-11-12", valorTotal: 80, valorEntrada: 80, status: "Finalizado" },
    ];
    const desc = groupOrders(orders, [], "desc");
    expect(desc.map((g) => g.dataEntrega)).toEqual(["2026-11-13", "2026-11-12", "2026-11-11"]);
    expect(desc[0].orders).toHaveLength(2);
    expect(desc[0].total).toBe(240);
    expect(desc[0].remaining).toBe(140);
    const asc = groupOrders(orders, [], "asc");
    expect(asc.map((g) => g.dataEntrega)).toEqual(["2026-11-11", "2026-11-12", "2026-11-13"]);
  });
  it("calcula total de encomenda somando apenas acessórios cobrados ao cliente", () => {
    expect(
      computeOrderTotal(
        [{ produtoId: "p1", produtoNome: "Bolo", quantidade: 1, valorUnitario: 120, subtotal: 120 }],
        [
          { materialId: "m1", descricao: "Prato dourado", quantidade: 1, cobradoCliente: true, valorUnitario: 15, subtotal: 15 },
          { materialId: "m2", descricao: "Caixa interna", quantidade: 1, cobradoCliente: false, valorUnitario: 5, subtotal: 5 },
        ],
      ),
    ).toBe(135);
  });
});
describe("recebimentos parciais e caixa por data efetiva", () => {
  it("permite receber R$ 40 sobre R$ 100 mantendo R$ 60, e depois quitar com R$ 60", () => {
    const data = emptyData();
    data.vendas = [{ ...sale, id: "v100", valor: 100, quantidade: 1, status: "P" }];
    const [launch1] = collectPendingLaunches(data);
    expect(launch1.remainingAmount).toBe(100);

    expect(() =>
      buildPartialPaymentMutations({
        launch: launch1,
        amount: 0,
        date: "2026-11-13",
        method: "PIX",
      }),
    ).toThrow();
    expect(() =>
      buildPartialPaymentMutations({
        launch: launch1,
        amount: 120,
        date: "2026-11-13",
        method: "PIX",
      }),
    ).toThrow();

    const m1 = buildPartialPaymentMutations({
      launch: launch1,
      amount: 40,
      date: "2026-11-13",
      method: "PIX",
      receiptId: "rec-1",
    });
    expect(m1[0].data).toMatchObject({ valorPago: 40, status: "P" });
    expect(m1[1].data).toMatchObject({ valor: 40, data: "2026-11-13", tipoBaixa: "parcial" });

    data.vendas[0] = { ...data.vendas[0], valorPago: 40, status: "P" };
    expect(saleRemaining(data.vendas[0])).toBe(60);
    data.recebimentos = [
      {
        id: "rec-1",
        data: "2026-11-13",
        valor: 40,
        origemTipo: "venda",
        origemId: "v100",
        clienteNome: "ANA",
        descricao: "1 × BOLO",
        pagamento: "PIX",
        tipoBaixa: "parcial",
      },
    ];
    expect(finances(data, "2026-10")).toMatchObject({ sold: 100, received: 0, pending: 60 });
    expect(finances(data, "2026-11")).toMatchObject({ sold: 0, received: 40, pending: 0 });
    expect(finances(data, "")).toMatchObject({ sold: 100, received: 40, pending: 60 });

    const [launch2] = collectPendingLaunches(data);
    const m2 = buildPartialPaymentMutations({
      launch: launch2,
      amount: 60,
      date: "2026-11-14",
      method: "PIX",
      receiptId: "rec-2",
    });
    expect(m2[0].data).toMatchObject({ valorPago: 100, status: "A" });
    expect(m2[1].data).toMatchObject({ valor: 60, tipoBaixa: "integral" });
  });
});
describe("custos, unidades e estoque", () => {
  it("calcula receita com conversão compatível e evita misturar massa e volume", () => {
    const ingredient = { unidadePadrao: "g", custoUnitarioPadrao: 0.01 };
    expect(ingredientCost(200, "g", ingredient)).toBe(2);
    expect(ingredientCost(0.2, "kg", ingredient)).toBe(2);
    expect(() => ingredientCost(100, "ml", ingredient)).toThrow();
    expect(
      recipeCost({
        rendimento: 10,
        ingredientes: [
          { ingredienteId: "1", quantidade: 200, unidadeUso: "g", custo: 2 },
          {
            ingredienteId: "2",
            quantidade: 1,
            unidadeUso: "unidade",
            custo: 3,
          },
        ],
      }),
    ).toEqual({ custoTotal: 5, custoPorUnidade: 0.5 });
  });
  it("normaliza unidades de estoque, formata e detecta estoque baixo", () => {
    expect(normalizeStockQuantity(1.5, "kg", "g")).toEqual({
      quantidadePadrao: 1500,
      unidadePadrao: "g",
    });
    expect(() => normalizeStockQuantity(1, "l", "g")).toThrow();
    expect(formatStock(1500, "g")).toContain("1,5 kg");
    expect(formatStock(undefined, "g")).toBe("Não iniciado");
    expect(isLowStock({ estoqueIniciado: true, estoqueAtual: 200, estoqueMinimo: 500 })).toBe(true);
    expect(isLowStock({ estoqueIniciado: false, estoqueMinimo: 500 })).toBe(false);
  });
  it("estorna estoque ao excluir nota disponível e bloqueia se já consumido", () => {
    const data = emptyData();
    data.ingredientes = [
      {
        id: "i1",
        nome: "Chocolate",
        unidadeCompra: "1 kg",
        precoCompra: 40,
        tamanhoCompra: 1000,
        unidadePadrao: "g",
        custoUnitarioPadrao: 0.04,
        estoqueAtual: 1000,
        estoqueIniciado: true,
      },
    ];
    data.despesas = [
      {
        id: "nf1",
        data: "2026-11-13",
        tipo: "Material",
        descricao: "NF 1",
        quantidade: "1 item",
        valor: 40,
        isNotaFiscal: true,
      },
    ];
    data.movimentacoes_estoque = [
      {
        id: "m1",
        data: "2026-11-13",
        itemTipo: "ingrediente",
        itemId: "i1",
        itemNome: "Chocolate",
        tipo: "entrada",
        direcao: "entrada",
        quantidade: 1,
        unidade: "kg",
        quantidadePadrao: 1000,
        deltaPadrao: 1000,
        unidadePadrao: "g",
        saldoPosterior: 1000,
        motivo: "Nota fiscal",
        origemTipo: "nota_fiscal",
        origemId: "nf1",
      },
    ];
    const okMutations = buildExpenseDeletionMutations(data.despesas[0], data);
    expect(okMutations.find((m) => m.collection === "ingredientes")?.data).toMatchObject({
      estoqueAtual: 0,
    });
    expect(okMutations.some((m) => m.collection === "despesas" && m.remove)).toBe(true);

    data.ingredientes[0].estoqueAtual = 400;
    expect(() => buildExpenseDeletionMutations(data.despesas[0], data)).toThrow(
      /já saiu do estoque/,
    );
  });
  it("inclui mão de obra, custos indiretos e markup zero", () => {
    const cost = productCost({
      custoMaterial: 5,
      custoMaoObra: 2,
      custosInvisiveis: 10,
    });
    expect(cost).toBe(7.7);
    expect(priceFor(cost, 100)).toBe(15.4);
    expect(priceFor(cost, 0)).toBe(7.7);
  });
});
describe("caixa e relacionamentos legados", () => {
  it("separa vendido, recebido, pendências e despesas sem duplicar encomendas", () => {
    const data = emptyData();
    data.vendas = [
      sale,
      { ...sale, id: "2", status: "A", quantidade: 1, valor: 10 },
      { ...sale, id: "3", status: "E", quantidade: 1, valor: 20 },
      { ...sale, id: "4", data: "2025-10-23", valor: 999 },
    ];
    data.encomendas = [order];
    data.despesas = [
      {
        id: "d",
        data: "2026-10-23",
        descricao: "Compra",
        tipo: "Material",
        quantidade: "5kg",
        valor: 15,
      },
    ];
    expect(finances(data, "2026-10")).toMatchObject({
      sold: 155.5,
      received: 60,
      pending: 95.5,
      spent: 15,
      balance: 45,
    });
    expect(finances(data, "2026-10").count).toBe(4);
  });
  it("preserva vendas por nome antigo e prioriza IDs após renomear", () => {
    const data = emptyData();
    data.vendas = [sale];
    data.encomendas = [order];
    const customer = {
      id: "c",
      nome: "ANA NOVO",
      nomesAnteriores: ["ANA"],
      contato: "",
    };
    expect(customerTotals(data, customer)).toEqual({
      total: 125.5,
      pending: 95.5,
    });
    data.vendas.push({ ...sale, id: "other", clienteId: "outro" });
    expect(customerTotals(data, customer).total).toBe(125.5);
  });
  it("usa custo da ocasião quando o preço do cadastro muda", () => {
    const data = emptyData();
    data.vendas = [{ ...sale, custoUnitario: 2 }];
    expect(finances(data, "2026-10").productionCost).toBe(6);
  });
  it("inclui encomendas na mensagem de cobrança", () => {
    expect(chargeMessage("ANA", 70, "amigavel")).toContain("70,00");
  });
});
describe("exportação", () => {
  it("preserva IDs, datas tipadas e campos desconhecidos", () => {
    const encoded = encodeBackup({
      id: "abc",
      criadoEm: Timestamp.fromDate(new Date("2026-10-23T12:00:00Z")),
      extra: ["preservar"],
    });
    expect(encoded).toEqual({
      id: "abc",
      criadoEm: {
        __type: "timestamp",
        iso: "2026-10-23T12:00:00.000Z",
        seconds: 1792756800,
        nanoseconds: 0,
      },
      extra: ["preservar"],
    });
  });
  it("protege fórmulas CSV e escapa aspas e separadores", () => {
    const text = csv([["=1+1", "@cmd", " -1", 'a;"b']]);
    expect(text).toContain("'=1+1");
    expect(text).toContain("'@cmd");
    expect(text).toContain('a;""b');
  });
});

describe("fornecedores e vínculos em notas fiscais", () => {
  it("valida fornecedor informal sem CNPJ e valida campos opcionais quando preenchidos", () => {
    expect(
      validateSupplierInput({
        nome: "  Produtor Rural João  ",
        documento: "",
        contato: "",
        email: "",
      }),
    ).toMatchObject({
      nome: "Produtor Rural João",
      documento: "",
    });
    expect(() => validateSupplierInput({ nome: "   " })).toThrow(/razão social/i);
    expect(() =>
      validateSupplierInput({ nome: "ABC", documento: "12345" }),
    ).toThrow(/11 \(CPF\) ou 14 \(CNPJ\)/);
    expect(() =>
      validateSupplierInput({ nome: "ABC", documento: "12.345.678/0001-90" }),
    ).not.toThrow();
    expect(() =>
      validateSupplierInput({ nome: "ABC", email: "email-invalido" }),
    ).toThrow(/e-mail válido/i);
    expect(isArchivableCollection("fornecedores")).toBe(true);
  });

  it("preserva snapshot histórico após renomear/arquivar e nunca auto-vincula nota legada por nome", () => {
    const suppliers: Supplier[] = [
      { id: "sup1", nome: "Distribuidora Nova Ltda", arquivado: true },
      { id: "sup2", nome: "Distribuidora ABC" },
    ];
    const renamedLinked = resolveExpenseSupplier(
      {
        isNotaFiscal: true,
        fornecedorId: "sup1",
        fornecedorNome: "Distribuidora Antiga",
        fornecedor: "Distribuidora Antiga",
      },
      suppliers,
    );
    expect(renamedLinked.displayName).toBe("Distribuidora Antiga");
    expect(renamedLinked.renamedTo).toBe("Distribuidora Nova Ltda");
    expect(renamedLinked.isLegacyUnlinked).toBe(false);
    expect(expenseMatchesSupplierFilter({ fornecedorId: "sup1", isNotaFiscal: true }, "sup1")).toBe(true);

    // Nota legada sem fornecedorId, mesmo tendo o mesmo nome de sup2, não recebe vínculo automático.
    const legacyNote = resolveExpenseSupplier(
      {
        isNotaFiscal: true,
        fornecedor: "Distribuidora ABC",
      },
      suppliers,
    );
    expect(legacyNote.linked).toBeUndefined();
    expect(legacyNote.displayName).toBe("Distribuidora ABC");
    expect(legacyNote.isLegacyUnlinked).toBe(true);
    expect(expenseMatchesSupplierFilter({ isNotaFiscal: true }, "__sem_vinculo__")).toBe(true);
    expect(expenseMatchesSupplierFilter({ isNotaFiscal: true }, "sup2")).toBe(false);
  });
});

describe("entrada opcional de estoque por item da nota fiscal", () => {
  function setupInvoiceStore() {
    const data = emptyData();
    data.fornecedores = [{ id: "f1", nome: "Distribuidora ABC" }];
    data.ingredientes = [
      {
        id: "ing-farinha",
        nome: "Farinha de trigo",
        unidadeCompra: "Pacote 5 kg",
        precoCompra: 25,
        tamanhoCompra: 5000,
        unidadePadrao: "g",
        custoUnitarioPadrao: 0.005,
        estoqueAtual: 1000,
        estoqueIniciado: true,
      },
      {
        id: "ing-choc",
        nome: "Chocolate",
        unidadeCompra: "Barra 1 kg",
        precoCompra: 50,
        tamanhoCompra: 1000,
        unidadePadrao: "g",
        custoUnitarioPadrao: 0.05,
        estoqueAtual: 500,
        estoqueIniciado: true,
      },
      {
        id: "ing-leite",
        nome: "Leite condensado",
        unidadeCompra: "Caixa",
        precoCompra: 10,
        tamanhoCompra: 1,
        unidadePadrao: "unidade",
        custoUnitarioPadrao: 10,
        estoqueAtual: 4,
        estoqueIniciado: true,
      },
    ];
    data.materiais = [
      {
        id: "mat-emb",
        nome: "Embalagem",
        custo: 2,
        estoqueAtual: 20,
        estoqueIniciado: true,
      },
    ];
    return data;
  }

  it("gera entradas apenas para itens marcados mantendo todos os 4 itens e o valor total da nota", () => {
    const data = setupInvoiceStore();
    const items: ExpenseInvoiceItem[] = [
      {
        id: "it-farinha",
        itemTipo: "ingrediente",
        itemId: "ing-farinha",
        itemNome: "Farinha de trigo",
        quantidade: 5,
        unidade: "kg",
        quantidadePadrao: 5000,
        unidadePadrao: "g",
        valorUnitario: 10,
        subtotal: 50,
        geraEstoque: true,
        adicionarEstoque: true,
      },
      {
        id: "it-choc",
        itemTipo: "ingrediente",
        itemId: "ing-choc",
        itemNome: "Chocolate",
        quantidade: 2,
        unidade: "kg",
        quantidadePadrao: 2000,
        unidadePadrao: "g",
        valorUnitario: 50,
        subtotal: 100,
        geraEstoque: true,
        adicionarEstoque: true,
      },
      {
        id: "it-emb",
        itemTipo: "material",
        itemId: "mat-emb",
        itemNome: "Embalagem",
        quantidade: 10,
        unidade: "unidade",
        quantidadePadrao: 10,
        unidadePadrao: "unidade",
        valorUnitario: 3,
        subtotal: 30,
        geraEstoque: false,
        adicionarEstoque: false,
      },
      {
        id: "it-leite",
        itemTipo: "ingrediente",
        itemId: "ing-leite",
        itemNome: "Leite condensado",
        quantidade: 10,
        unidade: "unidade",
        quantidadePadrao: 10,
        unidadePadrao: "unidade",
        valorUnitario: 10,
        subtotal: 100,
        geraEstoque: true,
        adicionarEstoque: true,
      },
    ];

    const { expenseData, stockMutations } = buildInvoiceMutations({
      data,
      expenseId: "nf-mix",
      date: "2026-11-16",
      category: "Material",
      fornecedorId: "f1",
      fornecedorNome: "Distribuidora ABC",
      numeroNota: "001",
      items,
    });

    // Todos os 4 itens e o total financeiro completo (50 + 100 + 30 + 100 = 280) são preservados.
    expect(expenseData.valor).toBe(280);
    expect(expenseData.itensNota).toHaveLength(4);

    // Exatamente 3 movimentações de entrada determinísticas (Embalagem não gera movimento nem altera saldo).
    const movementsCreated = stockMutations.filter(
      (m) => m.collection === "movimentacoes_estoque",
    );
    expect(movementsCreated).toHaveLength(3);
    expect(movementsCreated.map((m) => m.id)).toEqual([
      "nf_nf-mix_it-farinha",
      "nf_nf-mix_it-choc",
      "nf_nf-mix_it-leite",
    ]);

    const matUpdates = stockMutations.filter((m) => m.collection === "materiais");
    expect(matUpdates).toHaveLength(0);

    const ingUpdates = stockMutations.filter((m) => m.collection === "ingredientes");
    expect(ingUpdates).toHaveLength(3);
    expect(ingUpdates.find((m) => m.id === "ing-farinha")?.data?.estoqueAtual).toBe(6000);
    expect(ingUpdates.find((m) => m.id === "ing-choc")?.data?.estoqueAtual).toBe(2500);
    expect(ingUpdates.find((m) => m.id === "ing-leite")?.data?.estoqueAtual).toBe(14);
  });

  it("edita sem duplicar, não presume entrada para legado sem movimento e estorna somente o que entrou", () => {
    const data = setupInvoiceStore();
    const existing: Expense = {
      id: "nf-edit",
      data: "2026-11-16",
      tipo: "Material",
      descricao: "NF 009 · Distribuidora ABC · (2 itens)",
      quantidade: "2 itens",
      valor: 80,
      isNotaFiscal: true,
      fornecedorId: "f1",
      fornecedorNome: "Distribuidora ABC",
      itensNota: [
        {
          id: "it-a",
          itemTipo: "ingrediente",
          itemId: "ing-farinha",
          itemNome: "Farinha de trigo",
          quantidade: 1,
          unidade: "kg",
          quantidadePadrao: 1000,
          unidadePadrao: "g",
          valorUnitario: 50,
          subtotal: 50,
          geraEstoque: true,
        },
        {
          // Simula item legado sem adicionarEstoque e sem movimentação gravada (apesar de geraEstoque antigo)
          id: "it-b",
          itemTipo: "material",
          itemId: "mat-emb",
          itemNome: "Embalagem",
          quantidade: 10,
          unidade: "unidade",
          quantidadePadrao: 10,
          unidadePadrao: "unidade",
          valorUnitario: 3,
          subtotal: 30,
          geraEstoque: true,
        },
      ],
    };
    data.ingredientes[0].estoqueAtual = 2000;
    data.movimentacoes_estoque = [
      {
        id: "nf_nf-edit_it-a",
        data: "2026-11-16",
        itemTipo: "ingrediente",
        itemId: "ing-farinha",
        itemNome: "Farinha de trigo",
        tipo: "entrada",
        direcao: "entrada",
        quantidade: 1,
        unidade: "kg",
        quantidadePadrao: 1000,
        deltaPadrao: 1000,
        unidadePadrao: "g",
        saldoAnterior: 1000,
        saldoPosterior: 2000,
        motivo: "Nota fiscal #009",
        origemTipo: "nota_fiscal",
        origemId: "nf-edit",
        origemItemId: "it-a",
      },
    ];

    // Estado real determinado pelas movimentações gravadas: it-a tem +1000, it-b tem 0.
    expect(invoiceItemNetStockDelta("nf-edit", "it-a", data.movimentacoes_estoque)).toBe(1000);
    expect(invoiceItemNetStockDelta("nf-edit", "it-b", data.movimentacoes_estoque)).toBe(0);

    // Ao editar apenas observações mantendo o estado real (it-a: true, it-b: false), nenhuma movimentação é criada.
    const unchanged = buildInvoiceMutations({
      data,
      existingInvoice: existing,
      expenseId: existing.id,
      date: existing.data,
      category: existing.tipo,
      fornecedorId: "f1",
      fornecedorNome: "Distribuidora ABC",
      numeroNota: "009",
      observacoes: "Conferida",
      items: [
        { ...existing.itensNota![0], adicionarEstoque: true, geraEstoque: true },
        { ...existing.itensNota![1], adicionarEstoque: false, geraEstoque: false },
      ],
    });
    expect(unchanged.stockMutations).toHaveLength(0);
    expect(unchanged.expenseData.valor).toBe(80);

    // Ao desmarcar it-a durante a edição, estorna apenas os 1000 g de farinha e preserva valor R$ 80.
    const uncheckedItemA = buildInvoiceMutations({
      data,
      existingInvoice: existing,
      expenseId: existing.id,
      date: existing.data,
      category: existing.tipo,
      fornecedorId: "f1",
      fornecedorNome: "Distribuidora ABC",
      numeroNota: "009",
      items: [
        { ...existing.itensNota![0], adicionarEstoque: false, geraEstoque: false },
        { ...existing.itensNota![1], adicionarEstoque: false, geraEstoque: false },
      ],
      movementIdSuffix: () => "rev1",
    });
    expect(uncheckedItemA.expenseData.valor).toBe(80);
    expect(uncheckedItemA.stockMutations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: "ingredientes",
          id: "ing-farinha",
          data: { estoqueAtual: 1000, estoqueIniciado: true },
        }),
        expect.objectContaining({
          collection: "movimentacoes_estoque",
          createOnly: true,
          data: expect.objectContaining({
            origemTipo: "correcao_nota",
            deltaPadrao: -1000,
            saldoPosterior: 1000,
          }),
        }),
      ]),
    );

    // Se excluir a nota após o estorno parcial já ter ocorrido, não estorna farinha duas vezes.
    data.movimentacoes_estoque.push({
      id: "nf_nf-edit_it-a_rev_rev1",
      data: "2026-11-16",
      itemTipo: "ingrediente",
      itemId: "ing-farinha",
      itemNome: "Farinha de trigo",
      tipo: "ajuste",
      direcao: "saida",
      quantidade: 1000,
      unidade: "g",
      quantidadePadrao: 1000,
      deltaPadrao: -1000,
      unidadePadrao: "g",
      saldoAnterior: 2000,
      saldoPosterior: 1000,
      motivo: "Correção",
      origemTipo: "correcao_nota",
      origemId: "nf-edit",
      origemItemId: "it-a",
    });
    expect(expenseHasActiveStockEntries("nf-edit", data.movimentacoes_estoque)).toBe(false);
    const delMuts = buildExpenseDeletionMutations(existing, data);
    expect(delMuts).toEqual([
      expect.objectContaining({ collection: "despesas", id: "nf-edit", remove: true }),
    ]);
    expect(invoiceItemAddsToStock({ itemTipo: "outro", geraEstoque: true, adicionarEstoque: true })).toBe(false);
  });
});
