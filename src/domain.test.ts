import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  chargeMessage,
  csv,
  customerTotals,
  dateText,
  encodeBackup,
  finances,
  ingredientCost,
  orderRemaining,
  positive,
  priceFor,
  productCost,
  recipeCost,
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
describe("custos, unidades e preço", () => {
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
