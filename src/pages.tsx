import { useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardCopy,
  Edit3,
  ExternalLink,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useBusiness } from "./context";
import type { EditorKind } from "./context";
import type {
  CollectionName,
  Customer,
  Entity,
  Mutation,
  Order,
  Recipe,
  Sale,
} from "./types";
import {
  chargeMessage,
  csv,
  customerMatches,
  customerTotals,
  dateText,
  finances,
  money,
  orderRemaining,
  productCost,
  saleTotal,
  today,
  versionOf,
} from "./domain";
import {
  Badge,
  Button,
  DownloadFile,
  Empty,
  Field,
  Modal,
  Pagination,
  Table,
  useListing,
} from "./ui";

const saleStatus = (s: Sale) =>
  s.status === "P" ? (
    <Badge tone="warning">Pendente</Badge>
  ) : (
    <Badge tone="good">{s.status === "E" ? "Entregue e pago" : "Pago"}</Badge>
  );
const orderStatus = (o: Order) => (
  <Badge
    tone={
      o.status === "Finalizado"
        ? "good"
        : o.status === "Pendente"
          ? "warning"
          : "neutral"
    }
  >
    {o.status}
  </Badge>
);
function Actions({
  kind,
  collection,
  record,
  name,
}: {
  kind?: EditorKind;
  collection: CollectionName;
  record: Entity;
  name: string;
}) {
  const { canWrite, edit, remove, save, notify } = useBusiness();
  if (!canWrite) return <span className="muted">—</span>;
  const archive = [
    "clientes",
    "produtos",
    "ingredientes",
    "receitas",
    "materiais",
  ].includes(collection);
  if (record.arquivado)
    return (
      <button
        className="icon-button"
        aria-label={`Reativar ${name}`}
        onClick={() => {
          void save(
            [
              {
                collection,
                id: record.id,
                expectedUpdatedAt: versionOf(record),
                data: { arquivado: false },
              },
            ],
            `Reativação: ${name}`,
          ).catch((e) => notify((e as Error).message, true));
        }}
      >
        <RotateCcw size={16} />
      </button>
    );
  return (
    <div className="row-actions">
      {kind && (
        <button
          className="icon-button"
          aria-label={`Editar ${name}`}
          onClick={() => edit(kind, record)}
        >
          <Edit3 size={16} />
        </button>
      )}
      <button
        className="icon-button danger-text"
        aria-label={`${archive ? "Arquivar" : "Excluir"} ${name}`}
        onClick={() => remove(collection, record, name)}
      >
        {archive ? <Archive size={16} /> : <Trash2 size={16} />}
      </button>
    </div>
  );
}
export function Dashboard({ navigate }: { navigate: (page: string) => void }) {
  const { data, period, canWrite, edit } = useBusiness();
  const f = finances(data, period);
  const upcoming = [...data.encomendas]
    .filter((o) => o.status !== "Finalizado")
    .sort((a, b) => a.dataEntrega.localeCompare(b.dataEntrega))
    .slice(0, 5);
  const goal = data.configuracoes[0]?.metaMensal || 0;
  const percentage =
    goal > 0 ? Math.min(100, Math.round((f.sold / goal) * 100)) : 0;
  const recent = [...data.vendas]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today()}T12:00:00`);
    d.setDate(d.getDate() - (6 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      label: d
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", ""),
      value: data.vendas
        .filter((s) => s.data === key)
        .reduce((n, s) => n + saleTotal(s), 0),
    };
  });
  const max = Math.max(1, ...days.map((d) => d.value));
  const monthDays =
    period.length === 7
      ? Array.from(
          {
            length: new Date(
              Number(period.slice(0, 4)),
              Number(period.slice(5)),
              0,
            ).getDate(),
          },
          (_, i) => ({
            label: String(i + 1),
            value: data.vendas
              .filter(
                (s) => s.data === `${period}-${String(i + 1).padStart(2, "0")}`,
              )
              .reduce((n, s) => n + saleTotal(s), 0),
          }),
        )
      : [];
  const monthMax = Math.max(1, ...monthDays.map((d) => d.value));
  return (
    <>
      <div className="welcome-strip">
        <p className="muted">Resumo do período selecionado</p>
        {canWrite && (
          <Button onClick={() => edit("sale")}>
            <Plus size={18} /> Registrar venda
          </Button>
        )}
      </div>
      <div className="metric-grid">
        <Metric
          title="Total vendido"
          value={f.sold}
          detail={`${f.count} vendas e encomendas`}
        />
        <Metric
          title="Já recebido"
          value={f.received}
          detail="Pagamentos e entradas"
        />
        <Metric
          title="A receber"
          value={f.pending}
          detail="Saldo do período"
          accent
        />
        <Metric
          title="Despesas"
          value={f.spent}
          detail={`${f.expenses.length} lançamentos no período`}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Ritmo da semana</span>
              <h2>Vendas dos últimos 7 dias</h2>
            </div>
            <Badge>Vendas avulsas</Badge>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={days
              .map((d) => `${d.label}: ${money(d.value)}`)
              .join("; ")}
          >
            {days.map((d, i) => (
              <div className="bar-column" key={i}>
                <span>{d.value ? money(d.value) : "—"}</span>
                <div className="bar-track">
                  <div
                    className={`bar ${i === 6 ? "current" : ""}`}
                    style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
                  />
                </div>
                <small>{d.label}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel goal-panel">
          <span className="eyebrow">Um passo de cada vez</span>
          <h2>Meta de vendas</h2>
          <div className="goal-number">
            {percentage}
            <small>%</small>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-label="Progresso da meta"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${percentage}%` }} />
          </div>
          <p>
            {goal
              ? `${money(f.sold)} de ${money(goal)}`
              : "Defina uma meta mensal para acompanhar."}
          </p>
          {period.length !== 7 && (
            <small>Selecione um mês para comparar com a meta mensal.</small>
          )}
          {canWrite && (
            <Button
              variant="secondary"
              onClick={() => edit("goal", data.configuracoes[0])}
            >
              Ajustar meta <ArrowUpRight size={16} />
            </Button>
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Na cozinha</span>
              <h2>Próximas entregas</h2>
            </div>
            <Button variant="ghost" onClick={() => navigate("encomendas")}>
              Ver agenda <ChevronRight size={16} />
            </Button>
          </div>
          {upcoming.length ? (
            <ul className="order-list">
              {upcoming.map((o) => (
                <li key={o.id}>
                  <div className="date-tile">
                    <strong>{o.dataEntrega.slice(-2)}</strong>
                    <small>{dateText(o.dataEntrega).slice(3, 5)}</small>
                  </div>
                  <div className="grow">
                    <strong>{o.produtoDescricao}</strong>
                    <small>
                      {o.clienteNome} · {money(o.valorTotal)}
                    </small>
                  </div>
                  {orderStatus(o)}
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="Agenda em dia"
              text="As próximas encomendas aparecerão aqui."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">No balcão</span>
              <h2>Últimas vendas</h2>
            </div>
            <Button variant="ghost" onClick={() => navigate("vendas")}>
              Ver todas <ChevronRight size={16} />
            </Button>
          </div>
          {recent.length ? (
            <ul className="simple-list">
              {recent.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.pessoa}</strong>
                    <small>
                      {s.quantidade} × {s.produto}
                    </small>
                  </div>
                  <div className="align-right">
                    <strong>{money(saleTotal(s))}</strong>
                    {saleStatus(s)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="Seu próximo começo"
              text="Registre a primeira venda para acompanhar por aqui."
            />
          )}
        </section>
      </div>
      {monthDays.length > 0 && (
        <section className="panel activity-panel">
          <div className="panel-header">
            <h2>Vendas por dia do mês</h2>
            <Badge>{period.split("-").reverse().join("/")}</Badge>
          </div>
          <div className="daily-scroll">
            <div
              className="bar-chart daily-chart"
              role="img"
              aria-label={monthDays
                .map((d) => `Dia ${d.label}: ${money(d.value)}`)
                .join("; ")}
            >
              {monthDays.map((d) => (
                <div
                  className="bar-column"
                  key={d.label}
                  title={`Dia ${d.label}: ${money(d.value)}`}
                >
                  <div className="bar-track">
                    <div
                      className="bar"
                      style={{
                        height: `${Math.max(2, (d.value / monthMax) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>{d.label}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="panel activity-panel">
        <div className="panel-header">
          <h2>Últimos movimentos</h2>
          <span className="muted">Histórico da equipe</span>
        </div>
        <ul className="activity-list">
          {data.atividades.slice(0, 5).map((a) => (
            <li key={a.id}>
              <span className="activity-dot" />
              <span>
                {a.descricao}
                <small>
                  {a.usuarioNome || "Equipe"} · {dateText(a.criadoEm)}
                </small>
              </span>
            </li>
          ))}
        </ul>
        {!data.atividades.length && (
          <p className="muted">
            As atividades da equipe serão registradas aqui.
          </p>
        )}
      </section>
    </>
  );
}
function Metric({
  title,
  value,
  detail,
  accent = false,
}: {
  title: string;
  value: number;
  detail: string;
  accent?: boolean;
}) {
  return (
    <section className={`metric ${accent ? "accent" : ""}`}>
      <span>{title}</span>
      <strong>{money(value)}</strong>
      <small>{detail}</small>
    </section>
  );
}

export function Sales() {
  const { data, period, canWrite, edit, save, notify } = useBusiness();
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState<Sale | null>(null);
  const list = useListing(
    [...data.vendas]
      .filter(
        (s) =>
          (!period || s.data.startsWith(period)) &&
          (!status || s.status === status),
      )
      .sort((a, b) => b.data.localeCompare(a.data)),
    (s) => `${s.pessoa} ${s.produto} ${s.pagamento}`,
  );
  return (
    <>
      <div className="section-tools">
        {list.searchInput}
        <select
          aria-label="Filtrar situação das vendas"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            list.setPage(1);
          }}
        >
          <option value="">Todas as situações</option>
          <option value="P">Pendente</option>
          <option value="A">Pago</option>
          <option value="E">Entregue e pago</option>
        </select>
        <div className="grow" />
        {canWrite && (
          <Button onClick={() => edit("sale")}>
            <Plus size={18} /> Registrar venda
          </Button>
        )}
      </div>
      <section className="panel">
        <Table
          headings={[
            "Data",
            "Cliente / produto",
            "Quantidade",
            "Total",
            "Pagamento",
            "Situação",
            "Ações",
          ]}
          empty={!list.rows.length}
        >
          {list.rows.map((s) => (
            <tr key={s.id}>
              <td>{dateText(s.data)}</td>
              <td>
                <strong>{s.pessoa}</strong>
                <small>{s.produto}</small>
              </td>
              <td>{s.quantidade}</td>
              <td className="money">{money(saleTotal(s))}</td>
              <td>{s.pagamento}</td>
              <td>{saleStatus(s)}</td>
              <td>
                <div className="row-actions">
                  {canWrite && (
                    <button
                      className="icon-button"
                      aria-label={`Atualizar situação da venda de ${s.pessoa}`}
                      onClick={() => setPayment(s)}
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <Actions
                    collection="vendas"
                    record={s}
                    name={`venda de ${s.pessoa}`}
                  />
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          total={list.filtered.length}
          page={list.page}
          setPage={list.setPage}
        />
      </section>
      {payment && (
        <StatusDialog
          sale={payment}
          close={() => setPayment(null)}
          save={async (status) => {
            try {
              await save(
                [
                  {
                    collection: "vendas",
                    id: payment.id,
                    data: { status },
                    expectedUpdatedAt: versionOf(payment),
                  },
                ],
                `Situação da venda de ${payment.pessoa} atualizada`,
              );
              setPayment(null);
            } catch (e) {
              notify((e as Error).message, true);
            }
          }}
        />
      )}
    </>
  );
}
function StatusDialog({
  sale,
  close,
  save,
}: {
  sale: Sale;
  close: () => void;
  save: (status: string) => Promise<void>;
}) {
  const { busy, canWrite } = useBusiness();
  const [status, setStatus] = useState(sale.status);
  return (
    <Modal title="Situação da venda" onClose={close} busy={busy}>
      <p>
        {sale.pessoa} · {money(saleTotal(sale))}
      </p>
      <Field label="Situação">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Sale["status"])}
        >
          <option value="P">Pendente</option>
          <option value="A">Pago</option>
          <option value="E">Entregue e pago</option>
        </select>
      </Field>
      <p className="form-note">
        Selecione pago somente após confirmar o recebimento.
      </p>
      <footer className="modal-footer">
        <Button variant="secondary" onClick={close} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={() => void save(status)} disabled={!canWrite}>
          {busy ? "Confirmando…" : "Confirmar"}
        </Button>
      </footer>
    </Modal>
  );
}
export function Orders() {
  const { data, canWrite, edit } = useBusiness();
  const [status, setStatus] = useState("");
  const list = useListing(
    [...data.encomendas]
      .filter((o) => !status || o.status === status)
      .sort((a, b) => a.dataEntrega.localeCompare(b.dataEntrega)),
    (o) => `${o.clienteNome} ${o.produtoDescricao}`,
  );
  return (
    <>
      <div className="section-tools">
        {list.searchInput}
        <select
          aria-label="Filtrar situação das encomendas"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            list.setPage(1);
          }}
        >
          <option value="">Todas as situações</option>
          {["Pendente", "Em Produção", "Finalizado"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="grow" />
        {canWrite && (
          <Button onClick={() => edit("order")}>
            <Plus size={18} /> Nova encomenda
          </Button>
        )}
      </div>
      <p className="page-note">
        A agenda mostra todas as entregas, incluindo as que estão fora do
        período do painel.
      </p>
      <section className="panel">
        <Table
          headings={[
            "Entrega",
            "Cliente / encomenda",
            "Total",
            "Recebido",
            "A receber",
            "Situação",
            "Ações",
          ]}
          empty={!list.rows.length}
        >
          {list.rows.map((o) => (
            <tr key={o.id}>
              <td
                className={
                  o.dataEntrega < today() && o.status !== "Finalizado"
                    ? "danger-text"
                    : ""
                }
              >
                {dateText(o.dataEntrega)}
              </td>
              <td>
                <strong>{o.clienteNome}</strong>
                <small>{o.produtoDescricao}</small>
              </td>
              <td className="money">{money(o.valorTotal)}</td>
              <td className="money">{money(o.valorEntrada)}</td>
              <td className="money">{money(orderRemaining(o))}</td>
              <td>{orderStatus(o)}</td>
              <td>
                <Actions
                  kind="order"
                  collection="encomendas"
                  record={o}
                  name={`encomenda de ${o.clienteNome}`}
                />
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          total={list.filtered.length}
          page={list.page}
          setPage={list.setPage}
        />
      </section>
    </>
  );
}
export function Finance() {
  const { data, period, canWrite, edit } = useBusiness();
  const [type, setType] = useState("");
  const f = finances(data, period);
  const list = useListing(
    f.expenses
      .filter((e) => !type || e.tipo === type)
      .sort((a, b) => b.data.localeCompare(a.data)),
    (e) => `${e.descricao} ${e.tipo}`,
  );
  return (
    <>
      <div className="metric-grid">
        <Metric
          title="Já recebido"
          value={f.received}
          detail="Vendas e entradas de encomendas"
        />
        <Metric
          title="Despesas pagas"
          value={f.spent}
          detail="Lançamentos do período"
        />
        <Metric
          title="Resultado de caixa"
          value={f.balance}
          detail="Recebido menos despesas"
          accent
        />
        <Metric
          title="Custo estimado das vendas"
          value={f.productionCost}
          detail="Produção das vendas avulsas"
        />
      </div>
      <p className="page-note">
        O resultado de caixa não é uma apuração contábil de lucro. O custo
        estimado é informativo: despesas com ingredientes podem já estar
        incluídas nos lançamentos. O período das encomendas considera a data de
        entrega.
      </p>
      <div className="section-tools">
        {list.searchInput}
        <select
          aria-label="Filtrar tipo de despesa"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            list.setPage(1);
          }}
        >
          <option value="">Todos os tipos</option>
          {["Material", "Equipamento", "Marketing", "Transporte", "Outros"].map(
            (t) => (
              <option key={t}>{t}</option>
            ),
          )}
        </select>
        <div className="grow" />
        {canWrite && (
          <Button onClick={() => edit("expense")}>
            <Plus size={18} /> Registrar despesa
          </Button>
        )}
      </div>
      <section className="panel">
        <Table
          headings={[
            "Data",
            "Descrição",
            "Categoria",
            "Quantidade / observação",
            "Total",
            "Ações",
          ]}
          empty={!list.rows.length}
        >
          {list.rows.map((e) => (
            <tr key={e.id}>
              <td>{dateText(e.data)}</td>
              <td>
                <strong>{e.descricao}</strong>
              </td>
              <td>
                <Badge>{e.tipo}</Badge>
              </td>
              <td>{e.quantidade || "—"}</td>
              <td className="money">{money(e.valor)}</td>
              <td>
                <Actions
                  kind="expense"
                  collection="despesas"
                  record={e}
                  name={e.descricao}
                />
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          total={list.filtered.length}
          page={list.page}
          setPage={list.setPage}
        />
      </section>
    </>
  );
}
const catalogTabs = [
  { key: "clientes", title: "Clientes", kind: "customer" },
  { key: "produtos", title: "Produtos", kind: "product" },
  { key: "receitas", title: "Receitas", kind: "recipe" },
  { key: "ingredientes", title: "Ingredientes", kind: "ingredient" },
  { key: "materiais", title: "Materiais", kind: "material" },
] as const;
export function Catalog() {
  const { data, canWrite, edit } = useBusiness();
  const [tab, setTab] = useState<(typeof catalogTabs)[number]>(catalogTabs[0]);
  const [printRecipe, setPrintRecipe] = useState<Recipe | null>(null);
  const [archived, setArchived] = useState(false);
  const list = useListing<Entity>(
    data[tab.key].filter((r) => archived || !r.arquivado),
    (r) => ("nome" in r ? r.nome : "titulo" in r ? r.titulo : ""),
  );
  const head: Record<string, string[]> = {
    clientes: [
      "Cliente",
      "Contato",
      "Compras registradas",
      "Última compra",
      "Em aberto",
      "Ações",
    ],
    produtos: [
      "Produto",
      "Categoria",
      "Custo por unidade",
      "Preço de venda",
      "Acréscimo sobre custo",
      "Ações",
    ],
    receitas: [
      "Receita",
      "Rendimento",
      "Custo total",
      "Custo por unidade",
      "Ações",
    ],
    ingredientes: ["Ingrediente", "Compra", "Preço", "Custo padrão", "Ações"],
    materiais: ["Material", "Custo por unidade", "Ações"],
  };
  return (
    <>
      <div className="subnav" role="tablist" aria-label="Tipos de cadastro">
        {catalogTabs.map((t) => (
          <button
            role="tab"
            aria-selected={tab.key === t.key}
            key={t.key}
            className={tab.key === t.key ? "active" : ""}
            onClick={() => {
              setTab(t);
              list.setPage(1);
            }}
          >
            {t.title}
            <span>{data[t.key].length}</span>
          </button>
        ))}
      </div>
      <div className="section-tools">
        {list.searchInput}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Mostrar arquivados
        </label>
        <div className="grow" />
        {canWrite && (
          <Button onClick={() => edit(tab.kind)}>
            <Plus size={18} /> Cadastrar{" "}
            {tab.kind === "customer"
              ? "cliente"
              : tab.kind === "product"
                ? "produto"
                : tab.kind === "recipe"
                  ? "receita"
                  : tab.kind === "ingredient"
                    ? "ingrediente"
                    : "material"}
          </Button>
        )}
      </div>
      <section className="panel">
        <Table headings={head[tab.key]} empty={!list.rows.length}>
          {list.rows.map((record) => {
            const customer = record as Customer;
            const product = record as import("./types").Product;
            const recipe = record as Recipe;
            const ingredient = record as import("./types").Ingredient;
            const material = record as import("./types").Material;
            const total =
              tab.key === "clientes"
                ? customerTotals(data, record as Customer)
                : null;
            return (
              <tr key={record.id}>
                {tab.key === "clientes" && (
                  <>
                    <td>
                      <strong>{customer.nome}</strong>
                      <small>{customer.email || "Sem e-mail"}</small>
                    </td>
                    <td>{customer.contato || "—"}</td>
                    <td className="money">{money(total!.total)}</td>
                    <td>
                      {dateText(
                        [
                          ...data.vendas
                            .filter((s) =>
                              customerMatches(s, record as Customer),
                            )
                            .map((s) => s.data),
                          ...data.encomendas
                            .filter((o) =>
                              customerMatches(o, record as Customer),
                            )
                            .map((o) =>
                              typeof o.criadoEm === "string"
                                ? o.criadoEm.slice(0, 10)
                                : o.criadoEm instanceof Date
                                  ? o.criadoEm.toISOString().slice(0, 10)
                                  : o.criadoEm
                                    ? o.criadoEm
                                        .toDate()
                                        .toISOString()
                                        .slice(0, 10)
                                    : o.dataEntrega,
                            ),
                        ]
                          .sort()
                          .at(-1),
                      )}
                    </td>
                    <td className="money">{money(total!.pending)}</td>
                  </>
                )}
                {tab.key === "produtos" && (
                  <>
                    <td>
                      <strong>{product.nome}</strong>
                      <small>{product.tempoPreparo} min de preparo</small>
                    </td>
                    <td>
                      <Badge>{product.categoria}</Badge>
                    </td>
                    <td className="money">
                      {money(productCost(record as import("./types").Product))}
                    </td>
                    <td className="money">{money(product.valor)}</td>
                    <td>
                      {productCost(record as import("./types").Product) > 0
                        ? `${((product.valor / productCost(product) - 1) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </>
                )}
                {tab.key === "receitas" && (
                  <>
                    <td>
                      <strong>{recipe.titulo}</strong>
                    </td>
                    <td>{recipe.rendimento} un.</td>
                    <td className="money">{money(recipe.custoTotal)}</td>
                    <td className="money">{money(recipe.custoPorUnidade)}</td>
                  </>
                )}
                {tab.key === "ingredientes" && (
                  <>
                    <td>
                      <strong>{ingredient.nome}</strong>
                    </td>
                    <td>
                      {ingredient.unidadeCompra}
                      <small>
                        {ingredient.tamanhoCompra} {ingredient.unidadePadrao}
                      </small>
                    </td>
                    <td className="money">{money(ingredient.precoCompra)}</td>
                    <td>
                      {new Intl.NumberFormat("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      }).format(ingredient.custoUnitarioPadrao)}{" "}
                      / {ingredient.unidadePadrao}
                    </td>
                  </>
                )}
                {tab.key === "materiais" && (
                  <>
                    <td>
                      <strong>{material.nome}</strong>
                    </td>
                    <td className="money">{money(material.custo)}</td>
                  </>
                )}
                <td>
                  <div className="row-actions">
                    {tab.key === "receitas" && (
                      <button
                        className="icon-button"
                        aria-label={`Ver receita ${recipe.titulo}`}
                        onClick={() => setPrintRecipe(record as Recipe)}
                      >
                        <Printer size={16} />
                      </button>
                    )}
                    <Actions
                      kind={tab.kind}
                      collection={tab.key}
                      record={record}
                      name={
                        "nome" in record
                          ? record.nome
                          : "titulo" in record
                            ? record.titulo
                            : "cadastro"
                      }
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination
          total={list.filtered.length}
          page={list.page}
          setPage={list.setPage}
        />
      </section>
      {printRecipe && (
        <Modal title="Ficha da receita" onClose={() => setPrintRecipe(null)}>
          <article className="print-recipe">
            <span className="eyebrow">Lá Divino Sabor</span>
            <h2>{printRecipe.titulo}</h2>
            <p>
              Rendimento: {printRecipe.rendimento} unidades · Custo por unidade:{" "}
              {money(printRecipe.custoPorUnidade)}
            </p>
            <Table headings={["Ingrediente", "Quantidade", "Custo"]}>
              {printRecipe.ingredientes.map((i, n) => (
                <tr key={n}>
                  <td>
                    {data.ingredientes.find((x) => x.id === i.ingredienteId)
                      ?.nome || "Ingrediente não encontrado"}
                  </td>
                  <td>
                    {i.quantidade} {i.unidadeUso}
                  </td>
                  <td>{money(i.custo)}</td>
                </tr>
              ))}
            </Table>
            <p>
              <strong>Custo total: {money(printRecipe.custoTotal)}</strong>
            </p>
          </article>
          <footer className="modal-footer">
            <Button variant="secondary" onClick={() => setPrintRecipe(null)}>
              Fechar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer size={16} /> Imprimir
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}

export function Charges() {
  const { data, canWrite, save, notify, busy } = useBusiness();
  const debtors = data.clientes
    .map((customer) => ({ customer, ...customerTotals(data, customer) }))
    .filter((c) => c.pending > 0);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [payment, setPayment] = useState<{
    customer: Customer;
    total: number;
    changes: Mutation[];
  } | null>(null);
  const [type, setType] = useState("amigavel");
  const list = useListing(debtors, (d) => d.customer.nome);
  const message = selected
    ? chargeMessage(selected.nome, customerTotals(data, selected).pending, type)
    : "";
  function openSettlement(customer: Customer) {
    const changes: Mutation[] = [
      ...data.vendas
        .filter((s) => customerMatches(s, customer) && s.status === "P")
        .map((s) => ({
          collection: "vendas" as const,
          id: s.id,
          expectedUpdatedAt: versionOf(s),
          data: { status: "A" },
        })),
      ...data.encomendas
        .filter((o) => customerMatches(o, customer) && orderRemaining(o) > 0)
        .map((o) => ({
          collection: "encomendas" as const,
          id: o.id,
          expectedUpdatedAt: versionOf(o),
          data: { status: "Finalizado", valorEntrada: o.valorTotal },
        })),
    ];
    setPayment({
      customer,
      total: customerTotals(data, customer).pending,
      changes,
    });
  }
  const settle = async () => {
    if (!payment) return;
    try {
      await save(
        payment.changes,
        `Pendências de ${payment.customer.nome} quitadas`,
      );
      setPayment(null);
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  async function contact(customers: Customer[]) {
    try {
      await save(
        customers.map((c) => ({
          collection: "cobrancas",
          data: {
            clienteNome: c.nome,
            clienteId: c.id,
            tipo: customers.length > 1 ? "Lembrete em massa" : type,
            data: new Date(),
          },
        })),
        "Contato de cobrança registrado",
      );
      setSelected(null);
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  return (
    <>
      <div className="metric-grid two">
        <Metric
          title="Total em aberto"
          value={debtors.reduce((n, c) => n + c.pending, 0)}
          detail="Todos os períodos"
          accent
        />
        <section className="metric">
          <span>Clientes com pendências</span>
          <strong>{debtors.length}</strong>
          <small>Vendas e encomendas</small>
        </section>
      </div>
      <div className="section-tools">
        {list.searchInput}
        <div className="grow" />
        {canWrite && debtors.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => void contact(debtors.map((d) => d.customer))}
          >
            Registrar contato com todos
          </Button>
        )}
      </div>
      <section className="panel">
        <Table
          headings={[
            "Cliente",
            "Contato",
            "Em aberto",
            "Último contato",
            "Ações",
          ]}
          empty={!list.rows.length}
        >
          {list.rows.map(({ customer, pending }) => {
            const last = data.cobrancas
              .filter((c) => customerMatches(c, customer))
              .sort(
                (a, b) =>
                  new Date(dateValue(b.data)).getTime() -
                  new Date(dateValue(a.data)).getTime(),
              )[0];
            return (
              <tr key={customer.id}>
                <td>
                  <strong>{customer.nome}</strong>
                </td>
                <td>{customer.contato || "—"}</td>
                <td className="money">{money(pending)}</td>
                <td>{last ? dateText(last.data) : "Ainda não registrado"}</td>
                <td>
                  <div className="row-actions">
                    <Button
                      variant="ghost"
                      onClick={() => setSelected(customer)}
                    >
                      Mensagem
                    </Button>
                    {canWrite && (
                      <Button
                        variant="secondary"
                        onClick={() => openSettlement(customer)}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination
          total={list.filtered.length}
          page={list.page}
          setPage={list.setPage}
        />
      </section>
      <PendingItems />
      {selected && (
        <Modal
          title="Mensagem de cobrança"
          subtitle={selected.nome}
          onClose={() => setSelected(null)}
          busy={busy}
        >
          <Field label="Tom da mensagem">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="amigavel">Amigável</option>
              <option value="lembrete">Lembrete</option>
              <option value="urgente">Urgente</option>
            </select>
          </Field>
          <textarea
            aria-label="Texto da mensagem"
            rows={6}
            value={message}
            readOnly
          />
          <p className="form-note">
            Confira o saldo antes de enviar. O WhatsApp abre com o texto; o
            envio é feito por você.
          </p>
          <div className="message-actions">
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(message)
                  .then(() => notify("Mensagem copiada."))
                  .catch(() =>
                    notify("Selecione o texto e copie manualmente.", true),
                  );
              }}
            >
              <ClipboardCopy size={16} /> Copiar
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const digits = selected.contato.replace(/\D/g, "");
                const phone =
                  digits.length === 10 || digits.length === 11
                    ? `55${digits}`
                    : digits;
                if (!/^55\d{10,11}$/.test(phone)) {
                  notify(
                    "Cadastre um telefone brasileiro válido com DDD.",
                    true,
                  );
                  return;
                }
                window.open(
                  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <ExternalLink size={16} /> Abrir WhatsApp
            </Button>
          </div>
          {canWrite && (
            <footer className="modal-footer">
              <Button disabled={busy} onClick={() => void contact([selected])}>
                Registrar contato realizado
              </Button>
            </footer>
          )}
        </Modal>
      )}
      {payment && (
        <Modal
          title="Confirmar recebimento"
          onClose={() => setPayment(null)}
          busy={busy}
        >
          <p>
            Você confirma que recebeu <strong>{money(payment.total)}</strong> de{" "}
            <strong>{payment.customer.nome}</strong>?
          </p>
          <p className="form-note">
            Todas as vendas e encomendas em aberto deste cliente serão marcadas
            como quitadas.
          </p>
          <footer className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setPayment(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button onClick={() => void settle()} disabled={!canWrite}>
              {busy ? "Confirmando…" : "Confirmar recebimento"}
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
function dateValue(value: import("./types").DateValue) {
  return value
    ? typeof value === "string"
      ? value
      : value instanceof Date
        ? value.toISOString()
        : value.toDate().toISOString()
    : "";
}

function PendingItems() {
  const { data, canWrite, busy, save, notify } = useBusiness();
  const [selected, setSelected] = useState<{
    name: string;
    amount: number;
    change: Mutation;
  } | null>(null);
  const pending = [
    ...data.vendas
      .filter((s) => s.status === "P")
      .map((s) => ({
        key: `sale-${s.id}`,
        name: s.pessoa,
        description: `${s.quantidade} × ${s.produto}`,
        date: s.data,
        amount: saleTotal(s),
        type: "Venda",
        change: {
          collection: "vendas" as const,
          id: s.id,
          expectedUpdatedAt: versionOf(s),
          data: { status: "A" },
        },
      })),
    ...data.encomendas
      .filter((o) => orderRemaining(o) > 0)
      .map((o) => ({
        key: `order-${o.id}`,
        name: o.clienteNome,
        description: o.produtoDescricao,
        date: o.dataEntrega,
        amount: orderRemaining(o),
        type: "Encomenda",
        change: {
          collection: "encomendas" as const,
          id: o.id,
          expectedUpdatedAt: versionOf(o),
          data: { status: "Finalizado", valorEntrada: o.valorTotal },
        },
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const listing = useListing(pending, (p) => `${p.name} ${p.description}`);
  return (
    <section className="panel report-detail">
      <div className="panel-header">
        <div>
          <h2>Pendências por lançamento</h2>
          <p className="form-note">
            A referência é a data da venda ou da entrega; não há vencimento de
            cobrança cadastrado.
          </p>
        </div>
      </div>
      <Table
        headings={[
          "Data de referência",
          "Cliente / descrição",
          "Tipo",
          "Em aberto",
          "Ação",
        ]}
        empty={!listing.rows.length}
      >
        {listing.rows.map((p) => (
          <tr key={p.key}>
            <td>
              {dateText(p.date)}
              {p.date < today() && (
                <small>
                  Há{" "}
                  {Math.floor(
                    (new Date(`${today()}T12:00:00`).getTime() -
                      new Date(`${p.date}T12:00:00`).getTime()) /
                      86400000,
                  )}{" "}
                  dias
                </small>
              )}
            </td>
            <td>
              <strong>{p.name}</strong>
              <small>{p.description}</small>
            </td>
            <td>
              <Badge>{p.type}</Badge>
            </td>
            <td className="money">{money(p.amount)}</td>
            <td>
              {canWrite && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setSelected({
                      name: p.name,
                      amount: p.amount,
                      change: p.change,
                    })
                  }
                >
                  Baixar lançamento
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination
        total={listing.filtered.length}
        page={listing.page}
        setPage={listing.setPage}
      />
      {selected && (
        <Modal
          title="Confirmar recebimento do lançamento"
          onClose={() => setSelected(null)}
          busy={busy}
        >
          <p>
            Confirma o recebimento de <strong>{money(selected.amount)}</strong>{" "}
            de {selected.name}?
          </p>
          <footer className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setSelected(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              disabled={!canWrite}
              onClick={() => {
                void save([selected.change], `Recebimento de ${selected.name}`)
                  .then(() => setSelected(null))
                  .catch((e) => notify((e as Error).message, true));
              }}
            >
              {busy ? "Confirmando…" : "Confirmar recebimento"}
            </Button>
          </footer>
        </Modal>
      )}
    </section>
  );
}

export function Reports() {
  const { data, period } = useBusiness();
  const [start, setStart] = useState(
    period.length === 7 ? `${period}-01` : `${today().slice(0, 7)}-01`,
  );
  const [end, setEnd] = useState(today());
  const [customer, setCustomer] = useState("");
  const [method, setMethod] = useState("");
  const rows = data.vendas
    .filter(
      (s) =>
        (!start || s.data >= start) &&
        (!end || s.data <= end) &&
        (!customer ||
          customerMatches(s, data.clientes.find((c) => c.id === customer)!)) &&
        (!method || s.pagamento === method),
    )
    .sort((a, b) => a.data.localeCompare(b.data));
  const total = rows.reduce((n, s) => n + saleTotal(s), 0);
  const customers = new Set(
    rows.map(
      (s) =>
        data.clientes.find((c) => customerMatches(s, c))?.id ||
        s.clienteId ||
        s.pessoa,
    ),
  ).size;
  const productName = (s: Sale) =>
    data.produtos.find((p) =>
      s.produtoId
        ? p.id === s.produtoId
        : [p.nome, ...(p.nomesAnteriores || [])].includes(s.produto),
    )?.nome || s.produto;
  const byProduct = new Map<string, number>();
  rows.forEach((s) =>
    byProduct.set(
      productName(s),
      (byProduct.get(productName(s)) || 0) + s.quantidade,
    ),
  );
  const best = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0];
  const byCustomer = new Map<
    string,
    { name: string; quantity: number; total: number }
  >();
  rows.forEach((s) => {
    const match = data.clientes.find((c) => customerMatches(s, c));
    const key = match?.id || s.pessoa;
    const group = byCustomer.get(key) || {
      name: match?.nome || s.pessoa,
      quantity: 0,
      total: 0,
    };
    group.quantity += s.quantidade;
    group.total += saleTotal(s);
    byCustomer.set(key, group);
  });
  const details = new Map<
    string,
    { customer: string; product: string; quantity: number; total: number }
  >();
  rows.forEach((s) => {
    const customer = data.clientes.find((c) => customerMatches(s, c));
    const product = productName(s);
    const key = `${customer?.id || s.pessoa}::${product}`;
    const group = details.get(key) || {
      customer: customer?.nome || s.pessoa,
      product,
      quantity: 0,
      total: 0,
    };
    group.quantity += s.quantidade;
    group.total += saleTotal(s);
    details.set(key, group);
  });
  const invalidRange = !!start && !!end && start > end;
  function exportCSV() {
    DownloadFile(
      csv([
        [
          "Data",
          "Cliente",
          "Produto",
          "Quantidade",
          "Preço unitário",
          "Total",
          "Pagamento",
          "Situação",
        ],
        ...rows.map((s) => [
          s.data,
          s.pessoa,
          s.produto,
          s.quantidade,
          s.valor,
          saleTotal(s),
          s.pagamento,
          s.status,
        ]),
      ]),
      `Vendas_${today()}.csv`,
      "text/csv;charset=utf-8",
    );
  }
  return (
    <>
      <div className="report-filters section-tools">
        <Field label="De">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="Até">
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
        <Field label="Cliente">
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          >
            <option value="">Todos os clientes</option>
            {data.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pagamento">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">Todas as formas</option>
            {["PIX", "Dinheiro", "Cartão", "Transferência"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <div className="grow" />
        <Button
          variant="secondary"
          disabled={invalidRange || !rows.length}
          onClick={exportCSV}
        >
          <ArrowDownToLine size={16} /> CSV
        </Button>
        <Button
          disabled={invalidRange || !rows.length}
          onClick={() => window.print()}
        >
          <Printer size={16} /> Imprimir
        </Button>
      </div>
      {invalidRange ? (
        <p role="alert" className="form-error">
          A data inicial deve ser anterior à data final.
        </p>
      ) : (
        <article className="report-content">
          <div className="print-only">
            <h1>Lá Divino Sabor · Relatório de vendas</h1>
            <p>
              {dateText(start)} a {dateText(end)}
            </p>
          </div>
          <div className="metric-grid report-metrics">
            <Metric
              title="Vendas no intervalo"
              value={total}
              detail={`${rows.length} registros de venda`}
            />
            <Metric
              title="Média por cliente"
              value={customers ? total / customers : 0}
              detail="Total dividido pelos clientes"
            />
            <Metric
              title="Média por venda"
              value={rows.length ? total / rows.length : 0}
              detail="Total dividido pelos registros"
            />
            <section className="metric">
              <span>Clientes atendidos</span>
              <strong>{customers}</strong>
              <small>
                {rows.reduce((n, s) => n + s.quantidade, 0)} unidades vendidas
              </small>
            </section>
            <section className="metric">
              <span>Produto mais vendido</span>
              <strong className="product-highlight">{best?.[0] || "—"}</strong>
              <small>
                {best ? `${best[1]} unidades` : "Sem vendas no intervalo"}
              </small>
            </section>
          </div>
          <p className="page-note">
            Relatório de vendas avulsas, incluindo pendentes. Encomendas são
            acompanhadas na agenda e no financeiro.
          </p>
          <section className="panel">
            <div className="panel-header">
              <h2>Resumo por cliente</h2>
            </div>
            <Table
              headings={["Cliente", "Unidades", "Total"]}
              empty={!rows.length}
            >
              {[...byCustomer.values()].map((c) => (
                <tr key={c.name}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.quantity}</td>
                  <td className="money">{money(c.total)}</td>
                </tr>
              ))}
            </Table>
          </section>
          <section className="panel report-detail">
            <div className="panel-header">
              <h2>Produtos por cliente</h2>
            </div>
            <Table
              headings={["Cliente", "Produto", "Unidades", "Total"]}
              empty={!rows.length}
            >
              {[...details.entries()].map(([key, item]) => (
                <tr key={key}>
                  <td>{item.customer}</td>
                  <td>{item.product}</td>
                  <td>{item.quantity}</td>
                  <td className="money">{money(item.total)}</td>
                </tr>
              ))}
            </Table>
          </section>
          <section className="panel report-detail">
            <div className="panel-header">
              <h2>Vendas no intervalo</h2>
            </div>
            <Table
              headings={[
                "Data",
                "Cliente",
                "Produto",
                "Qtd.",
                "Total",
                "Situação",
              ]}
              empty={!rows.length}
            >
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>{dateText(s.data)}</td>
                  <td>{s.pessoa}</td>
                  <td>{s.produto}</td>
                  <td>{s.quantidade}</td>
                  <td>{money(saleTotal(s))}</td>
                  <td>{s.status === "P" ? "Pendente" : "Pago"}</td>
                </tr>
              ))}
            </Table>
          </section>
        </article>
      )}
    </>
  );
}
