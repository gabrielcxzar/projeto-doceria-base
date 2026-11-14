import type {
  BaseUnit,
  Customer,
  DataStore,
  DateValue,
  Expense,
  Ingredient,
  Material,
  Mutation,
  Order,
  OrderAccessory,
  OrderItem,
  PaymentReceipt,
  Product,
  Recipe,
  RecordBase,
  Sale,
  StockUnit,
} from "./types";

const ptBrCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});

export const compareTextPtBr = (a: string, b: string) =>
  ptBrCollator.compare((a || "").trim(), (b || "").trim());

export function sortByTextPtBr<T>(
  items: readonly T[],
  getText: (item: T) => string,
  getId?: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const primary = compareTextPtBr(getText(a), getText(b));
    if (primary !== 0) return primary;
    return getId ? getId(a).localeCompare(getId(b)) : 0;
  });
}

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(value) ? value : 0,
  );
export const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export const roundStock = (value: number) =>
  Math.round((value + Number.EPSILON) * 10000) / 10000;

export function versionOf(record: RecordBase) {
  const value = record.atualizadoEm;
  return value && typeof value === "object" && "toMillis" in value
    ? value.toMillis()
    : 0;
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function dateText(value: DateValue | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value.split("-").reverse().join("/");
  const d =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : value.toDate();
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function positive(value: unknown, label = "Valor", allowZero = false) {
  if (value === "" || value === null || value === undefined)
    throw new Error(`${label} é obrigatório.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0))
    throw new Error(
      `${label} deve ser ${allowZero ? "zero ou maior" : "maior que zero"}.`,
    );
  return n;
}

export const saleTotal = (s: Sale) => round(s.valor * s.quantidade);
export const saleReceived = (s: Sale) => {
  const total = saleTotal(s);
  if (s.status !== "P") return total;
  return Math.min(total, Math.max(0, round(s.valorPago || 0)));
};
export const saleRemaining = (s: Sale) =>
  Math.max(0, round(saleTotal(s) - saleReceived(s)));

export const orderRemaining = (o: Order) =>
  o.status === "Finalizado"
    ? 0
    : Math.max(0, round(o.valorTotal - (o.valorEntrada || 0)));
export const orderReceived = (o: Order) =>
  o.status === "Finalizado"
    ? o.valorTotal
    : Math.min(o.valorTotal, Math.max(0, o.valorEntrada || 0));

export const customerMatches = (
  record: { clienteId?: string; clienteNome?: string; pessoa?: string },
  c: Customer,
) =>
  record.clienteId
    ? record.clienteId === c.id
    : [c.nome, ...(c.nomesAnteriores || [])].includes(
        (record.clienteNome ?? record.pessoa) || "",
      );

export function resolveCustomer(
  record: { clienteId?: string; clienteNome?: string; pessoa?: string },
  customers: readonly Customer[],
): Customer | undefined {
  if (record.clienteId) {
    const byId = customers.find((c) => c.id === record.clienteId);
    if (byId) return byId;
  }
  const name = (record.clienteNome ?? record.pessoa) || "";
  if (!name) return undefined;
  return customers.find((c) =>
    [c.nome, ...(c.nomesAnteriores || [])].includes(name),
  );
}

export function customerTotals(data: DataStore, c: Customer) {
  const sales = data.vendas.filter((s) => customerMatches(s, c));
  const orders = data.encomendas.filter((o) => customerMatches(o, c));
  return {
    total: round(
      sales.reduce((v, s) => v + saleTotal(s), 0) +
        orders.reduce((v, o) => v + o.valorTotal, 0),
    ),
    pending: round(
      sales.reduce((v, s) => v + saleRemaining(s), 0) +
        orders.reduce((v, o) => v + orderRemaining(o), 0),
    ),
  };
}

export interface SaleGroup {
  key: string;
  pedidoId?: string;
  data: string;
  clienteId?: string;
  clienteNome: string;
  items: Sale[];
  distinctProductCount: number;
  isMultiProduct: boolean;
  totalUnits: number;
  total: number;
  received: number;
  remaining: number;
  pagamento: string;
  statusSummary: "P" | "A" | "E" | "Parcial" | "Misto";
}

export function groupSales(
  sales: readonly Sale[],
  customers: readonly Customer[] = [],
): SaleGroup[] {
  const map = new Map<string, Sale[]>();
  for (const s of sales) {
    const key = s.pedidoId ? `pedido:${s.pedidoId}` : `sale:${s.id}`;
    const list = map.get(key) || [];
    list.push(s);
    map.set(key, list);
  }
  const groups: SaleGroup[] = [];
  for (const [key, items] of map.entries()) {
    const first = items[0];
    const matched = resolveCustomer(first, customers);
    const clienteNome = matched?.nome || first.pessoa;
    const distinctProducts = new Set(
      items.map((s) => s.produtoId || `name:${s.produto.trim().toUpperCase()}`),
    );
    const total = round(items.reduce((sum, s) => sum + saleTotal(s), 0));
    const received = round(items.reduce((sum, s) => sum + saleReceived(s), 0));
    const remaining = Math.max(0, round(total - received));
    const totalUnits = items.reduce((sum, s) => sum + s.quantidade, 0);
    const statuses = new Set(items.map((s) => s.status));
    let statusSummary: SaleGroup["statusSummary"] = "A";
    if (remaining > 0 && received > 0) statusSummary = "Parcial";
    else if (statuses.size === 1) statusSummary = first.status;
    else if (remaining > 0) statusSummary = "Misto";
    else statusSummary = statuses.has("A") ? "A" : "E";
    const payments = new Set(items.map((s) => s.pagamento));
    groups.push({
      key,
      pedidoId: first.pedidoId,
      data: first.data,
      clienteId: matched?.id || first.clienteId,
      clienteNome,
      items: [...items].sort((a, b) => a.id.localeCompare(b.id)),
      distinctProductCount: distinctProducts.size,
      isMultiProduct: !!first.pedidoId && distinctProducts.size > 1,
      totalUnits,
      total,
      received,
      remaining,
      pagamento: payments.size === 1 ? first.pagamento : "Misto",
      statusSummary,
    });
  }
  return groups.sort((a, b) => {
    const d = b.data.localeCompare(a.data);
    if (d !== 0) return d;
    const c = compareTextPtBr(a.clienteNome, b.clienteNome);
    if (c !== 0) return c;
    return a.key.localeCompare(b.key);
  });
}

export interface OrderGroup {
  key: string;
  dataEntrega: string;
  clienteId?: string;
  clienteNome: string;
  orders: Order[];
  total: number;
  received: number;
  remaining: number;
  statusLabel: Order["status"] | "Situações diferentes";
  mixedStatus: boolean;
}

export function groupOrders(
  orders: readonly Order[],
  customers: readonly Customer[] = [],
  direction: "desc" | "asc" = "desc",
): OrderGroup[] {
  const map = new Map<string, { clienteNome: string; clienteId?: string; dataEntrega: string; orders: Order[] }>();
  for (const o of orders) {
    const matched = resolveCustomer(o, customers);
    const customerKey = matched
      ? `id:${matched.id}`
      : o.clienteId
        ? `id:${o.clienteId}`
        : `name:${o.clienteNome.trim().toUpperCase()}`;
    const key = `${o.dataEntrega}::${customerKey}`;
    const current = map.get(key) || {
      clienteNome: matched?.nome || o.clienteNome,
      clienteId: matched?.id || o.clienteId,
      dataEntrega: o.dataEntrega,
      orders: [],
    };
    current.orders.push(o);
    map.set(key, current);
  }
  const groups: OrderGroup[] = [];
  for (const [key, entry] of map.entries()) {
    const total = round(entry.orders.reduce((s, o) => s + o.valorTotal, 0));
    const received = round(entry.orders.reduce((s, o) => s + orderReceived(o), 0));
    const remaining = round(entry.orders.reduce((s, o) => s + orderRemaining(o), 0));
    const statuses = new Set(entry.orders.map((o) => o.status));
    const mixedStatus = statuses.size > 1;
    groups.push({
      key,
      dataEntrega: entry.dataEntrega,
      clienteId: entry.clienteId,
      clienteNome: entry.clienteNome,
      orders: [...entry.orders].sort((a, b) => a.id.localeCompare(b.id)),
      total,
      received,
      remaining,
      mixedStatus,
      statusLabel: mixedStatus ? "Situações diferentes" : entry.orders[0].status,
    });
  }
  return groups.sort((a, b) => {
    const d =
      direction === "desc"
        ? b.dataEntrega.localeCompare(a.dataEntrega)
        : a.dataEntrega.localeCompare(b.dataEntrega);
    if (d !== 0) return d;
    const c = compareTextPtBr(a.clienteNome, b.clienteNome);
    if (c !== 0) return c;
    return a.key.localeCompare(b.key);
  });
}

export function finances(data: DataStore, period: string) {
  const sales = data.vendas.filter((s) => !period || s.data.startsWith(period));
  const orders = data.encomendas.filter(
    (o) => !period || o.dataEntrega.startsWith(period),
  );
  const expenses = data.despesas.filter(
    (e) => !period || e.data.startsWith(period),
  );
  const receipts = (data.recebimentos || []).filter(
    (r) => !period || r.data.startsWith(period),
  );

  const sold = round(
    sales.reduce((n, s) => n + saleTotal(s), 0) +
      orders.reduce((n, o) => n + o.valorTotal, 0),
  );

  // Soma recebimentos datados no período + parcelas legadas sem registro de recebimento.
  const allReceipts = data.recebimentos || [];
  const saleReceiptByGroup = new Map<string, number>();
  const orderReceiptById = new Map<string, number>();
  for (const r of allReceipts) {
    if (r.origemTipo === "encomenda") {
      orderReceiptById.set(
        r.origemId,
        round((orderReceiptById.get(r.origemId) || 0) + r.valor),
      );
    } else if (r.origemTipo === "pedido_venda") {
      const k = `pedido:${r.origemId}`;
      saleReceiptByGroup.set(
        k,
        round((saleReceiptByGroup.get(k) || 0) + r.valor),
      );
    } else {
      const sale = data.vendas.find((s) => s.id === r.origemId);
      const k = sale?.pedidoId ? `pedido:${sale.pedidoId}` : `sale:${r.origemId}`;
      saleReceiptByGroup.set(
        k,
        round((saleReceiptByGroup.get(k) || 0) + r.valor),
      );
    }
  }

  let legacyReceived = 0;
  const saleGroupsAll = new Map<string, Sale[]>();
  for (const s of data.vendas) {
    const k = s.pedidoId ? `pedido:${s.pedidoId}` : `sale:${s.id}`;
    const list = saleGroupsAll.get(k) || [];
    list.push(s);
    saleGroupsAll.set(k, list);
  }
  for (const [k, groupSalesList] of saleGroupsAll.entries()) {
    const totalReceivedForGroup = round(
      groupSalesList.reduce((sum, s) => sum + saleReceived(s), 0),
    );
    const datedSum = saleReceiptByGroup.get(k) || 0;
    const legacyPortion = Math.max(0, round(totalReceivedForGroup - datedSum));
    if (legacyPortion > 0) {
      const groupInPeriod = groupSalesList.some(
        (s) => !period || s.data.startsWith(period),
      );
      if (groupInPeriod) legacyReceived = round(legacyReceived + legacyPortion);
    }
  }
  for (const o of data.encomendas) {
    const totalReceivedForOrder = round(orderReceived(o));
    const datedSum = orderReceiptById.get(o.id) || 0;
    const legacyPortion = Math.max(0, round(totalReceivedForOrder - datedSum));
    if (legacyPortion > 0 && (!period || o.dataEntrega.startsWith(period))) {
      legacyReceived = round(legacyReceived + legacyPortion);
    }
  }

  const received = round(
    receipts.reduce((n, r) => n + r.valor, 0) + legacyReceived,
  );
  const spent = round(expenses.reduce((n, e) => n + e.valor, 0));
  const pending = round(
    sales.reduce((n, s) => n + saleRemaining(s), 0) +
      orders.reduce((n, o) => n + orderRemaining(o), 0),
  );
  const productionCost = round(
    sales.reduce((n, s) => {
      const p = data.produtos.find((p) =>
        s.produtoId
          ? p.id === s.produtoId
          : [p.nome, ...(p.nomesAnteriores || [])].includes(s.produto),
      );
      return n + (s.custoUnitario ?? (p ? productCost(p) : 0)) * s.quantidade;
    }, 0),
  );
  const saleOrderCount = new Set(
    sales.map((s) => (s.pedidoId ? `pedido:${s.pedidoId}` : `sale:${s.id}`)),
  ).size;

  return {
    sales,
    orders,
    expenses,
    receipts,
    sold,
    received,
    spent,
    pending,
    productionCost,
    balance: round(received - spent),
    count: saleOrderCount + orders.length,
    saleOrderCount,
    saleItemCount: sales.length,
  };
}

export function productCost(
  p: Pick<Product, "custoMaterial" | "custoMaoObra" | "custosInvisiveis">,
) {
  return round(
    ((p.custoMaterial || 0) + (p.custoMaoObra || 0)) *
      (1 + (p.custosInvisiveis || 0) / 100),
  );
}
export const priceFor = (cost: number, markup: number) =>
  round(cost * (1 + markup / 100));

export function compatibleUnits(baseUnit: BaseUnit): StockUnit[] {
  if (baseUnit === "g") return ["g", "kg"];
  if (baseUnit === "ml") return ["ml", "l"];
  return ["unidade"];
}

export function normalizeStockQuantity(
  amount: number,
  unit: string,
  expectedBaseUnit: BaseUnit,
): { quantidadePadrao: number; unidadePadrao: BaseUnit } {
  const baseMap: Record<string, BaseUnit> = {
    kg: "g",
    g: "g",
    l: "ml",
    ml: "ml",
    unidade: "unidade",
  };
  const base = baseMap[unit];
  if (!base || base !== expectedBaseUnit)
    throw new Error(
      `Unidade "${unit}" incompatível com a unidade padrão "${expectedBaseUnit}".`,
    );
  const factor = unit === "kg" || unit === "l" ? 1000 : 1;
  return {
    quantidadePadrao: roundStock(amount * factor),
    unidadePadrao: expectedBaseUnit,
  };
}

export function formatStock(amountBase: number | undefined, baseUnit: string) {
  if (amountBase === undefined || amountBase === null || !Number.isFinite(amountBase))
    return "Não iniciado";
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 3,
    }).format(v);
  if (baseUnit === "g" && Math.abs(amountBase) >= 1000)
    return `${fmt(amountBase)} g (${fmt(roundStock(amountBase / 1000))} kg)`;
  if (baseUnit === "ml" && Math.abs(amountBase) >= 1000)
    return `${fmt(amountBase)} ml (${fmt(roundStock(amountBase / 1000))} l)`;
  if (baseUnit === "unidade")
    return `${fmt(amountBase)} un.`;
  return `${fmt(amountBase)} ${baseUnit}`;
}

export function isLowStock(
  item: Pick<Ingredient | Material, "estoqueAtual" | "estoqueMinimo" | "estoqueIniciado">,
) {
  if (!item.estoqueIniciado && item.estoqueAtual === undefined) return false;
  if (item.estoqueMinimo === undefined || item.estoqueMinimo <= 0) return false;
  return (item.estoqueAtual ?? 0) <= item.estoqueMinimo;
}

export function ingredientCost(
  amount: number,
  unit: string,
  ingredient: { unidadePadrao: string; custoUnitarioPadrao: number },
) {
  const base = { kg: "g", g: "g", l: "ml", ml: "ml", unidade: "unidade" }[unit];
  if (!base || base !== ingredient.unidadePadrao)
    throw new Error(
      "A unidade da receita deve ser compatível com a compra do ingrediente.",
    );
  return (
    amount *
    (unit === "kg" || unit === "l" ? 1000 : 1) *
    ingredient.custoUnitarioPadrao
  );
}
export function recipeCost(
  recipe: Pick<Recipe, "ingredientes" | "rendimento">,
) {
  const total = round(recipe.ingredientes.reduce((n, i) => n + i.custo, 0));
  return {
    custoTotal: total,
    custoPorUnidade: total / positive(recipe.rendimento, "Rendimento"),
  };
}
export function validateSale(data: Omit<Sale, "id">) {
  if (!validDate(data.data)) throw new Error("Informe uma data válida.");
  if (!data.pessoa.trim() || !data.produto.trim())
    throw new Error("Selecione cliente e produto.");
  const q = positive(data.quantidade, "Quantidade");
  if (!Number.isInteger(q))
    throw new Error("Quantidade deve ser um número inteiro.");
  positive(data.valor, "Preço");
  if (!["P", "A", "E"].includes(data.status))
    throw new Error("Status inválido.");
  if (data.valorPago !== undefined) {
    const paid = positive(data.valorPago, "Valor pago", true);
    const total = round(data.valor * data.quantidade);
    if (paid > total)
      throw new Error("O valor pago não pode superar o total da venda.");
    if (data.status !== "P" && paid < total)
      throw new Error("Venda parcialmente paga deve permanecer como Pendente.");
  }
}
export function validateOrder(data: Omit<Order, "id">) {
  if (!validDate(data.dataEntrega))
    throw new Error("Informe uma data de entrega válida.");
  if (!data.clienteNome.trim() || !data.produtoDescricao.trim())
    throw new Error("Informe cliente e descrição.");
  positive(data.valorTotal, "Total");
  positive(data.valorEntrada, "Entrada", true);
  if (data.valorEntrada > data.valorTotal)
    throw new Error("A entrada não pode superar o total.");
  if (!["Pendente", "Em Produção", "Finalizado"].includes(data.status))
    throw new Error("Status inválido.");
}

export function summarizeOrderItems(
  items: readonly OrderItem[],
  accessories: readonly OrderAccessory[],
  observacoes?: string,
) {
  const parts: string[] = [];
  for (const item of items) {
    parts.push(`${item.quantidade}× ${item.produtoNome}`);
  }
  for (const acc of accessories) {
    parts.push(
      acc.cobradoCliente
        ? `${acc.quantidade}× ${acc.descricao} (cobrado)`
        : `${acc.quantidade}× ${acc.descricao} (incluso)`,
    );
  }
  if (!parts.length && observacoes?.trim()) return observacoes.trim();
  return parts.join(" · ").slice(0, 950);
}

export function computeOrderTotal(
  items: readonly OrderItem[],
  accessories: readonly OrderAccessory[],
) {
  const itemsSum = items.reduce((s, i) => s + round(i.quantidade * i.valorUnitario), 0);
  const chargedAccSum = accessories
    .filter((a) => a.cobradoCliente)
    .reduce((s, a) => s + round(a.quantidade * a.valorUnitario), 0);
  return round(itemsSum + chargedAccSum);
}

export type PendingLaunch =
  | {
      kind: "sale";
      key: string;
      name: string;
      clienteId?: string;
      description: string;
      date: string;
      originalAmount: number;
      receivedAmount: number;
      remainingAmount: number;
      pagamento: string;
      sales: Sale[];
      pedidoId?: string;
    }
  | {
      kind: "order";
      key: string;
      name: string;
      clienteId?: string;
      description: string;
      date: string;
      originalAmount: number;
      receivedAmount: number;
      remainingAmount: number;
      pagamento: string;
      order: Order;
    };

export function collectPendingLaunches(data: DataStore): PendingLaunch[] {
  const launches: PendingLaunch[] = [];
  for (const group of groupSales(data.vendas, data.clientes)) {
    if (group.remaining <= 0) continue;
    const desc =
      group.items.length > 1
        ? `${group.items.map((s) => `${s.quantidade} × ${s.produto}`).join(", ")}`
        : `${group.items[0].quantidade} × ${group.items[0].produto}`;
    launches.push({
      kind: "sale",
      key: group.key,
      name: group.clienteNome,
      clienteId: group.clienteId,
      description: desc,
      date: group.data,
      originalAmount: group.total,
      receivedAmount: group.received,
      remainingAmount: group.remaining,
      pagamento: group.pagamento === "Misto" ? "PIX" : group.pagamento,
      sales: group.items,
      pedidoId: group.pedidoId,
    });
  }
  for (const o of data.encomendas) {
    const remaining = orderRemaining(o);
    if (remaining <= 0) continue;
    launches.push({
      kind: "order",
      key: `order:${o.id}`,
      name: o.clienteNome,
      clienteId: o.clienteId,
      description: o.produtoDescricao,
      date: o.dataEntrega,
      originalAmount: o.valorTotal,
      receivedAmount: orderReceived(o),
      remainingAmount: remaining,
      pagamento: "PIX",
      order: o,
    });
  }
  return launches.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return compareTextPtBr(a.name, b.name);
  });
}

export function buildPartialPaymentMutations(params: {
  launch: PendingLaunch;
  amount: number;
  date: string;
  method: string;
  receiptId?: string;
  tipoBaixa?: PaymentReceipt["tipoBaixa"];
}): Mutation[] {
  const { launch, amount, date, method, receiptId } = params;
  if (!validDate(date)) throw new Error("Informe uma data de recebimento válida.");
  const pay = round(positive(amount, "Valor recebido"));
  const remaining = round(launch.remainingAmount);
  if (pay > remaining) {
    throw new Error(
      `O valor informado (${money(pay)}) excede o saldo pendente (${money(remaining)}).`,
    );
  }
  if (!["PIX", "Dinheiro", "Cartão", "Transferência"].includes(method)) {
    throw new Error("Forma de pagamento inválida.");
  }
  const isFull = pay === remaining;
  const tipoBaixa = params.tipoBaixa ?? (isFull ? "integral" : "parcial");
  const mutations: Mutation[] = [];

  if (launch.kind === "order") {
    const newEntrada = Math.min(
      launch.order.valorTotal,
      round((launch.order.valorEntrada || 0) + pay),
    );
    mutations.push({
      collection: "encomendas",
      id: launch.order.id,
      expectedUpdatedAt: versionOf(launch.order),
      data: { valorEntrada: newEntrada },
    });
    mutations.push({
      collection: "recebimentos",
      id: receiptId,
      createOnly: !!receiptId,
      data: {
        data: date,
        valor: pay,
        origemTipo: "encomenda",
        origemId: launch.order.id,
        clienteId: launch.clienteId || "",
        clienteNome: launch.name,
        descricao: launch.description.slice(0, 900),
        pagamento: method,
        tipoBaixa,
      },
    });
    return mutations;
  }

  let leftToAllocate = pay;
  const affectedSaleIds: string[] = [];
  for (const s of launch.sales) {
    const itemRem = saleRemaining(s);
    if (itemRem <= 0 || leftToAllocate <= 0) continue;
    const apply = Math.min(itemRem, round(leftToAllocate));
    const currentPaid = saleReceived(s);
    const nextPaid = Math.min(saleTotal(s), round(currentPaid + apply));
    const itemSettled = nextPaid >= saleTotal(s);
    mutations.push({
      collection: "vendas",
      id: s.id,
      expectedUpdatedAt: versionOf(s),
      data: {
        valorPago: nextPaid,
        status: itemSettled ? "A" : "P",
      },
    });
    affectedSaleIds.push(s.id);
    leftToAllocate = round(leftToAllocate - apply);
  }
  if (leftToAllocate > 0) {
    throw new Error("Não foi possível alocar o recebimento ao saldo da venda.");
  }

  mutations.push({
    collection: "recebimentos",
    id: receiptId,
    createOnly: !!receiptId,
    data: {
      data: date,
      valor: pay,
      origemTipo: launch.pedidoId ? "pedido_venda" : "venda",
      origemId: launch.pedidoId || launch.sales[0].id,
      vendaIds: affectedSaleIds,
      clienteId: launch.clienteId || "",
      clienteNome: launch.name,
      descricao: launch.description.slice(0, 900),
      pagamento: method,
      tipoBaixa,
    },
  });

  return mutations;
}

export function buildExpenseDeletionMutations(
  expense: Expense,
  data: DataStore,
): Mutation[] {
  const movements = (data.movimentacoes_estoque || []).filter(
    (m) => m.origemId === expense.id && m.origemTipo !== "correcao_nota",
  );
  if (!movements.length) {
    return [
      {
        collection: "despesas",
        id: expense.id,
        expectedUpdatedAt: versionOf(expense),
        remove: true,
      },
    ];
  }

  // Agrupa delta líquido de entradas por item (ingrediente/material).
  const byItem = new Map<
    string,
    {
      itemTipo: "ingrediente" | "material";
      itemId: string;
      itemNome: string;
      unidadePadrao: BaseUnit;
      deltaPadrao: number;
    }
  >();
  for (const m of movements) {
    const k = `${m.itemTipo}:${m.itemId}`;
    const current = byItem.get(k) || {
      itemTipo: m.itemTipo,
      itemId: m.itemId,
      itemNome: m.itemNome,
      unidadePadrao: m.unidadePadrao,
      deltaPadrao: 0,
    };
    current.deltaPadrao = roundStock(current.deltaPadrao + m.deltaPadrao);
    byItem.set(k, current);
  }

  const mutations: Mutation[] = [];
  for (const entry of byItem.values()) {
    if (entry.deltaPadrao <= 0) continue;
    const target =
      entry.itemTipo === "ingrediente"
        ? data.ingredientes.find((i) => i.id === entry.itemId)
        : data.materiais.find((m) => m.id === entry.itemId);
    if (!target) {
      throw new Error(
        `Item "${entry.itemNome}" não encontrado para estornar o estoque.`,
      );
    }
    const available = target.estoqueAtual ?? 0;
    if (available < entry.deltaPadrao) {
      throw new Error(
        `Não é possível excluir este lançamento porque parte de "${entry.itemNome}" já saiu do estoque (disponível: ${formatStock(available, entry.unidadePadrao)}, entrada vinculada: ${formatStock(entry.deltaPadrao, entry.unidadePadrao)}).`,
      );
    }
    const nextBalance = roundStock(available - entry.deltaPadrao);
    mutations.push({
      collection: entry.itemTipo === "ingrediente" ? "ingredientes" : "materiais",
      id: target.id,
      expectedUpdatedAt: versionOf(target),
      data: {
        estoqueAtual: nextBalance,
        estoqueIniciado: true,
      },
    });
    mutations.push({
      collection: "movimentacoes_estoque",
      data: {
        data: today(),
        itemTipo: entry.itemTipo,
        itemId: entry.itemId,
        itemNome: entry.itemNome,
        tipo: "ajuste",
        direcao: "saida",
        quantidade: entry.deltaPadrao,
        unidade: entry.unidadePadrao,
        quantidadePadrao: entry.deltaPadrao,
        deltaPadrao: -entry.deltaPadrao,
        unidadePadrao: entry.unidadePadrao,
        saldoAnterior: available,
        saldoPosterior: nextBalance,
        motivo: `Estorno por exclusão: ${expense.descricao}`,
        origemTipo: "correcao_nota",
        origemId: expense.id,
      },
    });
  }

  mutations.push({
    collection: "despesas",
    id: expense.id,
    expectedUpdatedAt: versionOf(expense),
    remove: true,
  });

  return mutations;
}

export function chargeMessage(name: string, pending: number, type: string) {
  const intro =
    type === "urgente"
      ? "Precisamos combinar a regularização"
      : type === "lembrete"
        ? "Passando para lembrar"
        : "Tudo bem? Passando com carinho para avisar";
  return `Olá, ${name}! ${intro} que há ${money(pending)} em aberto na Lá Divino Sabor. Podemos combinar o pagamento? Se já pagou, por favor nos envie o comprovante. Obrigado!`;
}
export function encodeBackup(value: unknown): unknown {
  if (value instanceof Date)
    return { __type: "timestamp", iso: value.toISOString() };
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  )
    return {
      __type: "timestamp",
      iso: value.toDate().toISOString(),
      ...("seconds" in value && "nanoseconds" in value
        ? { seconds: value.seconds, nanoseconds: value.nanoseconds }
        : {}),
    };
  if (Array.isArray(value)) return value.map(encodeBackup);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, encodeBackup(v)]),
    );
  return value;
}
export function csv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((cell) => {
            let value = String(cell ?? "");
            if (/^[\s]*[=+@-]/.test(value)) value = "'" + value;
            return `"${value.replaceAll('"', '""')}"`;
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
