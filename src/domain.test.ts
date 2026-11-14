import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  buildExpenseDeletionMutations,
  buildPartialPaymentMutations,
  chargeMessage,
  collectPendingLaunches,
  computeOrderTotal,
  csv,
  customerTotals,
  dateText,
  encodeBackup,
  finances,
  formatStock,
  groupOrders,
  groupSales,
  ingredientCost,
  isLowStock,
  normalizeStockQuantity,
  orderRemaining,
  positive,
  priceFor,
  productCost,
  recipeCost,
  saleRemaining,
  sortByTextPtBr,
  validDate,
  validateOrder,
  validateSale,
} from "./domain";
import { emptyData } from "./types";
import type { Order, Sale } from "./types";

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
