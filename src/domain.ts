import type {
  Customer,
  DataStore,
  DateValue,
  Order,
  Product,
  Recipe,
  RecordBase,
  Sale,
} from "./types";

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(value) ? value : 0,
  );
export const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
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
export const orderRemaining = (o: Order) =>
  o.status === "Finalizado"
    ? 0
    : Math.max(0, round(o.valorTotal - o.valorEntrada));
export const orderReceived = (o: Order) =>
  o.status === "Finalizado"
    ? o.valorTotal
    : Math.min(o.valorTotal, o.valorEntrada || 0);
export const customerMatches = (
  record: { clienteId?: string; clienteNome?: string; pessoa?: string },
  c: Customer,
) =>
  record.clienteId
    ? record.clienteId === c.id
    : [c.nome, ...(c.nomesAnteriores || [])].includes(
        (record.clienteNome ?? record.pessoa) || "",
      );
export function customerTotals(data: DataStore, c: Customer) {
  const sales = data.vendas.filter((s) => customerMatches(s, c));
  const orders = data.encomendas.filter((o) => customerMatches(o, c));
  return {
    total: round(
      sales.reduce((v, s) => v + saleTotal(s), 0) +
        orders.reduce((v, o) => v + o.valorTotal, 0),
    ),
    pending: round(
      sales
        .filter((s) => s.status === "P")
        .reduce((v, s) => v + saleTotal(s), 0) +
        orders.reduce((v, o) => v + orderRemaining(o), 0),
    ),
  };
}
export function finances(data: DataStore, period: string) {
  const sales = data.vendas.filter((s) => !period || s.data.startsWith(period));
  const orders = data.encomendas.filter(
    (o) => !period || o.dataEntrega.startsWith(period),
  );
  const expenses = data.despesas.filter(
    (e) => !period || e.data.startsWith(period),
  );
  const sold = round(
    sales.reduce((n, s) => n + saleTotal(s), 0) +
      orders.reduce((n, o) => n + o.valorTotal, 0),
  );
  const received = round(
    sales
      .filter((s) => s.status !== "P")
      .reduce((n, s) => n + saleTotal(s), 0) +
      orders.reduce((n, o) => n + orderReceived(o), 0),
  );
  const spent = round(expenses.reduce((n, e) => n + e.valor, 0));
  const pending = round(
    sales
      .filter((s) => s.status === "P")
      .reduce((n, s) => n + saleTotal(s), 0) +
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
  return {
    sales,
    orders,
    expenses,
    sold,
    received,
    spent,
    pending,
    productionCost,
    balance: round(received - spent),
    count: sales.length + orders.length,
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
