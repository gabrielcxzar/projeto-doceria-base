import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useBusiness } from "./context";
import type { EditorKind } from "./context";
import type {
  CollectionName,
  Entity,
  Product,
  Recipe,
  RecipeItem,
} from "./types";
import {
  ingredientCost,
  money,
  positive,
  priceFor,
  productCost,
  recipeCost,
  round,
  today,
  validDate,
  validateOrder,
  validateSale,
  versionOf,
} from "./domain";
import { Button, Field, Modal } from "./ui";

const titles: Record<EditorKind, string> = {
  sale: "Registrar venda",
  order: "Encomenda",
  expense: "Despesa",
  customer: "Cliente",
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
  customer: "clientes",
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
  order: { dataEntrega: today(), valorEntrada: "0", status: "Pendente" },
  expense: { data: today(), tipo: "Material", quantidade: "" },
  customer: {},
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
    if (kind === "sale" || kind === "expense") result.data = today();
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
    return result;
  });
  const [error, setError] = useState("");
  const [items, setItems] = useState<RecipeItem[]>(
    kind === "recipe" ? (record as Recipe)?.ingredientes || [] : [],
  );
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
  const [ingredientId, setIngredientId] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g");
  const liveItems = items.map((item) => {
    const ingredient = data.ingredientes.find(
      (i) => i.id === item.ingredienteId,
    );
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
                  data.produtos.find((p) => p.id === e.target.value)?.valor ??
                    "",
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
  const customerOptions = data.clientes
    .filter((c) => !c.arquivado || c.id === v("clienteId"))
    .map((c) => ({ value: c.id, label: c.nome }));
  const baseCost =
    recipes.length || materials.length
      ? round(
          recipes.reduce(
            (sum, id) =>
              sum +
              (data.receitas.find((r) => r.id === id)?.custoPorUnidade || 0),
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
            (n) => n.toUpperCase() === name.toUpperCase(),
          ),
      )
    )
      throw new Error("Já existe um cadastro com esse nome.");
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (!canWrite)
        throw new Error(
          "Seu perfil permite somente consulta ou a conexão está indisponível.",
        );
      let payload: Record<string, unknown> = {};
      if (kind === "sale") {
        const customer = data.clientes.find((c) => c.id === v("clienteId"));
        const product = data.produtos.find((p) => p.id === v("produtoId"));
        if (!customer || !product)
          throw new Error("Selecione cliente e produto cadastrados.");
        const sale = {
          data: v("data"),
          pessoa: customer.nome,
          clienteId: customer.id,
          produto: product.nome,
          produtoId: product.id,
          quantidade: n("quantidade", "Quantidade"),
          valor: n("valor", "Preço"),
          custoUnitario: productCost(product),
          pagamento: v("pagamento"),
          status: v("status") as "P" | "A" | "E",
        };
        validateSale(sale);
        payload = sale;
      } else if (kind === "order") {
        const customer = data.clientes.find((c) => c.id === v("clienteId"));
        if (!customer) throw new Error("Selecione um cliente cadastrado.");
        const order = {
          clienteNome: customer.nome,
          clienteId: customer.id,
          produtoDescricao: v("produtoDescricao").trim(),
          dataEntrega: v("dataEntrega"),
          valorTotal: n("valorTotal", "Total"),
          valorEntrada: n("valorEntrada", "Entrada", true),
          status: v("status") as "Pendente" | "Em Produção" | "Finalizado",
        };
        validateOrder(order);
        if (
          order.status === "Finalizado" &&
          order.valorEntrada !== order.valorTotal
        )
          throw new Error(
            "Para finalizar, confirme o recebimento total preenchendo a entrada igual ao total.",
          );
        payload = order;
      } else if (kind === "expense") {
        if (!validDate(v("data"))) throw new Error("Informe uma data válida.");
        if (!v("descricao").trim()) throw new Error("Informe a descrição.");
        payload = {
          data: v("data"),
          tipo: v("tipo"),
          descricao: v("descricao").trim(),
          quantidade: v("quantidade"),
          valor: n("valor", "Total da despesa"),
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
        payload = {
          nome,
          unidadeCompra: v("unidadeCompra").trim(),
          precoCompra,
          tamanhoCompra,
          unidadePadrao: v("unidadePadrao"),
          custoUnitarioPadrao: precoCompra / tamanhoCompra,
        };
      } else if (kind === "material") {
        const nome = v("nome").trim();
        nameUnique(nome, data.materiais);
        payload = { nome, custo: n("custo", "Custo", true) };
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
            id: record?.id,
            expectedUpdatedAt: record ? versionOf(record) : undefined,
            data: payload,
          },
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
  return (
    <Modal
      title={`${record ? "Editar " : ""}${titles[kind]}`}
      subtitle={
        kind === "sale" ? "Uma venda simples, com tudo no lugar." : undefined
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
              {field(
                "produtoId",
                "Produto",
                "text",
                data.produtos
                  .filter((p) => !p.arquivado)
                  .map((p) => ({ value: p.id, label: p.nome })),
              )}
              {field("quantidade", "Quantidade", "number")}
              {field("valor", "Preço unitário (R$)", "number")}
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
                <span>Total da venda</span>
                <strong>
                  {money(
                    (Number(v("quantidade")) || 0) * (Number(v("valor")) || 0),
                  )}
                </strong>
              </div>
            </>
          )}
          {kind === "order" && (
            <>
              {field("clienteId", "Cliente", "text", customerOptions)}
              {field("dataEntrega", "Entrega", "date")}
              <div className="span-2">
                {field("produtoDescricao", "O que vamos preparar?")}
              </div>
              {field("valorTotal", "Total (R$)", "number")}
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
                      Number(v("valorTotal")) - Number(v("valorEntrada")) || 0,
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
                      {data.ingredientes
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
                  {data.receitas
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
                  {data.materiais
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
          <Button type="submit" disabled={busy || !canWrite}>
            {busy ? "Aguardando confirmação…" : "Salvar"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
