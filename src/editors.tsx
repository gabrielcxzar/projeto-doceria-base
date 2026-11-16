import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useBusiness } from "./context";
import type { EditorKind } from "./context";
import type {
  BaseUnit,
  CollectionName,
  Entity,
  Expense,
  ExpenseInvoiceItem,
  Ingredient,
  Material,
  Mutation,
  Order,
  OrderAccessory,
  OrderItem,
  Product,
  Recipe,
  RecipeItem,
  Sale,
} from "./types";
import {
  compatibleUnits,
  computeOrderTotal,
  formatStock,
  ingredientCost,
  money,
  normalizeStockQuantity,
  positive,
  priceFor,
  productCost,
  recipeCost,
  resolveExpenseSupplier,
  round,
  roundStock,
  sortByTextPtBr,
  summarizeOrderItems,
  today,
  validDate,
  validateOrder,
  validateSale,
  validateSupplierInput,
  versionOf,
} from "./domain";
import { Button, Field, Modal } from "./ui";

const titles: Record<EditorKind, string> = {
  sale: "Registrar venda",
  order: "Encomenda",
  expense: "Despesa",
  invoice: "Registrar nota fiscal",
  customer: "Cliente",
  supplier: "Fornecedor",
  product: "Produto",
  ingredient: "Ingrediente",
  material: "Material",
  recipe: "Receita",
  goal: "Meta mensal",
};
const targets: Record<EditorKind, CollectionName> = {
  sale: "vendas",
  order: "encomendas",
  expense: "despesas",
  invoice: "despesas",
  customer: "clientes",
  supplier: "fornecedores",
  product: "produtos",
  ingredient: "ingredientes",
  material: "materiais",
  recipe: "receitas",
  goal: "configuracoes",
};
const defaultValues: Record<EditorKind, Record<string, string>> = {
  sale: {
    data: today(),
    quantidade: "1",
    status: "A",
    pagamento: "PIX",
    valor: "",
  },
  order: { dataEntrega: today(), valorEntrada: "0", status: "Pendente", valorTotal: "0" },
  expense: { data: today(), tipo: "Material", quantidade: "" },
  invoice: {
    data: today(),
    tipo: "Material",
    fornecedorId: "",
    fornecedor: "",
    numeroNota: "",
    observacoes: "",
  },
  customer: {},
  supplier: {},
  ingredient: { unidadePadrao: "g" },
  material: {},
  recipe: { rendimento: "1" },
  goal: {},
  product: {
    categoria: "Doces",
    custoMaterial: "0",
    custoMaoObra: "0",
    custosInvisiveis: "0",
    margem: "100",
    tempoPreparo: "0",
    valor: "0",
  },
};

export default function Editor({
  kind,
  record,
  onClose,
}: {
  kind: EditorKind;
  record?: Entity;
  onClose: () => void;
}) {
  const { data, save, busy, canWrite } = useBusiness();
  const source = record as unknown as Record<string, unknown> | undefined;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const result = { ...defaultValues[kind] };
    if (kind === "sale" || kind === "expense" || kind === "invoice")
      result.data = today();
    if (kind === "order") result.dataEntrega = today();
    for (const [k, v] of Object.entries(source || {}))
      if (["string", "number"].includes(typeof v)) result[k] = String(v);
    if (kind === "order")
      result.clienteId = String(
        source?.clienteId ||
          data.clientes.find(
            (c) =>
              c.nome === source?.clienteNome ||
              c.nomesAnteriores?.includes(String(source?.clienteNome)),
          )?.id ||
          "",
      );
    if (kind === "sale" && record) {
      const s = record as Sale;
      result.clienteId = String(
        s.clienteId ||
          data.clientes.find(
            (c) => c.nome === s.pessoa || c.nomesAnteriores?.includes(s.pessoa),
          )?.id ||
          "",
      );
      result.produtoId = String(
        s.produtoId ||
          data.produtos.find(
            (p) => p.nome === s.produto || p.nomesAnteriores?.includes(s.produto),
          )?.id ||
          "",
      );
    }
    return result;
  });
  const [error, setError] = useState("");

  // Receita
  const [items, setItems] = useState<RecipeItem[]>(
    kind === "recipe" ? (record as Recipe)?.ingredientes || [] : [],
  );
  const [ingredientId, setIngredientId] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");

  // Produto
  const [recipes, setRecipes] = useState<string[]>(
    kind === "product"
      ? (record as Product)?.composicaoReceitas?.map((r) => r.id) || []
      : [],
  );
  const [materials, setMaterials] = useState<string[]>(
    kind === "product"
      ? (record as Product)?.materiaisUtilizados?.map((m) => m.id) || []
      : [],
  );
  const [priceMode, setPriceMode] = useState<"manual" | "automatic">("manual");

  // Venda: Salvar e continuar
  const [salePedidoId] = useState(() =>
    kind === "sale" && record && (record as Sale).pedidoId
      ? (record as Sale).pedidoId!
      : crypto.randomUUID(),
  );
  const [saleSessionItems, setSaleSessionItems] = useState<
    { id: string; produto: string; quantidade: number; valor: number; subtotal: number }[]
  >([]);

  // Encomenda estruturada + acessórios
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    kind === "order" ? (record as Order)?.itens || [] : [],
  );
  const [orderAccessories, setOrderAccessories] = useState<OrderAccessory[]>(
    kind === "order" ? (record as Order)?.acessorios || [] : [],
  );
  const [orderProdId, setOrderProdId] = useState("");
  const [orderProdQty, setOrderProdQty] = useState("1");
  const [orderProdPrice, setOrderProdPrice] = useState("");
  const [accSourceType, setAccSourceType] = useState<"material" | "manual">("material");
  const [accMatId, setAccMatId] = useState("");
  const [accDesc, setAccDesc] = useState("");
  const [accCharged, setAccCharged] = useState<"charged" | "internal">("charged");
  const [accQty, setAccQty] = useState("1");
  const [accPrice, setAccPrice] = useState("0");

  // Despesa simples com entrada opcional no estoque
  const [expAddStock, setExpAddStock] = useState(false);
  const [expStockType, setExpStockType] = useState<"ingrediente" | "material">("ingrediente");
  const [expStockId, setExpStockId] = useState("");
  const [expStockQty, setExpStockQty] = useState("");
  const [expStockUnit, setExpStockUnit] = useState("g");

  // Nota fiscal multi-item
  const [invoiceItems, setInvoiceItems] = useState<ExpenseInvoiceItem[]>(
    kind === "invoice" ? (record as Expense)?.itensNota || [] : [],
  );
  const [invType, setInvType] = useState<"ingrediente" | "material" | "outro">("ingrediente");
  const [invSearch, setInvSearch] = useState("");
  const [invItemId, setInvItemId] = useState("");
  const [invCustomName, setInvCustomName] = useState("");
  const [invQuickQty, setInvQuickQty] = useState<"1" | "2" | "3" | "other">("1");
  const [invQty, setInvQty] = useState("1");
  const [invUnit, setInvUnit] = useState("g");
  const [invUnitPrice, setInvUnitPrice] = useState("");
  const [supSearch, setSupSearch] = useState("");
  const [quickSupOpen, setQuickSupOpen] = useState(false);
  const [quickSupName, setQuickSupName] = useState("");
  const [quickSupFantasy, setQuickSupFantasy] = useState("");
  const [quickSupDoc, setQuickSupDoc] = useState("");
  const [quickSupPhone, setQuickSupPhone] = useState("");

  const sortedCustomers = sortByTextPtBr(data.clientes, (c) => c.nome, (c) => c.id);
  const sortedSuppliers = sortByTextPtBr(data.fornecedores || [], (s) => s.nome, (s) => s.id);
  const sortedProducts = sortByTextPtBr(data.produtos, (p) => p.nome, (p) => p.id);
  const sortedIngredients = sortByTextPtBr(data.ingredientes, (i) => i.nome, (i) => i.id);
  const sortedMaterials = sortByTextPtBr(data.materiais, (m) => m.nome, (m) => m.id);
  const sortedRecipes = sortByTextPtBr(data.receitas, (r) => r.titulo, (r) => r.id);

  const liveItems = items.map((item) => {
    const ingredient = data.ingredientes.find((i) => i.id === item.ingredienteId);
    try {
      return {
        ...item,
        custo: ingredient
          ? ingredientCost(item.quantidade, item.unidadeUso, ingredient)
          : item.custo,
      };
    } catch {
      return item;
    }
  });
  const set = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));
  const v = (name: string) => values[name] ?? "";
  const n = (name: string, label: string, zero = false) =>
    positive(v(name), label, zero);

  const field = (
    name: string,
    label: string,
    type = "text",
    options?: string[] | { value: string; label: string }[],
    hint?: string,
    required = true,
  ) => (
    <Field key={name} label={label} hint={hint}>
      {options ? (
        <select
          value={v(name)}
          required={required}
          onChange={(e) => {
            set(name, e.target.value);
            if (kind === "sale" && name === "produtoId")
              set(
                "valor",
                String(
                  data.produtos.find((p) => p.id === e.target.value)?.valor ?? "",
                ),
              );
          }}
        >
          <option value="">Selecione…</option>
          {options.map((option) =>
            typeof option === "string" ? (
              <option key={option}>{option}</option>
            ) : (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ),
          )}
        </select>
      ) : (
        <input
          type={type}
          value={v(name)}
          onChange={(e) => set(name, e.target.value)}
          required={required}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? "any" : undefined}
          maxLength={type === "text" ? 500 : undefined}
        />
      )}
    </Field>
  );

  const customerOptions = sortedCustomers
    .filter((c) => !c.arquivado || c.id === v("clienteId"))
    .map((c) => ({ value: c.id, label: c.nome }));
  const productOptions = sortedProducts
    .filter((p) => !p.arquivado || p.id === v("produtoId"))
    .map((p) => ({ value: p.id, label: p.nome }));

  const baseCost =
    recipes.length || materials.length
      ? round(
          recipes.reduce(
            (sum, id) =>
              sum + (data.receitas.find((r) => r.id === id)?.custoPorUnidade || 0),
            0,
          ) +
            materials.reduce(
              (sum, id) =>
                sum + (data.materiais.find((m) => m.id === id)?.custo || 0),
              0,
            ),
        )
      : Number(v("custoMaterial")) || 0;
  const cost = productCost({
    custoMaterial: baseCost,
    custoMaoObra: Number(v("custoMaoObra")),
    custosInvisiveis: Number(v("custosInvisiveis")),
  });
  const finalPrice =
    priceMode === "automatic"
      ? priceFor(cost, Number(v("margem")) || 0)
      : Number(v("valor")) || 0;

  const orderHasStructured = orderItems.length > 0 || orderAccessories.length > 0;
  const orderCalculatedTotal = orderHasStructured
    ? computeOrderTotal(orderItems, orderAccessories)
    : Number(v("valorTotal")) || 0;

  const nameUnique = (
    name: string,
    list: { id: string; nome: string; nomesAnteriores?: string[] }[],
  ) => {
    if (!name) throw new Error("Informe um nome.");
    if (
      list.some(
        (i) =>
          i.id !== record?.id &&
          [i.nome, ...(i.nomesAnteriores || [])].some(
            (x) => x.toUpperCase() === name.toUpperCase(),
          ),
      )
    )
      throw new Error("Já existe um cadastro com esse nome.");
  };

  function addOrderProduct() {
    try {
      const prod = data.produtos.find((p) => p.id === orderProdId);
      if (!prod) throw new Error("Selecione um produto cadastrado.");
      const qty = positive(orderProdQty, "Quantidade do produto");
      if (!Number.isInteger(qty))
        throw new Error("Quantidade do produto deve ser inteira.");
      const unitPrice = positive(orderProdPrice, "Preço unitário");
      setOrderItems([
        ...orderItems,
        {
          produtoId: prod.id,
          produtoNome: prod.nome,
          quantidade: qty,
          valorUnitario: round(unitPrice),
          valorCadastro: prod.valor,
          subtotal: round(qty * unitPrice),
          custoUnitario: productCost(prod),
        },
      ]);
      setOrderProdId("");
      setOrderProdQty("1");
      setOrderProdPrice("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function addOrderAccessory() {
    try {
      const mat =
        accSourceType === "material"
          ? data.materiais.find((m) => m.id === accMatId)
          : undefined;
      const desc =
        accSourceType === "material" ? mat?.nome || "" : accDesc.trim();
      if (!desc) throw new Error("Selecione um material ou informe o acessório.");
      const qty = positive(accQty, "Quantidade do acessório");
      const charged = accCharged === "charged";
      const unitPrice = positive(
        accPrice || "0",
        charged ? "Valor cobrado" : "Custo interno",
        !charged,
      );
      setOrderAccessories([
        ...orderAccessories,
        {
          ...(mat ? { materialId: mat.id } : {}),
          descricao: desc,
          quantidade: qty,
          unidade: "unidade",
          cobradoCliente: charged,
          valorUnitario: round(unitPrice),
          subtotal: round(qty * unitPrice),
        },
      ]);
      setAccMatId("");
      setAccDesc("");
      setAccQty("1");
      setAccPrice("0");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function addInvoiceItem() {
    try {
      const qty = positive(invQty, "Quantidade");
      const unitPrice = positive(invUnitPrice, "Valor unitário");
      if (invType === "outro") {
        const name = invCustomName.trim();
        if (!name) throw new Error("Informe a descrição do item.");
        setInvoiceItems([
          ...invoiceItems,
          {
            id: crypto.randomUUID(),
            itemTipo: "outro",
            itemNome: name,
            quantidade: qty,
            unidade: invUnit.trim() || "unidade",
            valorUnitario: round(unitPrice),
            subtotal: round(qty * unitPrice),
            geraEstoque: false,
          },
        ]);
      } else {
        const item =
          invType === "ingrediente"
            ? data.ingredientes.find((i) => i.id === invItemId)
            : data.materiais.find((m) => m.id === invItemId);
        if (!item) throw new Error("Selecione um item cadastrado.");
        const expectedBase: BaseUnit =
          invType === "ingrediente"
            ? ((item as Ingredient).unidadePadrao as BaseUnit)
            : "unidade";
        const { quantidadePadrao, unidadePadrao } = normalizeStockQuantity(
          qty,
          invUnit,
          expectedBase,
        );
        setInvoiceItems([
          ...invoiceItems,
          {
            id: crypto.randomUUID(),
            itemTipo: invType,
            itemId: item.id,
            itemNome: item.nome,
            quantidade: qty,
            unidade: invUnit,
            quantidadePadrao,
            unidadePadrao,
            valorUnitario: round(unitPrice),
            subtotal: round(qty * unitPrice),
            geraEstoque: true,
          },
        ]);
      }
      setInvItemId("");
      setInvCustomName("");
      setInvQuickQty("1");
      setInvQty("1");
      setInvUnitPrice("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveSaleItem(continueAdding: boolean) {
    setError("");
    try {
      if (!canWrite)
        throw new Error(
          "Seu perfil permite somente consulta ou a conexão está indisponível.",
        );
      if (!continueAdding && saleSessionItems.length > 0 && !v("produtoId")) {
        onClose();
        return;
      }
      const customer = data.clientes.find((c) => c.id === v("clienteId"));
      const product = data.produtos.find((p) => p.id === v("produtoId"));
      if (!customer || !product)
        throw new Error("Selecione cliente e produto cadastrados.");

      const existingSale = record as Sale | undefined;
      const qty = n("quantidade", "Quantidade");
      const price = n("valor", "Preço");
      const status = v("status") as "P" | "A" | "E";
      const total = round(qty * price);
      const prevPaid = existingSale?.valorPago;
      const nextPaid =
        status !== "P"
          ? total
          : prevPaid !== undefined
            ? Math.min(total, prevPaid)
            : 0;

      const salePayload: Omit<Sale, "id"> = {
        data: v("data"),
        pessoa: customer.nome,
        clienteId: customer.id,
        produto: product.nome,
        produtoId: product.id,
        quantidade: qty,
        valor: round(price),
        custoUnitario: existingSale?.custoUnitario ?? productCost(product),
        pagamento: v("pagamento"),
        status,
        pedidoId: existingSale ? existingSale.pedidoId : salePedidoId,
        ...(nextPaid > 0 || existingSale?.valorPago !== undefined
          ? { valorPago: nextPaid }
          : {}),
      };
      validateSale(salePayload);

      const newId = existingSale?.id || crypto.randomUUID();
      const mutations: Mutation[] = [
        {
          collection: "vendas",
          id: newId,
          createOnly: !existingSale,
          expectedUpdatedAt: existingSale ? versionOf(existingSale) : undefined,
          data: salePayload as unknown as Record<string, unknown>,
        },
      ];
      if (!existingSale && status !== "P") {
        mutations.push({
          collection: "recebimentos",
          id: `venda_${newId}`,
          createOnly: true,
          data: {
            data: salePayload.data,
            valor: total,
            origemTipo: "venda",
            origemId: newId,
            vendaIds: [newId],
            clienteId: customer.id,
            clienteNome: customer.nome,
            descricao: `${qty} × ${product.nome}`,
            pagamento: salePayload.pagamento,
            tipoBaixa: "venda_avista",
          },
        });
      }

      await save(
        mutations,
        `${existingSale ? "Atualização" : "Cadastro"}: venda (${customer.nome} · ${product.nome})`,
      );

      if (continueAdding) {
        setSaleSessionItems((prev) => [
          ...prev,
          {
            id: newId,
            produto: product.nome,
            quantidade: qty,
            valor: round(price),
            subtotal: total,
          },
        ]);
        setValues((prev) => ({
          ...prev,
          produtoId: "",
          quantidade: "1",
          valor: "",
        }));
      } else {
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (kind === "sale") {
      await saveSaleItem(false);
      return;
    }
    setError("");
    try {
      if (!canWrite)
        throw new Error(
          "Seu perfil permite somente consulta ou a conexão está indisponível.",
        );

      const extraMutations: Mutation[] = [];
      let mainId = record?.id;
      let createOnly = false;
      let payload: Record<string, unknown> = {};

      if (kind === "order") {
        const customer = data.clientes.find((c) => c.id === v("clienteId"));
        if (!customer) throw new Error("Selecione um cliente cadastrado.");
        const existingOrder = record as Order | undefined;
        const hasItems = orderItems.length > 0 || orderAccessories.length > 0;
        const computedTotal = hasItems
          ? computeOrderTotal(orderItems, orderAccessories)
          : n("valorTotal", "Total");
        const desc = hasItems
          ? summarizeOrderItems(orderItems, orderAccessories, v("observacoes"))
          : v("produtoDescricao").trim();
        if (!desc)
          throw new Error(
            "Adicione pelo menos um produto cadastrado à encomenda.",
          );
        const entrada = n("valorEntrada", "Valor já recebido", true);
        const orderObj: Omit<Order, "id"> = {
          clienteNome: customer.nome,
          clienteId: customer.id,
          produtoDescricao: desc,
          ...(orderItems.length ? { itens: orderItems } : {}),
          ...(orderAccessories.length ? { acessorios: orderAccessories } : {}),
          ...(v("observacoes").trim() ? { observacoes: v("observacoes").trim() } : {}),
          dataEntrega: v("dataEntrega"),
          valorTotal: round(computedTotal),
          valorEntrada: round(entrada),
          status: v("status") as Order["status"],
        };
        validateOrder(orderObj);
        if (
          orderObj.status === "Finalizado" &&
          orderObj.valorEntrada !== orderObj.valorTotal
        )
          throw new Error(
            "Para finalizar, confirme o recebimento total preenchendo o valor já recebido igual ao total.",
          );
        if (!existingOrder) {
          mainId = crypto.randomUUID();
          createOnly = true;
          if (orderObj.valorEntrada > 0) {
            extraMutations.push({
              collection: "recebimentos",
              id: `enc_ent_${mainId}`,
              createOnly: true,
              data: {
                data: today(),
                valor: orderObj.valorEntrada,
                origemTipo: "encomenda",
                origemId: mainId,
                clienteId: customer.id,
                clienteNome: customer.nome,
                descricao: desc.slice(0, 900),
                pagamento: "PIX",
                tipoBaixa: "entrada_encomenda",
              },
            });
          }
        } else {
          const diff = round(orderObj.valorEntrada - (existingOrder.valorEntrada || 0));
          if (diff > 0) {
            extraMutations.push({
              collection: "recebimentos",
              data: {
                data: today(),
                valor: diff,
                origemTipo: "encomenda",
                origemId: existingOrder.id,
                clienteId: customer.id,
                clienteNome: customer.nome,
                descricao: desc.slice(0, 900),
                pagamento: "PIX",
                tipoBaixa:
                  orderObj.valorEntrada >= orderObj.valorTotal
                    ? "integral"
                    : "parcial",
              },
            });
          }
        }
        payload = orderObj as unknown as Record<string, unknown>;
      } else if (kind === "expense") {
        if (!validDate(v("data"))) throw new Error("Informe uma data válida.");
        if (!v("descricao").trim()) throw new Error("Informe a descrição.");
        const existingExp = record as Expense | undefined;
        const expVal = n("valor", "Total da despesa");
        const expData: Record<string, unknown> = {
          data: v("data"),
          tipo: v("tipo"),
          descricao: v("descricao").trim(),
          quantidade: v("quantidade"),
          valor: round(expVal),
        };
        if (existingExp?.isNotaFiscal) {
          expData.isNotaFiscal = true;
          if (existingExp.fornecedor) expData.fornecedor = v("fornecedor").trim();
          if (existingExp.numeroNota) expData.numeroNota = v("numeroNota").trim();
          if (existingExp.observacoes !== undefined)
            expData.observacoes = v("observacoes").trim();
        }
        if (!existingExp && expAddStock) {
          const target =
            expStockType === "ingrediente"
              ? data.ingredientes.find((i) => i.id === expStockId)
              : data.materiais.find((m) => m.id === expStockId);
          if (!target)
            throw new Error("Selecione o ingrediente ou material para o estoque.");
          const q = positive(expStockQty, "Quantidade de entrada no estoque");
          const expectedBase: BaseUnit =
            expStockType === "ingrediente"
              ? ((target as Ingredient).unidadePadrao as BaseUnit)
              : "unidade";
          const { quantidadePadrao, unidadePadrao } = normalizeStockQuantity(
            q,
            expStockUnit,
            expectedBase,
          );
          mainId = crypto.randomUUID();
          createOnly = true;
          const movId = `desp_${mainId}`;
          const prevBal = target.estoqueAtual ?? 0;
          const nextBal = roundStock(prevBal + quantidadePadrao);
          expData.entradaEstoque = {
            itemTipo: expStockType,
            itemId: target.id,
            itemNome: target.nome,
            quantidade: q,
            unidade: expStockUnit,
            quantidadePadrao,
            unidadePadrao,
            movimentoId: movId,
          };
          extraMutations.push({
            collection: expStockType === "ingrediente" ? "ingredientes" : "materiais",
            id: target.id,
            expectedUpdatedAt: versionOf(target),
            data: { estoqueAtual: nextBal, estoqueIniciado: true },
          });
          extraMutations.push({
            collection: "movimentacoes_estoque",
            id: movId,
            createOnly: true,
            data: {
              data: v("data"),
              itemTipo: expStockType,
              itemId: target.id,
              itemNome: target.nome,
              tipo: "entrada",
              direcao: "entrada",
              quantidade: q,
              unidade: expStockUnit,
              quantidadePadrao,
              deltaPadrao: quantidadePadrao,
              unidadePadrao,
              saldoAnterior: target.estoqueIniciado ? prevBal : null,
              saldoPosterior: nextBal,
              motivo: `Compra em despesa: ${v("descricao").trim()}`,
              origemTipo: "despesa",
              origemId: mainId,
              custoUnitario: round(expVal / q),
            },
          });
        }
        payload = expData;
      } else if (kind === "invoice") {
        if (!validDate(v("data"))) throw new Error("Informe uma data válida.");
        const existingInvoice = record as Expense | undefined;
        const selectedSupId = v("fornecedorId").trim();
        const chosenSupplier = selectedSupId
          ? (data.fornecedores || []).find((s) => s.id === selectedSupId)
          : undefined;
        if (selectedSupId && !chosenSupplier) {
          throw new Error("Fornecedor selecionado não encontrado.");
        }
        if (!existingInvoice && !chosenSupplier) {
          throw new Error("Selecione um fornecedor cadastrado para a nota fiscal.");
        }
        if (!existingInvoice && chosenSupplier?.arquivado) {
          throw new Error("O fornecedor selecionado está arquivado. Selecione um fornecedor ativo.");
        }

        const numeroNota = v("numeroNota").trim();
        const observacoes = v("observacoes").trim();

        if (existingInvoice) {
          const itemsForEdit = existingInvoice.itensNota || invoiceItems;
          const keptSameSupplier =
            chosenSupplier && existingInvoice.fornecedorId === chosenSupplier.id;
          const legacyInfo = resolveExpenseSupplier(
            existingInvoice,
            data.fornecedores || [],
          );
          const resolvedName = keptSameSupplier
            ? legacyInfo.snapshotName || chosenSupplier.nome
            : chosenSupplier
              ? chosenSupplier.nome
              : (existingInvoice.fornecedor || "").trim();
          const itemCount = itemsForEdit.length;
          const headerDescParts = [
            numeroNota ? `NF ${numeroNota}` : "Nota fiscal",
            resolvedName || undefined,
            itemCount > 0
              ? `(${itemCount} ${itemCount === 1 ? "item" : "itens"})`
              : undefined,
          ].filter(Boolean);

          payload = {
            data: v("data"),
            tipo: v("tipo"),
            descricao: headerDescParts.join(" · "),
            quantidade:
              itemCount > 0
                ? `${itemCount} ${itemCount === 1 ? "item" : "itens"}`
                : existingInvoice.quantidade || "",
            valor: existingInvoice.valor,
            isNotaFiscal: true,
            ...(chosenSupplier
              ? {
                  fornecedorId: chosenSupplier.id,
                  fornecedorNome: resolvedName,
                  fornecedor: resolvedName,
                }
              : resolvedName
                ? { fornecedor: resolvedName }
                : {}),
            numeroNota,
            observacoes,
            ...(itemsForEdit.length > 0 ? { itensNota: itemsForEdit } : {}),
          };
        } else {
          if (!invoiceItems.length)
            throw new Error("Adicione pelo menos um item à nota fiscal.");
          const totalNota = round(
            invoiceItems.reduce((sum, item) => sum + item.subtotal, 0),
          );
          if (totalNota <= 0)
            throw new Error("O total da nota fiscal deve ser maior que zero.");

          mainId = crypto.randomUUID();
          createOnly = true;
          const fornecedor = chosenSupplier!.nome;
          const headerDescParts = [
            numeroNota ? `NF ${numeroNota}` : "Nota fiscal",
            fornecedor,
            `(${invoiceItems.length} ${invoiceItems.length === 1 ? "item" : "itens"})`,
          ].filter(Boolean);

          payload = {
            data: v("data"),
            tipo: v("tipo"),
            descricao: headerDescParts.join(" · "),
            quantidade: `${invoiceItems.length} ${invoiceItems.length === 1 ? "item" : "itens"}`,
            valor: totalNota,
            isNotaFiscal: true,
            fornecedorId: chosenSupplier!.id,
            fornecedorNome: fornecedor,
            fornecedor,
            ...(numeroNota ? { numeroNota } : {}),
            ...(observacoes ? { observacoes } : {}),
            itensNota: invoiceItems,
          };

          // Agrupa movimentações de estoque por item para atualizar cada documento uma única vez na transação.
          const runningBalances = new Map<
            string,
            {
              collection: "ingredientes" | "materiais";
              record: Ingredient | Material;
              balance: number;
              hadInit: boolean;
            }
          >();

          for (const item of invoiceItems) {
            if (!item.geraEstoque || !item.itemId || !item.quantidadePadrao || !item.unidadePadrao)
              continue;
            const mapKey = `${item.itemTipo}:${item.itemId}`;
            let state = runningBalances.get(mapKey);
            if (!state) {
              const target =
                item.itemTipo === "ingrediente"
                  ? data.ingredientes.find((i) => i.id === item.itemId)
                  : data.materiais.find((m) => m.id === item.itemId);
              if (!target)
                throw new Error(`Item "${item.itemNome}" não encontrado no cadastro.`);
              state = {
                collection: item.itemTipo === "ingrediente" ? "ingredientes" : "materiais",
                record: target,
                balance: target.estoqueAtual ?? 0,
                hadInit: !!target.estoqueIniciado,
              };
              runningBalances.set(mapKey, state);
            }
            const prevBal = state.balance;
            const nextBal = roundStock(prevBal + item.quantidadePadrao);
            state.balance = nextBal;

            extraMutations.push({
              collection: "movimentacoes_estoque",
              id: `nf_${mainId}_${item.id}`,
              createOnly: true,
              data: {
                data: v("data"),
                itemTipo: item.itemTipo,
                itemId: item.itemId,
                itemNome: item.itemNome,
                tipo: "entrada",
                direcao: "entrada",
                quantidade: item.quantidade,
                unidade: item.unidade,
                quantidadePadrao: item.quantidadePadrao,
                deltaPadrao: item.quantidadePadrao,
                unidadePadrao: item.unidadePadrao,
                saldoAnterior: state.hadInit ? prevBal : null,
                saldoPosterior: nextBal,
                motivo: `Nota fiscal${numeroNota ? ` #${numeroNota}` : ""} · ${fornecedor}`,
                origemTipo: "nota_fiscal",
                origemId: mainId,
                origemItemId: item.id,
                custoUnitario: item.valorUnitario,
              },
            });
            state.hadInit = true;
          }

          for (const state of runningBalances.values()) {
            extraMutations.push({
              collection: state.collection,
              id: state.record.id,
              expectedUpdatedAt: versionOf(state.record),
              data: {
                estoqueAtual: state.balance,
                estoqueIniciado: true,
              },
            });
          }
        }
      } else if (kind === "supplier") {
        const clean = validateSupplierInput({
          nome: v("nome"),
          nomeFantasia: v("nomeFantasia"),
          documento: v("documento"),
          contato: v("contato"),
          email: v("email"),
          endereco: v("endereco"),
          observacoes: v("observacoes"),
        });
        nameUnique(clean.nome, data.fornecedores || []);
        const previous =
          source?.nome && source.nome !== clean.nome ? [String(source.nome)] : [];
        payload = {
          ...clean,
          nomesAnteriores: [
            ...new Set([
              ...((source?.nomesAnteriores as string[]) || []),
              ...previous,
            ]),
          ],
        };
      } else if (kind === "customer") {
        const nome = v("nome").trim().toUpperCase();
        nameUnique(nome, data.clientes);
        const previous =
          source?.nome && source.nome !== nome ? [String(source.nome)] : [];
        payload = {
          nome,
          contato: v("contato").trim(),
          email: v("email").trim().toLowerCase(),
          endereco: v("endereco").trim(),
          observacoes: v("observacoes").trim(),
          nomesAnteriores: [
            ...new Set([
              ...((source?.nomesAnteriores as string[]) || []),
              ...previous,
            ]),
          ],
        };
      } else if (kind === "ingredient") {
        const nome = v("nome").trim();
        nameUnique(nome, data.ingredientes);
        const precoCompra = n("precoCompra", "Preço da compra");
        const tamanhoCompra = n("tamanhoCompra", "Quantidade da compra");
        if (
          record &&
          source?.unidadePadrao !== v("unidadePadrao") &&
          data.receitas.some((r) =>
            r.ingredientes.some((i) => i.ingredienteId === record.id),
          )
        )
          throw new Error(
            "Este ingrediente está em receitas. Preserve a unidade padrão ou cadastre outro ingrediente.",
          );
        const minStockRaw = v("estoqueMinimo").trim();
        payload = {
          nome,
          unidadeCompra: v("unidadeCompra").trim(),
          precoCompra,
          tamanhoCompra,
          unidadePadrao: v("unidadePadrao"),
          custoUnitarioPadrao: precoCompra / tamanhoCompra,
          ...(minStockRaw !== ""
            ? { estoqueMinimo: positive(minStockRaw, "Estoque mínimo", true) }
            : {}),
        };
      } else if (kind === "material") {
        const nome = v("nome").trim();
        nameUnique(nome, data.materiais);
        const minStockRaw = v("estoqueMinimo").trim();
        payload = {
          nome,
          custo: n("custo", "Custo", true),
          ...(minStockRaw !== ""
            ? { estoqueMinimo: positive(minStockRaw, "Estoque mínimo", true) }
            : {}),
        };
      } else if (kind === "recipe") {
        if (!v("titulo").trim()) throw new Error("Informe o título.");
        if (
          data.receitas.some(
            (r) =>
              r.id !== record?.id &&
              r.titulo.toLowerCase() === v("titulo").trim().toLowerCase(),
          )
        )
          throw new Error("Já existe uma receita com esse título.");
        if (!items.length)
          throw new Error("Adicione pelo menos um ingrediente.");
        const currentItems = items.map((item) => {
          const ingredient = data.ingredientes.find(
            (i) => i.id === item.ingredienteId,
          );
          if (!ingredient)
            throw new Error("Um ingrediente não está mais cadastrado.");
          return {
            ...item,
            custo: ingredientCost(item.quantidade, item.unidadeUso, ingredient),
          };
        });
        const recipe = {
          ingredientes: currentItems,
          rendimento: n("rendimento", "Rendimento"),
        };
        payload = {
          titulo: v("titulo").trim(),
          ...recipe,
          ...recipeCost(recipe),
        };
      } else if (kind === "product") {
        const nome = v("nome").trim().toUpperCase();
        nameUnique(nome, data.produtos);
        n("custoMaoObra", "Mão de obra", true);
        n("custosInvisiveis", "Custos indiretos", true);
        n("tempoPreparo", "Tempo de preparo", true);
        if (!recipes.length && !materials.length)
          n("custoMaterial", "Custo base", true);
        if (priceMode === "automatic")
          n("margem", "Acréscimo sobre custo", true);
        positive(finalPrice, "Preço de venda");
        const previous =
          source?.nome && source.nome !== nome ? [String(source.nome)] : [];
        payload = {
          nome,
          categoria: v("categoria"),
          custoMaterial: baseCost,
          custoMaoObra: Number(v("custoMaoObra")),
          custosInvisiveis: Number(v("custosInvisiveis")),
          tempoPreparo: Number(v("tempoPreparo")),
          margem:
            priceMode === "automatic"
              ? Number(v("margem"))
              : cost > 0
                ? round((finalPrice / cost - 1) * 100)
                : 0,
          valor: round(finalPrice),
          composicaoReceitas: recipes.map((id) => {
            const r = data.receitas.find((r) => r.id === id)!;
            return { id, titulo: r.titulo };
          }),
          materiaisUtilizados: materials.map((id) => {
            const m = data.materiais.find((m) => m.id === id)!;
            return { id, nome: m.nome };
          }),
          nomesAnteriores: [
            ...new Set([
              ...((source?.nomesAnteriores as string[]) || []),
              ...previous,
            ]),
          ],
        };
      } else if (kind === "goal") {
        payload = { metaMensal: n("metaMensal", "Meta", true) };
      }

      await save(
        [
          {
            collection: targets[kind],
            id: mainId,
            createOnly,
            expectedUpdatedAt: record ? versionOf(record) : undefined,
            data: payload,
          },
          ...extraMutations,
        ],
        `${record ? "Atualização" : "Cadastro"}: ${titles[kind].toLowerCase()}`,
      );
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    }
  }

  const supplierOptions = sortedSuppliers
    .filter((s) => !s.arquivado || s.id === v("fornecedorId"))
    .filter((s) => {
      if (s.id === v("fornecedorId")) return true;
      const q = supSearch.trim().toLocaleLowerCase("pt-BR");
      if (!q) return true;
      return `${s.nome} ${s.nomeFantasia || ""} ${s.documento || ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(q);
    });

  async function saveQuickSupplier() {
    setError("");
    try {
      if (!canWrite)
        throw new Error(
          "Seu perfil permite somente consulta ou a conexão está indisponível.",
        );
      const clean = validateSupplierInput({
        nome: quickSupName,
        nomeFantasia: quickSupFantasy,
        documento: quickSupDoc,
        contato: quickSupPhone,
      });
      nameUnique(clean.nome, data.fornecedores || []);
      const newId = crypto.randomUUID();
      await save(
        [
          {
            collection: "fornecedores",
            id: newId,
            createOnly: true,
            data: { ...clean, nomesAnteriores: [] },
          },
        ],
        `Cadastro rápido de fornecedor: ${clean.nome}`,
      );
      set("fornecedorId", newId);
      setQuickSupOpen(false);
      setQuickSupName("");
      setQuickSupFantasy("");
      setQuickSupDoc("");
      setQuickSupPhone("");
      setSupSearch("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível cadastrar o fornecedor.",
      );
    }
  }

  function addIngredient() {
    try {
      const ingredient = data.ingredientes.find((i) => i.id === ingredientId);
      if (!ingredient) throw new Error("Selecione um ingrediente.");
      const quantity = positive(amount, "Quantidade");
      setItems([
        ...items,
        {
          ingredienteId: ingredient.id,
          quantidade: quantity,
          unidadeUso: unit,
          custo: ingredientCost(quantity, unit, ingredient),
        },
      ]);
      setAmount("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const invFilteredOptions = (
    invType === "ingrediente"
      ? sortedIngredients.filter((i) => !i.arquivado)
      : sortedMaterials.filter((m) => !m.arquivado)
  ).filter((item) =>
    !invSearch.trim() ||
    item.nome.toLocaleLowerCase("pt-BR").includes(invSearch.toLocaleLowerCase("pt-BR")),
  );
  const selectedInvIngredient =
    invType === "ingrediente"
      ? data.ingredientes.find((i) => i.id === invItemId)
      : undefined;
  const invAvailableUnits =
    invType === "ingrediente" && selectedInvIngredient
      ? compatibleUnits(selectedInvIngredient.unidadePadrao as BaseUnit)
      : invType === "material"
        ? (["unidade"] as const)
        : (["unidade", "kg", "g", "l", "ml"] as const);

  const selectedExpTarget =
    expStockType === "ingrediente"
      ? data.ingredientes.find((i) => i.id === expStockId)
      : data.materiais.find((m) => m.id === expStockId);
  const expAvailableUnits =
    expStockType === "ingrediente" && selectedExpTarget
      ? compatibleUnits((selectedExpTarget as Ingredient).unidadePadrao as BaseUnit)
      : (["unidade"] as const);

  return (
    <Modal
      title={`${record ? "Editar " : ""}${titles[kind]}`}
      subtitle={
        kind === "sale"
          ? "Registre um ou mais produtos para a mesma compra."
          : kind === "invoice"
            ? "Cadastre os itens da nota em um único lançamento financeiro."
            : undefined
      }
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset
          disabled={busy || !canWrite}
          className={`form-grid form-${kind}`}
        >
          {kind === "sale" && (
            <>
              {field("clienteId", "Cliente", "text", customerOptions)}
              {field("data", "Data da venda", "date")}
              {field("produtoId", "Produto", "text", productOptions, undefined, saleSessionItems.length === 0)}
              {field("quantidade", "Quantidade", "number", undefined, undefined, saleSessionItems.length === 0 || !!v("produtoId"))}
              {field("valor", "Preço unitário (R$)", "number", undefined, undefined, saleSessionItems.length === 0 || !!v("produtoId"))}
              {field("pagamento", "Pagamento", "text", [
                "PIX",
                "Dinheiro",
                "Cartão",
                "Transferência",
              ])}
              {field("status", "Situação", "text", [
                { value: "A", label: "Pago" },
                { value: "P", label: "Pendente" },
                { value: "E", label: "Entregue e pago" },
              ])}
              <div className="form-summary">
                <span>Total deste item</span>
                <strong>
                  {money(
                    (Number(v("quantidade")) || 0) * (Number(v("valor")) || 0),
                  )}
                </strong>
              </div>
              {saleSessionItems.length > 0 && (
                <div className="span-2 session-box">
                  <h3>Itens já salvos nesta compra ({saleSessionItems.length})</h3>
                  <ul className="composition-list">
                    {saleSessionItems.map((it) => (
                      <li key={it.id}>
                        <span>
                          {it.quantidade} × {it.produto}
                          <small>{money(it.valor)} un.</small>
                        </span>
                        <strong>{money(it.subtotal)}</strong>
                      </li>
                    ))}
                  </ul>
                  <p className="form-note">
                    Total acumulado salvo:{" "}
                    <strong>
                      {money(saleSessionItems.reduce((s, i) => s + i.subtotal, 0))}
                    </strong>
                    . Os itens já confirmados permanecem registrados mesmo se você cancelar este próximo item.
                  </p>
                </div>
              )}
            </>
          )}
          {kind === "order" && (
            <>
              {field("clienteId", "Cliente", "text", customerOptions)}
              {field("dataEntrega", "Entrega", "date")}
              <div className="span-2 ingredient-builder">
                <h3>Produtos da encomenda</h3>
                <div className="order-item-add">
                  <Field label="Produto cadastrado">
                    <select
                      value={orderProdId}
                      onChange={(e) => {
                        setOrderProdId(e.target.value);
                        const prod = data.produtos.find((p) => p.id === e.target.value);
                        if (prod) setOrderProdPrice(String(prod.valor));
                      }}
                    >
                      <option value="">Selecione…</option>
                      {sortedProducts
                        .filter((p) => !p.arquivado)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} · {money(p.valor)}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Quantidade">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={orderProdQty}
                      onChange={(e) => setOrderProdQty(e.target.value)}
                    />
                  </Field>
                  <Field label="Preço unitário (R$)">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={orderProdPrice}
                      onChange={(e) => setOrderProdPrice(e.target.value)}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addOrderProduct}
                  >
                    <Plus size={17} /> Adicionar produto
                  </Button>
                </div>
                {orderItems.length > 0 && (
                  <ul className="composition-list">
                    {orderItems.map((item, idx) => (
                      <li key={`${item.produtoId}-${idx}`}>
                        <span>
                          <strong>{item.produtoNome}</strong>
                          <small>
                            {item.quantidade} × {money(item.valorUnitario)}
                            {item.valorCadastro !== undefined &&
                            item.valorCadastro !== item.valorUnitario
                              ? ` (cadastro: ${money(item.valorCadastro)})`
                              : ""}
                          </small>
                        </span>
                        <div className="inline-edit-controls">
                          <input
                            aria-label={`Quantidade de ${item.produtoNome}`}
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantidade}
                            onChange={(e) => {
                              const q = Math.max(1, Number(e.target.value) || 1);
                              setOrderItems(
                                orderItems.map((it, i) =>
                                  i === idx
                                    ? { ...it, quantidade: q, subtotal: round(q * it.valorUnitario) }
                                    : it,
                                ),
                              );
                            }}
                          />
                          <input
                            aria-label={`Preço unitário de ${item.produtoNome}`}
                            type="number"
                            min="0"
                            step="any"
                            value={item.valorUnitario}
                            onChange={(e) => {
                              const p = Math.max(0, Number(e.target.value) || 0);
                              setOrderItems(
                                orderItems.map((it, i) =>
                                  i === idx
                                    ? { ...it, valorUnitario: p, subtotal: round(it.quantidade * p) }
                                    : it,
                                ),
                              );
                            }}
                          />
                        </div>
                        <span>{money(item.subtotal)}</span>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remover produto ${item.produtoNome}`}
                          onClick={() =>
                            setOrderItems(orderItems.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="span-2 ingredient-builder">
                <h3>Pratos, embalagens e acessórios (opcional)</h3>
                <p className="form-note">
                  Itens cobrados separadamente somam no total ao cliente. Uso interno serve apenas para registro sem aumentar o preço cobrado.
                </p>
                <div className="order-item-add">
                  <Field label="Origem do acessório">
                    <select
                      value={accSourceType}
                      onChange={(e) =>
                        setAccSourceType(e.target.value as "material" | "manual")
                      }
                    >
                      <option value="material">Material cadastrado</option>
                      <option value="manual">Descrição manual</option>
                    </select>
                  </Field>
                  {accSourceType === "material" ? (
                    <Field label="Material">
                      <select
                        value={accMatId}
                        onChange={(e) => {
                          setAccMatId(e.target.value);
                          const mat = data.materiais.find((m) => m.id === e.target.value);
                          if (mat && accCharged === "charged")
                            setAccPrice(String(mat.custo));
                        }}
                      >
                        <option value="">Selecione…</option>
                        {sortedMaterials
                          .filter((m) => !m.arquivado)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nome} · custo {money(m.custo)}
                            </option>
                          ))}
                      </select>
                    </Field>
                  ) : (
                    <Field label="Descrição do acessório">
                      <input
                        value={accDesc}
                        onChange={(e) => setAccDesc(e.target.value)}
                        placeholder="Ex.: Prato dourado 30cm"
                      />
                    </Field>
                  )}
                  <Field label="Cobrança ao cliente">
                    <select
                      value={accCharged}
                      onChange={(e) => {
                        const mode = e.target.value as "charged" | "internal";
                        setAccCharged(mode);
                        if (mode === "internal") setAccPrice("0");
                      }}
                    >
                      <option value="charged">Cobrar separadamente</option>
                      <option value="internal">Uso interno / já incluso</option>
                    </select>
                  </Field>
                  <Field label="Qtd.">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={accQty}
                      onChange={(e) => setAccQty(e.target.value)}
                    />
                  </Field>
                  <Field
                    label={
                      accCharged === "charged"
                        ? "Valor cobrado (R$)"
                        : "Custo extra (R$)"
                    }
                  >
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={accPrice}
                      onChange={(e) => setAccPrice(e.target.value)}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addOrderAccessory}
                  >
                    <Plus size={17} /> Adicionar acessório
                  </Button>
                </div>
                {orderAccessories.length > 0 && (
                  <ul className="composition-list">
                    {orderAccessories.map((acc, idx) => (
                      <li key={idx}>
                        <span>
                          <strong>{acc.descricao}</strong>
                          <small>
                            {acc.quantidade} un. ·{" "}
                            {acc.cobradoCliente
                              ? "Cobrado ao cliente"
                              : "Uso interno / incluso (não soma no total)"}
                          </small>
                        </span>
                        <span>
                          {acc.cobradoCliente ? money(acc.subtotal) : "Incluso"}
                        </span>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remover acessório ${acc.descricao}`}
                          onClick={() =>
                            setOrderAccessories(
                              orderAccessories.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {!orderHasStructured && record && (
                <div className="span-2">
                  {field("produtoDescricao", "Descrição registrada (legado)")}
                </div>
              )}
              <div className="span-2">
                {field(
                  "observacoes",
                  "Observações de preparo, sabor, tamanho e personalização",
                  "text",
                  undefined,
                  undefined,
                  false,
                )}
              </div>
              {orderHasStructured ? (
                <div className="form-summary">
                  <span>Total calculado da encomenda</span>
                  <strong>{money(orderCalculatedTotal)}</strong>
                </div>
              ) : (
                field("valorTotal", "Total (R$)", "number")
              )}
              {field("valorEntrada", "Valor já recebido (R$)", "number")}
              {field("status", "Situação", "text", [
                "Pendente",
                "Em Produção",
                "Finalizado",
              ])}
              <div className="form-summary">
                <span>Falta receber</span>
                <strong>
                  {money(
                    Math.max(
                      0,
                      orderCalculatedTotal - (Number(v("valorEntrada")) || 0),
                    ),
                  )}
                </strong>
              </div>
            </>
          )}
          {kind === "expense" && (
            <>
              {field("data", "Data", "date")}
              {field("tipo", "Categoria", "text", [
                "Material",
                "Equipamento",
                "Marketing",
                "Transporte",
                "Outros",
              ])}
              <div className="span-2">{field("descricao", "Descrição")}</div>
              {field(
                "quantidade",
                "Quantidade / observação",
                "text",
                undefined,
                "Ex.: 5 kg, 2 pacotes. Não multiplica o valor.",
                false,
              )}
              {field(
                "valor",
                "Total pago (R$)",
                "number",
                undefined,
                "Informe o total da despesa, não o preço por unidade.",
              )}
              {!record && (
                <div className="span-2 ingredient-builder">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={expAddStock}
                      onChange={(e) => setExpAddStock(e.target.checked)}
                    />
                    Registrar entrada no estoque para esta despesa
                  </label>
                  {expAddStock && (
                    <div className="recipe-add">
                      <Field label="Tipo de item">
                        <select
                          value={expStockType}
                          onChange={(e) => {
                            const nextType = e.target.value as "ingrediente" | "material";
                            setExpStockType(nextType);
                            setExpStockId("");
                            setExpStockUnit(nextType === "material" ? "unidade" : "g");
                          }}
                        >
                          <option value="ingrediente">Ingrediente</option>
                          <option value="material">Material</option>
                        </select>
                      </Field>
                      <Field label="Item cadastrado">
                        <select
                          value={expStockId}
                          onChange={(e) => {
                            setExpStockId(e.target.value);
                            if (expStockType === "ingrediente") {
                              const ing = data.ingredientes.find(
                                (i) => i.id === e.target.value,
                              );
                              if (ing) setExpStockUnit(ing.unidadePadrao);
                            } else {
                              setExpStockUnit("unidade");
                            }
                          }}
                        >
                          <option value="">Selecione…</option>
                          {(expStockType === "ingrediente"
                            ? sortedIngredients
                            : sortedMaterials
                          )
                            .filter((x) => !x.arquivado)
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.nome}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <Field label="Quantidade para o estoque">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={expStockQty}
                          onChange={(e) => setExpStockQty(e.target.value)}
                        />
                      </Field>
                      <Field label="Unidade">
                        <select
                          value={expStockUnit}
                          onChange={(e) => setExpStockUnit(e.target.value)}
                        >
                          {expAvailableUnits.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {kind === "invoice" && (
            <>
              {field("data", "Data da compra", "date")}
              {field("tipo", "Categoria", "text", [
                "Material",
                "Equipamento",
                "Marketing",
                "Transporte",
                "Outros",
              ])}
              <div className="span-2 ingredient-builder">
                <div className="detail-box-head">
                  <h3>{record ? "Fornecedor da nota" : "Fornecedor *"}</h3>
                  {!quickSupOpen && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setQuickSupOpen(true)}
                    >
                      <Plus size={16} /> Novo fornecedor
                    </Button>
                  )}
                </div>
                {record && !v("fornecedorId") && (record as Expense).fornecedor && (
                  <p className="form-note">
                    Nota anterior com fornecedor em texto:{" "}
                    <strong>{(record as Expense).fornecedor}</strong>. Selecione um
                    fornecedor abaixo caso deseje vincular ao cadastro formal.
                  </p>
                )}
                <div className="invoice-item-builder">
                  <Field label="Pesquisar fornecedor">
                    <input
                      placeholder="Buscar por nome, fantasia ou CNPJ/CPF…"
                      value={supSearch}
                      onChange={(e) => setSupSearch(e.target.value)}
                    />
                  </Field>
                  <Field
                    label={record ? "Fornecedor" : "Fornecedor *"}
                    hint={
                      supSearch.trim()
                        ? `${supplierOptions.length} fornecedor(es) encontrado(s)`
                        : "Somente fornecedores ativos aparecem para novas notas."
                    }
                  >
                    <select
                      value={v("fornecedorId")}
                      required={!record}
                      onChange={(e) => set("fornecedorId", e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {supplierOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                          {s.nomeFantasia ? ` · ${s.nomeFantasia}` : ""}
                          {s.arquivado ? " (arquivado)" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {quickSupOpen && (
                  <div className="session-box">
                    <h3>Cadastro rápido de fornecedor</h3>
                    <div className="invoice-item-builder">
                      <Field label="Nome / Razão social *">
                        <input
                          value={quickSupName}
                          onChange={(e) => setQuickSupName(e.target.value)}
                          placeholder="Ex.: Distribuidora ABC"
                        />
                      </Field>
                      <Field label="Nome fantasia (opcional)">
                        <input
                          value={quickSupFantasy}
                          onChange={(e) => setQuickSupFantasy(e.target.value)}
                        />
                      </Field>
                      <Field label="CNPJ / CPF (opcional)">
                        <input
                          value={quickSupDoc}
                          onChange={(e) => setQuickSupDoc(e.target.value)}
                          placeholder="Somente se aplicável"
                        />
                      </Field>
                      <Field label="Telefone / WhatsApp (opcional)">
                        <input
                          type="tel"
                          value={quickSupPhone}
                          onChange={(e) => setQuickSupPhone(e.target.value)}
                        />
                      </Field>
                    </div>
                    <div className="row-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setQuickSupOpen(false)}
                      >
                        Fechar cadastro rápido
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void saveQuickSupplier()}
                      >
                        Salvar fornecedor
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {field("numeroNota", "Número da nota (opcional)", "text", undefined, undefined, false)}
              {field("observacoes", "Observações (opcional)", "text", undefined, undefined, false)}
              <div className="span-2 ingredient-builder">
                <h3>Itens da nota fiscal</h3>
                {!record ? (
                  <>
                    <div className="invoice-item-builder">
                      <Field label="Tipo do item">
                        <select
                          value={invType}
                          onChange={(e) => {
                            const next = e.target.value as "ingrediente" | "material" | "outro";
                            setInvType(next);
                            setInvItemId("");
                            setInvSearch("");
                            setInvUnit(next === "ingrediente" ? "g" : "unidade");
                          }}
                        >
                          <option value="ingrediente">Ingrediente</option>
                          <option value="material">Material</option>
                          <option value="outro">Outro (sem estoque)</option>
                        </select>
                      </Field>
                      {invType !== "outro" ? (
                        <>
                          <Field label="Filtrar item">
                            <input
                              placeholder="Buscar por nome…"
                              value={invSearch}
                              onChange={(e) => setInvSearch(e.target.value)}
                            />
                          </Field>
                          <Field label="Item cadastrado">
                            <select
                              value={invItemId}
                              onChange={(e) => {
                                setInvItemId(e.target.value);
                                if (invType === "ingrediente") {
                                  const ing = data.ingredientes.find(
                                    (i) => i.id === e.target.value,
                                  );
                                  if (ing) setInvUnit(ing.unidadePadrao);
                                } else {
                                  setInvUnit("unidade");
                                }
                              }}
                            >
                              <option value="">Selecione…</option>
                              {invFilteredOptions.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.nome}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </>
                      ) : (
                        <Field label="Descrição do item">
                          <input
                            value={invCustomName}
                            onChange={(e) => setInvCustomName(e.target.value)}
                            placeholder="Ex.: Frete ou taxa da compra"
                          />
                        </Field>
                      )}
                      <div className="field">
                        <label>Seleção rápida</label>
                        <div className="quick-qty">
                          {(["1", "2", "3"] as const).map((q) => (
                            <button
                              key={q}
                              type="button"
                              className={`button secondary ${invQuickQty === q ? "active-pill" : ""}`}
                              onClick={() => {
                                setInvQuickQty(q);
                                setInvQty(q);
                              }}
                            >
                              {q}
                            </button>
                          ))}
                          <button
                            type="button"
                            className={`button secondary ${invQuickQty === "other" ? "active-pill" : ""}`}
                            onClick={() => setInvQuickQty("other")}
                          >
                            Outro
                          </button>
                        </div>
                      </div>
                      <Field label="Quantidade">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={invQty}
                          onChange={(e) => {
                            setInvQty(e.target.value);
                            setInvQuickQty("other");
                          }}
                        />
                      </Field>
                      <Field label="Unidade">
                        <select
                          value={invUnit}
                          onChange={(e) => setInvUnit(e.target.value)}
                        >
                          {invAvailableUnits.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Valor unitário (R$)">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={invUnitPrice}
                          onChange={(e) => setInvUnitPrice(e.target.value)}
                        />
                      </Field>
                      <div className="form-summary">
                        <span>Subtotal do item</span>
                        <strong>
                          {money((Number(invQty) || 0) * (Number(invUnitPrice) || 0))}
                        </strong>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addInvoiceItem}
                      >
                        <Plus size={17} /> Adicionar item
                      </Button>
                    </div>

                    {invoiceItems.length > 0 && (
                      <ul className="composition-list">
                        {invoiceItems.map((item, idx) => (
                          <li key={item.id}>
                            <span>
                              <strong>{item.itemNome}</strong>
                              <small>
                                {item.itemTipo === "ingrediente"
                                  ? "Ingrediente"
                                  : item.itemTipo === "material"
                                    ? "Material"
                                    : "Sem estoque"}{" "}
                                · {item.quantidade} {item.unidade}
                                {item.quantidadePadrao && item.unidadePadrao
                                  ? ` (${formatStock(item.quantidadePadrao, item.unidadePadrao)})`
                                  : ""}
                              </small>
                            </span>
                            <div className="inline-edit-controls">
                              <input
                                aria-label={`Quantidade de ${item.itemNome}`}
                                type="number"
                                min="0.001"
                                step="any"
                                value={item.quantidade}
                                onChange={(e) => {
                                  const nextQty = Math.max(0.001, Number(e.target.value) || 0);
                                  setInvoiceItems(
                                    invoiceItems.map((it, i) => {
                                      if (i !== idx) return it;
                                      let qtdPadrao = it.quantidadePadrao;
                                      if (it.geraEstoque && it.unidadePadrao) {
                                        qtdPadrao = normalizeStockQuantity(
                                          nextQty,
                                          it.unidade,
                                          it.unidadePadrao,
                                        ).quantidadePadrao;
                                      }
                                      return {
                                        ...it,
                                        quantidade: nextQty,
                                        quantidadePadrao: qtdPadrao,
                                        subtotal: round(nextQty * it.valorUnitario),
                                      };
                                    }),
                                  );
                                }}
                              />
                              <input
                                aria-label={`Valor unitário de ${item.itemNome}`}
                                type="number"
                                min="0"
                                step="any"
                                value={item.valorUnitario}
                                onChange={(e) => {
                                  const nextPrice = Math.max(0, Number(e.target.value) || 0);
                                  setInvoiceItems(
                                    invoiceItems.map((it, i) =>
                                      i === idx
                                        ? {
                                            ...it,
                                            valorUnitario: nextPrice,
                                            subtotal: round(it.quantidade * nextPrice),
                                          }
                                        : it,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <strong>{money(item.subtotal)}</strong>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Remover ${item.itemNome}`}
                              onClick={() =>
                                setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <>
                    <p className="form-note">
                      Alterar o fornecedor ou cabeçalho da nota não gera novas
                      movimentações de estoque. Para corrigir quantidades já lançadas,
                      exclua a nota (se houver saldo disponível) ou faça um ajuste no
                      módulo Estoque.
                    </p>
                    {invoiceItems.length > 0 && (
                      <ul className="composition-list">
                        {invoiceItems.map((item) => (
                          <li key={item.id}>
                            <span>
                              <strong>{item.itemNome}</strong>
                              <small>
                                {item.quantidade} {item.unidade} · Unitário{" "}
                                {money(item.valorUnitario)}
                              </small>
                            </span>
                            <strong>{money(item.subtotal)}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                <div className="form-summary">
                  <span>Total da nota fiscal ({invoiceItems.length} itens)</span>
                  <strong>
                    {money(
                      record
                        ? (record as Expense).valor
                        : invoiceItems.reduce((s, i) => s + i.subtotal, 0),
                    )}
                  </strong>
                </div>
              </div>
            </>
          )}
          {kind === "supplier" && (
            <>
              {field("nome", "Nome / Razão social")}
              {field(
                "nomeFantasia",
                "Nome fantasia (opcional)",
                "text",
                undefined,
                undefined,
                false,
              )}
              {field(
                "documento",
                "CNPJ / CPF (opcional)",
                "text",
                undefined,
                "Deixe em branco para fornecedor informal.",
                false,
              )}
              {field(
                "contato",
                "Telefone / WhatsApp (opcional)",
                "tel",
                undefined,
                undefined,
                false,
              )}
              {field("email", "E-mail (opcional)", "email", undefined, undefined, false)}
              {field(
                "endereco",
                "Endereço (opcional)",
                "text",
                undefined,
                undefined,
                false,
              )}
              <div className="span-2">
                {field(
                  "observacoes",
                  "Observações (opcional)",
                  "text",
                  undefined,
                  undefined,
                  false,
                )}
              </div>
            </>
          )}
          {kind === "customer" && (
            <>
              {field("nome", "Nome")}
              {field(
                "contato",
                "Telefone / WhatsApp",
                "tel",
                undefined,
                undefined,
                false,
              )}
              {field("email", "E-mail", "email", undefined, undefined, false)}
              {field(
                "endereco",
                "Endereço",
                "text",
                undefined,
                undefined,
                false,
              )}
              <div className="span-2">
                {field(
                  "observacoes",
                  "Observações",
                  "text",
                  undefined,
                  undefined,
                  false,
                )}
              </div>
            </>
          )}
          {kind === "ingredient" && (
            <>
              {field("nome", "Nome")}
              {field(
                "unidadeCompra",
                "Embalagem de compra",
                "text",
                undefined,
                "Ex.: pacote de 1 kg",
              )}
              {field("precoCompra", "Preço da compra (R$)", "number")}
              {field("unidadePadrao", "Unidade para calcular", "text", [
                { value: "g", label: "Gramas (g)" },
                { value: "ml", label: "Mililitros (ml)" },
                { value: "unidade", label: "Unidades" },
              ])}
              {field(
                "tamanhoCompra",
                "Quantidade na unidade escolhida",
                "number",
                undefined,
                "Ex.: um pacote de 1 kg corresponde a 1000 g.",
              )}
              {field(
                "estoqueMinimo",
                `Estoque mínimo (${v("unidadePadrao") || "g"})`,
                "number",
                undefined,
                "Opcional: alerta quando o saldo ficar igual ou abaixo.",
                false,
              )}
              <p className="form-note span-2">
                As receitas guardam o custo no momento do cadastro. Após mudar
                um ingrediente, revise e salve as receitas e os produtos que o
                utilizam.
              </p>
            </>
          )}
          {kind === "material" && (
            <>
              {field("nome", "Nome")}
              {field("custo", "Custo por unidade (R$)", "number")}
              {field(
                "estoqueMinimo",
                "Estoque mínimo (unidades)",
                "number",
                undefined,
                "Opcional: alerta quando o saldo ficar igual ou abaixo.",
                false,
              )}
            </>
          )}
          {kind === "goal" && (
            <>
              {field("metaMensal", "Meta de vendas (R$)", "number")}
              <p className="form-note">
                A mesma meta é usada como referência em cada mês.
              </p>
            </>
          )}
          {kind === "recipe" && (
            <>
              {field("titulo", "Nome da receita")}
              {field("rendimento", "Rendimento em unidades", "number")}
              <div className="span-2 ingredient-builder">
                <h3>Ingredientes</h3>
                <div className="recipe-add">
                  <Field label="Ingrediente">
                    <select
                      value={ingredientId}
                      onChange={(e) => {
                        setIngredientId(e.target.value);
                        setUnit(
                          data.ingredientes.find((i) => i.id === e.target.value)
                            ?.unidadePadrao || "g",
                        );
                      }}
                    >
                      <option value="">Selecione…</option>
                      {sortedIngredients
                        .filter((i) => !i.arquivado)
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.nome}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Quantidade">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Field>
                  <Field label="Unidade">
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      {["g", "kg", "ml", "l", "unidade"].map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addIngredient}
                  >
                    <Plus size={17} /> Adicionar
                  </Button>
                </div>
                <ul className="composition-list">
                  {liveItems.map((item, index) => (
                    <li key={index}>
                      <span>
                        {data.ingredientes.find(
                          (i) => i.id === item.ingredienteId,
                        )?.nome || "Ingrediente não encontrado"}
                        <small>
                          {item.quantidade} {item.unidadeUso}
                        </small>
                      </span>
                      <span>{money(item.custo)}</span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remover ingrediente ${index + 1}`}
                        onClick={() =>
                          setItems(items.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="form-summary">
                  <span>Custo da receita</span>
                  <strong>
                    {money(liveItems.reduce((n, i) => n + i.custo, 0))}
                  </strong>
                </div>
              </div>
            </>
          )}
          {kind === "product" && (
            <>
              {field("nome", "Nome")}
              {field("categoria", "Categoria", "text", [
                "Bolos",
                "Doces",
                "Salgados",
                "Bebidas",
                "Outros",
              ])}
              <div className="span-2">
                <h3>Composição por unidade do produto</h3>
                <p className="form-note">
                  Cada seleção inclui uma unidade da receita ou do material.
                </p>
                <div className="check-grid">
                  {sortedRecipes
                    .filter((r) => !r.arquivado || recipes.includes(r.id))
                    .map((r) => (
                      <label key={r.id} className="checkbox">
                        <input
                          type="checkbox"
                          checked={recipes.includes(r.id)}
                          onChange={(e) =>
                            setRecipes(
                              e.target.checked
                                ? [...recipes, r.id]
                                : recipes.filter((id) => id !== r.id),
                            )
                          }
                        />
                        {r.titulo} · {money(r.custoPorUnidade)}
                      </label>
                    ))}
                  {sortedMaterials
                    .filter((m) => !m.arquivado || materials.includes(m.id))
                    .map((m) => (
                      <label key={m.id} className="checkbox">
                        <input
                          type="checkbox"
                          checked={materials.includes(m.id)}
                          onChange={(e) =>
                            setMaterials(
                              e.target.checked
                                ? [...materials, m.id]
                                : materials.filter((id) => id !== m.id),
                            )
                          }
                        />
                        {m.nome} · {money(m.custo)}
                      </label>
                    ))}
                </div>
              </div>
              {recipes.length || materials.length ? (
                <div className="form-summary">
                  <span>Base da composição</span>
                  <strong>{money(baseCost)}</strong>
                </div>
              ) : (
                field(
                  "custoMaterial",
                  "Ingredientes / materiais (R$)",
                  "number",
                )
              )}
              {field("custoMaoObra", "Mão de obra por unidade (R$)", "number")}
              {field("custosInvisiveis", "Custos indiretos (%)", "number")}
              {field("tempoPreparo", "Tempo de preparo (minutos)", "number")}
              <Field label="Como definir o preço">
                <select
                  value={priceMode}
                  onChange={(e) =>
                    setPriceMode(e.target.value as "manual" | "automatic")
                  }
                >
                  <option value="manual">Informar preço final</option>
                  <option value="automatic">Calcular pelo custo</option>
                </select>
              </Field>
              {priceMode === "manual"
                ? field("valor", "Preço de venda (R$)", "number")
                : field(
                    "margem",
                    "Acréscimo sobre custo (%)",
                    "number",
                    undefined,
                    "100% dobra o custo. Esse percentual é markup.",
                  )}
              <div className="form-summary span-2">
                <span>Custo {money(cost)} · preço de venda</span>
                <strong>{money(finalPrice)}</strong>
              </div>
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </Button>
          {kind === "sale" && !record && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !canWrite}
              onClick={() => void saveSaleItem(true)}
            >
              Salvar e continuar
            </Button>
          )}
          <Button type="submit" disabled={busy || !canWrite}>
            {busy
              ? "Aguardando confirmação…"
              : kind === "invoice"
                ? "Salvar nota fiscal"
                : kind === "sale" && saleSessionItems.length > 0 && !v("produtoId")
                  ? "Concluir compra"
                  : "Salvar"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
