import { Fragment, useRef, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
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
  Expense,
  Mutation,
  Order,
  Recipe,
  Sale,
  Supplier,
} from "./types";
import {
  buildPartialPaymentMutations,
  chargeMessage,
  collectPendingLaunches,
  compareTextPtBr,
  csv,
  customerMatches,
  customerTotals,
  dateText,
  expenseMatchesSupplierFilter,
  finances,
  formatStock,
  groupOrders,
  groupSales,
  invoiceItemAddsToStock,
  isArchivableCollection,
  isLowStock,
  money,
  orderReceived,
  orderRemaining,
  productCost,
  resolveExpenseSupplier,
  round,
  saleReceived,
  saleRemaining,
  saleTotal,
  sortByTextPtBr,
  summarizeOrderItems,
  today,
  versionOf,
} from "./domain";
import type { PendingLaunch, SaleGroup } from "./domain";
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

const saleStatus = (s: Sale) => {
  const rec = saleReceived(s);
  const rem = saleRemaining(s);
  if (s.status === "P" && rec > 0 && rem > 0) {
    return <Badge tone="warning">Parcial</Badge>;
  }
  return s.status === "P" ? (
    <Badge tone="warning">Pendente</Badge>
  ) : (
    <Badge tone="good">{s.status === "E" ? "Entregue e pago" : "Pago"}</Badge>
  );
};
const saleGroupStatus = (g: SaleGroup) => {
  if (g.statusSummary === "Parcial") return <Badge tone="warning">Parcial</Badge>;
  if (g.statusSummary === "P") return <Badge tone="warning">Pendente</Badge>;
  if (g.statusSummary === "Misto") return <Badge tone="neutral">Misto</Badge>;
  return (
    <Badge tone="good">
      {g.statusSummary === "E" ? "Entregue e pago" : "Pago"}
    </Badge>
  );
};
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
  const archive = isArchivableCollection(collection);
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
  const recent = groupSales(data.vendas, data.clientes).slice(0, 5);
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
              {recent.map((g) => (
                <li key={g.key}>
                  <div>
                    <strong>{g.clienteNome}</strong>
                    <small>
                      {g.items.length > 1
                        ? g.isMultiProduct
                          ? `${g.distinctProductCount} produtos (${g.totalUnits} un.)`
                          : `${g.totalUnits} × ${g.items[0].produto}`
                        : `${g.items[0].quantidade} × ${g.items[0].produto}`}
                    </small>
                  </div>
                  <div className="align-right">
                    <strong>{money(g.total)}</strong>
                    {saleGroupStatus(g)}
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
  const formatted = money(value);
  return (
    <section className={`metric ${accent ? "accent" : ""}`}>
      <span>{title}</span>
      <strong className={formatted.length > 14 ? "long-amount" : undefined}>{formatted}</strong>
      <small>{detail}</small>
    </section>
  );
}

export function Sales() {
  const { data, period, canWrite, edit, save, notify } = useBusiness();
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [payment, setPayment] = useState<Sale | null>(null);
  const filteredSales = data.vendas.filter(
    (s) =>
      (!period || s.data.startsWith(period)) &&
      (!status || s.status === status),
  );
  const grouped = groupSales(filteredSales, data.clientes);
  const list = useListing(
    grouped,
    (g) =>
      `${g.clienteNome} ${g.pagamento} ${g.items.map((s) => `${s.produto} ${s.pessoa}`).join(" ")}`,
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
          {list.rows.map((g) => {
            const single = g.items.length === 1 ? g.items[0] : null;
            const isOpen = !!expanded[g.key];
            return (
              <Fragment key={g.key}>
                <tr>
                  <td>{dateText(g.data)}</td>
                  <td>
                    <div className="inline-title">
                      <strong>{g.clienteNome}</strong>
                      {g.isMultiProduct && (
                        <Badge tone="neutral">
                          {g.distinctProductCount} produtos
                        </Badge>
                      )}
                    </div>
                    <small>
                      {single
                        ? single.produto
                        : g.items
                            .map((i) => `${i.quantidade} × ${i.produto}`)
                            .join(" · ")}
                    </small>
                    {g.remaining > 0 && g.received > 0 && (
                      <small className="muted">
                        Recebido: {money(g.received)} · Saldo:{" "}
                        {money(g.remaining)}
                      </small>
                    )}
                  </td>
                  <td>{g.totalUnits}</td>
                  <td className="money">{money(g.total)}</td>
                  <td>{g.pagamento}</td>
                  <td>{saleGroupStatus(g)}</td>
                  <td>
                    <div className="row-actions">
                      {!single && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              [g.key]: !prev[g.key],
                            }))
                          }
                        >
                          <Eye size={15} />{" "}
                          {isOpen ? "Ocultar" : "Ver detalhes"}
                        </Button>
                      )}
                      {single && canWrite && (
                        <button
                          className="icon-button"
                          aria-label={`Atualizar situação da venda de ${single.pessoa}`}
                          onClick={() => setPayment(single)}
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {single && (
                        <Actions
                          collection="vendas"
                          record={single}
                          name={`venda de ${single.pessoa}`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
                {!single && isOpen && (
                  <tr className="detail-row">
                    <td colSpan={7}>
                      <div className="detail-box">
                        <div className="detail-box-head">
                          <strong>Itens deste pedido ({g.items.length})</strong>
                          <span>Pedido #{g.pedidoId?.slice(-6)}</span>
                        </div>
                        <ul className="detail-items">
                          {g.items.map((item) => (
                            <li key={item.id} className="detail-item">
                              <div className="detail-item-main">
                                <strong>
                                  {item.quantidade} × {item.produto}
                                </strong>
                                <small>
                                  Unit.: {money(item.valor)} · Total:{" "}
                                  {money(saleTotal(item))} · {item.pagamento}
                                  {saleReceived(item) > 0 &&
                                  saleRemaining(item) > 0
                                    ? ` · Recebido ${money(saleReceived(item))}`
                                    : ""}
                                </small>
                              </div>
                              <div className="row-actions">
                                {saleStatus(item)}
                                {canWrite && (
                                  <button
                                    className="icon-button"
                                    aria-label={`Atualizar situação da venda de ${item.pessoa}`}
                                    onClick={() => setPayment(item)}
                                  >
                                    <Check size={16} />
                                  </button>
                                )}
                                <Actions
                                  collection="vendas"
                                  record={item}
                                  name={`venda de ${item.pessoa}`}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
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
          save={async (nextStatus) => {
            try {
              const total = saleTotal(payment);
              const rem = saleRemaining(payment);
              const mutations: Mutation[] = [
                {
                  collection: "vendas",
                  id: payment.id,
                  data: {
                    status: nextStatus,
                    ...(nextStatus !== "P"
                      ? { valorPago: total }
                      : { valorPago: Math.min(total, payment.valorPago || 0) }),
                  },
                  expectedUpdatedAt: versionOf(payment),
                },
              ];
              if (nextStatus !== "P" && rem > 0) {
                mutations.push({
                  collection: "recebimentos",
                  data: {
                    data: today(),
                    valor: rem,
                    origemTipo: "venda",
                    origemId: payment.id,
                    vendaIds: [payment.id],
                    clienteId: payment.clienteId || "",
                    clienteNome: payment.pessoa,
                    descricao: `${payment.quantidade} × ${payment.produto}`,
                    pagamento: payment.pagamento || "PIX",
                    tipoBaixa: "manual",
                  },
                });
              }
              await save(
                mutations,
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
  const rem = saleRemaining(sale);
  const rec = saleReceived(sale);
  return (
    <Modal title="Situação da venda" onClose={close} busy={busy}>
      <p>
        {sale.pessoa} · {sale.quantidade} × {sale.produto} ·{" "}
        {money(saleTotal(sale))}
      </p>
      {rec > 0 && rem > 0 && (
        <p className="form-note">
          Já recebido: <strong>{money(rec)}</strong> · Em aberto:{" "}
          <strong>{money(rem)}</strong>. Para registrar outro pagamento parcial
          com data, use <strong>Cobranças &gt; Baixar lançamento</strong>.
        </p>
      )}
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
        Selecione pago somente após confirmar o recebimento total.
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
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const filteredOrders = data.encomendas.filter(
    (o) => !status || o.status === status,
  );
  const grouped = groupOrders(filteredOrders, data.clientes, sortDir);
  const orderSummary = (o: Order) =>
    o.itens && o.itens.length > 0
      ? summarizeOrderItems(o.itens, o.acessorios || [], o.observacoes)
      : o.produtoDescricao;
  const list = useListing(grouped, (g) =>
    `${g.clienteNome} ${g.orders.map((o) => `${o.produtoDescricao} ${o.observacoes || ""}`).join(" ")}`,
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
        <Button
          variant="ghost"
          aria-label="Alternar ordenação da entrega"
          onClick={() => {
            setSortDir((d) => (d === "desc" ? "asc" : "desc"));
            list.setPage(1);
          }}
        >
          <ArrowUpDown size={16} />{" "}
          {sortDir === "desc"
            ? "Entrega: Mais recentes"
            : "Entrega: Mais antigas"}
        </Button>
        <div className="grow" />
        {canWrite && (
          <Button onClick={() => edit("order")}>
            <Plus size={18} /> Nova encomenda
          </Button>
        )}
      </div>
      <p className="page-note">
        A agenda mostra todas as entregas (mais recentes primeiro por padrão),
        incluindo as que estão fora do período do painel.
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
          {list.rows.map((g) => {
            const single = g.orders.length === 1 ? g.orders[0] : null;
            const isOpen = !!expanded[g.key];
            const overdue =
              g.dataEntrega < today() &&
              g.orders.some((o) => o.status !== "Finalizado");
            const hasDetails =
              !single ||
              !!(single.itens && single.itens.length > 0) ||
              !!(single.acessorios && single.acessorios.length > 0) ||
              !!single.observacoes;
            return (
              <Fragment key={g.key}>
                <tr>
                  <td className={overdue ? "danger-text" : ""}>
                    {dateText(g.dataEntrega)}
                  </td>
                  <td>
                    <div className="inline-title">
                      <strong>{g.clienteNome}</strong>
                      {g.orders.length > 1 && (
                        <Badge tone="neutral">
                          {g.orders.length} encomendas
                        </Badge>
                      )}
                    </div>
                    <small>
                      {single
                        ? orderSummary(single)
                        : g.orders
                            .map((o) => orderSummary(o))
                            .join(" · ")}
                    </small>
                  </td>
                  <td className="money">{money(g.total)}</td>
                  <td className="money">{money(g.received)}</td>
                  <td className="money">{money(g.remaining)}</td>
                  <td>
                    {single ? (
                      orderStatus(single)
                    ) : g.mixedStatus ? (
                      <Badge tone="warning">Situações diferentes</Badge>
                    ) : (
                      orderStatus(g.orders[0])
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {hasDetails && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              [g.key]: !prev[g.key],
                            }))
                          }
                        >
                          {isOpen ? (
                            <ChevronDown size={15} />
                          ) : (
                            <Eye size={15} />
                          )}{" "}
                          {isOpen ? "Ocultar" : "Ver detalhes"}
                        </Button>
                      )}
                      {single && (
                        <Actions
                          kind="order"
                          collection="encomendas"
                          record={single}
                          name={`encomenda de ${single.clienteNome}`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="detail-row">
                    <td colSpan={7}>
                      <div className="detail-box">
                        <ul className="detail-items">
                          {g.orders.map((o) => (
                            <li key={o.id} className="detail-item">
                              <div className="detail-item-main">
                                <div className="inline-title">
                                  <strong>{orderSummary(o)}</strong>
                                  {orderStatus(o)}
                                </div>
                                {o.itens && o.itens.length > 0 && (
                                  <small>
                                    Produtos:{" "}
                                    {o.itens
                                      .map(
                                        (it) =>
                                          `${it.quantidade} × ${it.produtoNome} (${money(it.subtotal)})`,
                                      )
                                      .join(", ")}
                                  </small>
                                )}
                                {o.acessorios && o.acessorios.length > 0 && (
                                  <small>
                                    Acessórios:{" "}
                                    {o.acessorios
                                      .map(
                                        (ac) =>
                                          `${ac.quantidade} × ${ac.descricao} (${ac.cobradoCliente ? `cobrado ${money(ac.subtotal)}` : "incluso/interno"})`,
                                      )
                                      .join(", ")}
                                  </small>
                                )}
                                {o.observacoes && (
                                  <small>Obs.: {o.observacoes}</small>
                                )}
                                <small>
                                  Total: {money(o.valorTotal)} · Recebido:{" "}
                                  {money(orderReceived(o))} · A receber:{" "}
                                  {money(orderRemaining(o))}
                                </small>
                              </div>
                              <Actions
                                kind="order"
                                collection="encomendas"
                                record={o}
                                name={`encomenda de ${o.clienteNome}`}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
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
  const [entryKind, setEntryKind] = useState<"" | "invoice" | "expense">("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Expense | null>(null);
  const f = finances(data, period);
  const suppliers = data.fornecedores || [];
  const sortedSuppliers = sortByTextPtBr(
    suppliers,
    (s) => s.nome,
    (s) => s.id,
  );
  const filteredExpenses = f.expenses
    .filter((e) => !type || e.tipo === type)
    .filter((e) =>
      !entryKind
        ? true
        : entryKind === "invoice"
          ? !!e.isNotaFiscal
          : !e.isNotaFiscal,
    )
    .filter((e) => expenseMatchesSupplierFilter(e, supplierFilter))
    .sort((a, b) => {
      const dateCmp =
        sortDir === "desc"
          ? b.data.localeCompare(a.data)
          : a.data.localeCompare(b.data);
      if (dateCmp !== 0) return dateCmp;
      return compareTextPtBr(a.descricao, b.descricao) || a.id.localeCompare(b.id);
    });
  const list = useListing(filteredExpenses, (e) => {
    const sup = resolveExpenseSupplier(e, suppliers);
    const itemsText = (e.itensNota || []).map((i) => i.itemNome).join(" ");
    return `${e.descricao} ${e.tipo} ${sup.searchableText} ${e.numeroNota || ""} ${e.observacoes || ""} ${itemsText}`;
  });
  return (
    <>
      <div className="metric-grid">
        <Metric
          title="Já recebido"
          value={f.received}
          detail="Vendas, entradas e recebimentos"
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
        incluídas nos lançamentos. Recebimentos parciais ou totais registrados
        com data aparecem conforme a data real do pagamento.
      </p>
      <div className="section-tools">
        {list.searchInput}
        <select
          aria-label="Filtrar tipo de lançamento"
          value={entryKind}
          onChange={(e) => {
            setEntryKind(e.target.value as "" | "invoice" | "expense");
            list.setPage(1);
          }}
        >
          <option value="">Todos os lançamentos</option>
          <option value="invoice">Somente notas fiscais</option>
          <option value="expense">Somente despesas simples</option>
        </select>
        <select
          aria-label="Filtrar fornecedor"
          value={supplierFilter}
          onChange={(e) => {
            setSupplierFilter(e.target.value);
            list.setPage(1);
          }}
        >
          <option value="">Todos os fornecedores</option>
          <option value="__sem_vinculo__">Notas sem fornecedor vinculado</option>
          {sortedSuppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
              {s.arquivado ? " (arquivado)" : ""}
            </option>
          ))}
        </select>
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
        <Button
          variant="ghost"
          aria-label="Alternar ordenação financeira"
          onClick={() => {
            setSortDir((d) => (d === "desc" ? "asc" : "desc"));
            list.setPage(1);
          }}
        >
          <ArrowUpDown size={16} />{" "}
          {sortDir === "desc" ? "Data: Mais recentes" : "Data: Mais antigas"}
        </Button>
        <div className="grow" />
        {canWrite && (
          <div className="row-actions">
            <Button variant="secondary" onClick={() => edit("expense")}>
              <Plus size={18} /> Registrar despesa
            </Button>
            <Button onClick={() => edit("invoice")}>
              <FileText size={18} /> Registrar nota fiscal
            </Button>
          </div>
        )}
      </div>
      <section className="panel">
        <Table
          headings={[
            "Data",
            "Lançamento / fornecedor",
            "Categoria",
            "Quantidade / itens",
            "Total",
            "Ações",
          ]}
          empty={!list.rows.length}
        >
          {list.rows.map((e) => {
            const sup = resolveExpenseSupplier(e, suppliers);
            const itemCount = e.itensNota?.length || 0;
            const isOpen = !!expanded[e.id];
            const hasInvoiceItems = !!e.isNotaFiscal;
            const actionName = e.isNotaFiscal
              ? [sup.displayName || e.descricao, e.numeroNota ? `NF ${e.numeroNota}` : ""]
                  .filter(Boolean)
                  .join(" · ")
              : e.descricao;
            return (
              <Fragment key={e.id}>
                <tr>
                  <td>{dateText(e.data)}</td>
                  <td>
                    {e.isNotaFiscal ? (
                      <>
                        <div className="inline-title">
                          <strong>{sup.displayName || "Fornecedor não informado"}</strong>
                          <Badge tone="neutral">Nota fiscal</Badge>
                          {e.itensNota?.some((i) => invoiceItemAddsToStock(i)) && (
                            <Badge tone="good">Estoque +</Badge>
                          )}
                          {sup.isLegacyUnlinked && (
                            <Badge tone="warning">Sem vínculo</Badge>
                          )}
                        </div>
                        <small>
                          {[
                            e.numeroNota ? `NF ${e.numeroNota}` : "",
                            sup.renamedTo ? `Cadastro atual: ${sup.renamedTo}` : "",
                            sup.linked?.arquivado ? "Fornecedor arquivado" : "",
                            e.observacoes || "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Nota fiscal"}
                        </small>
                      </>
                    ) : (
                      <>
                        <div className="inline-title">
                          <strong>{e.descricao}</strong>
                          <Badge tone="neutral">Despesa simples</Badge>
                          {e.entradaEstoque && (
                            <Badge tone="good">Estoque +</Badge>
                          )}
                        </div>
                        {(sup.displayName || e.numeroNota) && (
                          <small>
                            {[
                              sup.displayName,
                              e.numeroNota ? `NF ${e.numeroNota}` : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    <Badge>{e.tipo}</Badge>
                  </td>
                  <td>
                    {e.isNotaFiscal
                      ? `${itemCount} ${itemCount === 1 ? "item" : "itens"}`
                      : e.quantidade || "—"}
                  </td>
                  <td className="money">{money(e.valor)}</td>
                  <td>
                    <div className="row-actions">
                      {hasInvoiceItems ? (
                        <Button
                          variant="ghost"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              [e.id]: !prev[e.id],
                            }))
                          }
                        >
                          {isOpen ? <ChevronDown size={15} /> : <Eye size={15} />}{" "}
                          {isOpen ? "Ocultar itens" : "Exibir itens"}
                        </Button>
                      ) : (
                        (e.entradaEstoque || e.observacoes) && (
                          <Button variant="ghost" onClick={() => setDetails(e)}>
                            <Eye size={15} /> Ver detalhes
                          </Button>
                        )
                      )}
                      <Actions
                        kind={e.isNotaFiscal ? "invoice" : "expense"}
                        collection="despesas"
                        record={e}
                        name={actionName}
                      />
                    </div>
                  </td>
                </tr>
                {hasInvoiceItems && isOpen && (
                  <tr className="detail-row">
                    <td colSpan={6}>
                      <div className="detail-box">
                        <div className="detail-box-head">
                          <strong>Itens da nota fiscal ({itemCount})</strong>
                          <span>
                            {[
                              sup.displayName,
                              e.numeroNota ? `NF ${e.numeroNota}` : "",
                              dateText(e.data),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        {e.itensNota && e.itensNota.length > 0 ? (
                          <div className="detail-table-scroll">
                            <table className="detail-items-table">
                              <thead>
                                <tr>
                                  <th>Produto</th>
                                  <th>Quantidade</th>
                                  <th className="money">Valor unitário</th>
                                  <th className="money">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {e.itensNota.map((item) => (
                                  <tr key={item.id}>
                                    <td>
                                      <strong>{item.itemNome}</strong>
                                      <small>
                                        {item.itemTipo === "ingrediente"
                                          ? "Ingrediente"
                                          : item.itemTipo === "material"
                                            ? "Material"
                                            : "Avulso"}
                                        {invoiceItemAddsToStock(item)
                                          ? " · Estoque +"
                                          : " · Sem estoque"}
                                      </small>
                                    </td>
                                    <td>
                                      {item.quantidade} {item.unidade}
                                    </td>
                                    <td className="money">
                                      {money(item.valorUnitario)}
                                    </td>
                                    <td className="money">
                                      {money(item.subtotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="form-note">
                            Nenhum item detalhado registrado nesta nota.
                          </p>
                        )}
                        <div className="detail-box-foot">
                          <span>
                            {e.observacoes ? `Obs.: ${e.observacoes}` : ""}
                          </span>
                          <strong>Total da nota: {money(e.valor)}</strong>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </Table>
        <Pagination
          total={list.filtered.length}
          page={list.page}
          setPage={list.setPage}
        />
      </section>
      {details && (
        <Modal
          title="Detalhes da despesa"
          subtitle={`${details.descricao} · ${dateText(details.data)}`}
          onClose={() => setDetails(null)}
        >
          <div className="detail-meta">
            <p>
              <strong>Categoria:</strong> {details.tipo} ·{" "}
              <strong>Total:</strong> {money(details.valor)}
            </p>
            {details.observacoes && (
              <p>
                <strong>Observações:</strong> {details.observacoes}
              </p>
            )}
          </div>
          {details.entradaEstoque && (
            <p className="form-note">
              Entrada vinculada ao estoque: {details.entradaEstoque.quantidade}{" "}
              {details.entradaEstoque.unidade} de{" "}
              <strong>{details.entradaEstoque.itemNome}</strong>.
            </p>
          )}
          <footer className="modal-footer">
            <Button variant="secondary" onClick={() => setDetails(null)}>
              Fechar
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
const catalogTabs = [
  { key: "clientes", title: "Clientes", kind: "customer" },
  { key: "produtos", title: "Produtos", kind: "product" },
  { key: "receitas", title: "Receitas", kind: "recipe" },
  { key: "ingredientes", title: "Ingredientes", kind: "ingredient" },
  { key: "materiais", title: "Materiais", kind: "material" },
  { key: "fornecedores", title: "Fornecedores", kind: "supplier" },
] as const;
export function Catalog() {
  const { data, canWrite, edit } = useBusiness();
  const [tab, setTab] = useState<(typeof catalogTabs)[number]>(catalogTabs[0]);
  const [printRecipe, setPrintRecipe] = useState<Recipe | null>(null);
  const [archived, setArchived] = useState(false);
  const sortedCatalog = sortByTextPtBr(
    data[tab.key].filter((r) => archived || !r.arquivado),
    (r) => ("nome" in r ? r.nome : "titulo" in r ? r.titulo : ""),
    (r) => r.id,
  );
  const list = useListing<Entity>(sortedCatalog, (r) => {
    if (tab.key === "fornecedores") {
      const sup = r as Supplier;
      return `${sup.nome} ${sup.nomeFantasia || ""} ${sup.documento || ""} ${sup.contato || ""} ${sup.email || ""}`;
    }
    return "nome" in r ? r.nome : "titulo" in r ? r.titulo : "";
  });
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
    fornecedores: [
      "Fornecedor",
      "CNPJ / CPF",
      "Contato",
      "Notas vinculadas",
      "Ações",
    ],
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
            onChange={(e) => {
              setArchived(e.target.checked);
              list.setPage(1);
            }}
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
                    : tab.kind === "material"
                      ? "material"
                      : "fornecedor"}
          </Button>
        )}
      </div>
      <section className="panel">
        <Table headings={head[tab.key]} empty={!list.rows.length}>
          {list.rows.map((record) => {
            const customer = record as Customer;
            const supplier = record as Supplier;
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
                {tab.key === "fornecedores" && (
                  <>
                    <td>
                      <strong>{supplier.nome}</strong>
                      <small>
                        {[supplier.nomeFantasia, supplier.email]
                          .filter(Boolean)
                          .join(" · ") || "Sem complemento"}
                      </small>
                    </td>
                    <td>{supplier.documento || "—"}</td>
                    <td>{supplier.contato || "—"}</td>
                    <td>
                      {
                        data.despesas.filter(
                          (e) => e.fornecedorId === supplier.id,
                        ).length
                      }
                    </td>
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
  const debtors = sortByTextPtBr(
    data.clientes
      .map((customer) => ({ customer, ...customerTotals(data, customer) }))
      .filter((c) => c.pending > 0),
    (c) => c.customer.nome,
    (c) => c.customer.id,
  );
  const [selected, setSelected] = useState<Customer | null>(null);
  const [payment, setPayment] = useState<{
    customer: Customer;
    total: number;
    saleCount: number;
    orderCount: number;
    changes: Mutation[];
  } | null>(null);
  const [type, setType] = useState("amigavel");
  const list = useListing(debtors, (d) => d.customer.nome);
  const message = selected
    ? chargeMessage(selected.nome, customerTotals(data, selected).pending, type)
    : "";
  function openSettlement(customer: Customer) {
    const launches = collectPendingLaunches(data).filter((l) =>
      l.kind === "sale"
        ? l.sales.some((s) => customerMatches(s, customer))
        : customerMatches(l.order, customer),
    );
    const batchId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const changes: Mutation[] = launches.flatMap((launch, idx) =>
      buildPartialPaymentMutations({
        launch,
        amount: launch.remainingAmount,
        date: today(),
        method: launch.pagamento || "PIX",
        receiptId: `rcpt_${batchId}_${idx}`,
        tipoBaixa: "quitacao_cliente",
      }),
    );
    setPayment({
      customer,
      total: round(launches.reduce((sum, l) => sum + l.remainingAmount, 0)),
      saleCount: launches.filter((l) => l.kind === "sale").length,
      orderCount: launches.filter((l) => l.kind === "order").length,
      changes,
    });
  }
  const settle = async () => {
    if (!payment || busy) return;
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
      <ReceiptHistory />
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
          title="Quitar todas as pendências do cliente"
          onClose={() => setPayment(null)}
          busy={busy}
        >
          <p>
            Você confirma o recebimento total de{" "}
            <strong>{money(payment.total)}</strong> de{" "}
            <strong>{payment.customer.nome}</strong>?
          </p>
          <p className="form-note">
            Esta ação quitará{" "}
            <strong>
              todos os lançamentos em aberto ({payment.saleCount} venda(s) e{" "}
              {payment.orderCount} encomenda(s))
            </strong>{" "}
            deste cliente, registrando o recebimento na data de hoje sem
            alterar a etapa de produção das encomendas.
          </p>
          <footer className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setPayment(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void settle()}
              disabled={!canWrite || busy || !payment.changes.length}
            >
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
  const [selected, setSelected] = useState<PendingLaunch | null>(null);
  const pending = collectPendingLaunches(data);
  const listing = useListing(pending, (p) => `${p.name} ${p.description}`);
  return (
    <section className="panel report-detail">
      <div className="panel-header">
        <div>
          <h2>Pendências por lançamento</h2>
          <p className="form-note">
            A referência é a data da venda ou da entrega. Use Baixar lançamento
            para pagamento parcial ou quitação integral.
          </p>
        </div>
      </div>
      <div className="section-tools">
        {listing.searchInput}
      </div>
      <Table
        headings={[
          "Data de referência",
          "Cliente / descrição",
          "Tipo",
          "Original / já recebido",
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
              <Badge>{p.kind === "sale" ? "Venda" : "Encomenda"}</Badge>
            </td>
            <td>
              <span>{money(p.originalAmount)}</span>
              {p.receivedAmount > 0 && (
                <small>Já recebido: {money(p.receivedAmount)}</small>
              )}
            </td>
            <td className="money">{money(p.remainingAmount)}</td>
            <td>
              {canWrite && (
                <Button
                  variant="secondary"
                  onClick={() => setSelected(p)}
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
        <PartialPaymentDialog
          launch={selected}
          busy={busy}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
          onSubmit={async (amount, date, method, receiptId) => {
            try {
              const mutations = buildPartialPaymentMutations({
                launch: selected,
                amount,
                date,
                method,
                receiptId,
              });
              await save(
                mutations,
                amount >= selected.remainingAmount
                  ? `Quitação de ${selected.name}`
                  : `Recebimento parcial de ${selected.name} (${money(amount)})`,
              );
              setSelected(null);
            } catch (e) {
              notify((e as Error).message, true);
              throw e;
            }
          }}
        />
      )}
    </section>
  );
}

function PartialPaymentDialog({
  launch,
  busy,
  canWrite,
  onClose,
  onSubmit,
}: {
  launch: PendingLaunch;
  busy: boolean;
  canWrite: boolean;
  onClose: () => void;
  onSubmit: (
    amount: number,
    date: string,
    method: string,
    receiptId: string,
  ) => Promise<void>;
}) {
  const [settleFull, setSettleFull] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState(launch.pagamento || "PIX");
  const [error, setError] = useState("");
  const lockRef = useRef(false);

  const displayedAmount = settleFull
    ? String(launch.remainingAmount)
    : manualAmount;

  async function submitValue(val: number) {
    if (lockRef.current || busy || !canWrite) return;
    setError("");
    lockRef.current = true;
    const receiptId = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await onSubmit(val, date, method, receiptId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lockRef.current = false;
    }
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (settleFull) {
      void submitValue(launch.remainingAmount);
      return;
    }
    if (!manualAmount.trim()) {
      setError("Informe o valor recebido ou marque Quitar saldo restante.");
      return;
    }
    void submitValue(Number(manualAmount));
  }

  const typed = settleFull ? launch.remainingAmount : Number(manualAmount);
  const projectedRemaining = settleFull
    ? 0
    : Number.isFinite(typed) && typed > 0
      ? Math.max(0, round(launch.remainingAmount - typed))
      : launch.remainingAmount;

  return (
    <Modal
      title="Baixar lançamento"
      subtitle={`${launch.name} · ${launch.kind === "sale" ? "Venda" : "Encomenda"}`}
      onClose={onClose}
      busy={busy}
    >
      <div className="detail-meta">
        <p>
          <strong>Cliente:</strong> {launch.name}
        </p>
        <p>
          <strong>Referência:</strong> {launch.description} (
          {dateText(launch.date)})
        </p>
      </div>
      <div className="form-summary">
        <div>
          <span>Valor original</span>
          <strong>{money(launch.originalAmount)}</strong>
        </div>
        <div>
          <span>Total já recebido</span>
          <strong>{money(launch.receivedAmount)}</strong>
        </div>
        <div>
          <span>Saldo pendente</span>
          <strong>{money(launch.remainingAmount)}</strong>
        </div>
      </div>
      <form onSubmit={handleConfirm} noValidate>
        <label className="checkbox settle-flag">
          <input
            type="checkbox"
            checked={settleFull}
            disabled={busy || !canWrite}
            onChange={(e) => {
              setSettleFull(e.target.checked);
              setError("");
            }}
          />
          Quitar saldo restante (pagamento total)
        </label>
        <div className="form-grid">
          <Field label="Valor recebido agora (R$) *">
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              max={launch.remainingAmount}
              placeholder="Ex.: 40,00"
              value={displayedAmount}
              readOnly={settleFull}
              aria-readonly={settleFull || undefined}
              onChange={(e) => {
                if (settleFull) return;
                setManualAmount(e.target.value);
                setError("");
              }}
            />
          </Field>
          <Field label="Data do recebimento *">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError("");
              }}
            />
          </Field>
          <Field label="Forma de pagamento">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {["PIX", "Dinheiro", "Cartão", "Transferência"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
        <p className="form-note">
          {settleFull ? (
            <>
              Após confirmar, o saldo será{" "}
              <strong>{money(0)}</strong> (lançamento quitado).
            </>
          ) : (
            <>
              Saldo que permanecerá em aberto:{" "}
              <strong>{money(projectedRemaining)}</strong>
            </>
          )}
        </p>
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
          <Button type="submit" disabled={!canWrite || busy}>
            {busy ? "Confirmando…" : "Confirmar recebimento"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function ReceiptHistory() {
  const { data } = useBusiness();
  const receipts = [...(data.recebimentos || [])].sort((a, b) =>
    b.data.localeCompare(a.data),
  );
  const listing = useListing(
    receipts,
    (r) => `${r.clienteNome} ${r.descricao} ${r.pagamento}`,
  );
  const tipoLabel = (t: string) =>
    t === "parcial"
      ? "Parcial"
      : t === "quitacao_cliente"
        ? "Quitação cliente"
        : t === "entrada"
          ? "Entrada"
          : t === "manual"
            ? "Manual"
            : "Integral";

  return (
    <section className="panel report-detail">
      <div className="panel-header">
        <div>
          <h2>Histórico de recebimentos</h2>
          <p className="form-note">
            Registros auditáveis por data efetiva do pagamento.
          </p>
        </div>
      </div>
      {receipts.length > 0 && (
        <div className="section-tools">{listing.searchInput}</div>
      )}
      <Table
        headings={[
          "Data",
          "Cliente / referência",
          "Tipo de baixa",
          "Pagamento",
          "Valor recebido",
        ]}
        empty={!listing.rows.length}
      >
        {listing.rows.map((r) => (
          <tr key={r.id}>
            <td>{dateText(r.data)}</td>
            <td>
              <strong>{r.clienteNome}</strong>
              <small>{r.descricao}</small>
            </td>
            <td>
              <Badge tone={r.tipoBaixa === "parcial" ? "warning" : "good"}>
                {tipoLabel(r.tipoBaixa)}
              </Badge>
            </td>
            <td>{r.pagamento}</td>
            <td className="money">{money(r.valor)}</td>
          </tr>
        ))}
      </Table>
      {receipts.length > 0 && (
        <Pagination
          total={listing.filtered.length}
          page={listing.page}
          setPage={listing.setPage}
        />
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
  const sortedCustomers = sortByTextPtBr(
    data.clientes,
    (c) => c.nome,
    (c) => c.id,
  );
  const selectedCustomerObj = customer
    ? data.clientes.find((c) => c.id === customer)
    : undefined;
  const rows = data.vendas
    .filter(
      (s) =>
        (!start || s.data >= start) &&
        (!end || s.data <= end) &&
        (!selectedCustomerObj || customerMatches(s, selectedCustomerObj)) &&
        (!method || s.pagamento === method),
    )
    .sort((a, b) => a.data.localeCompare(b.data));
  const ordersInRange = data.encomendas
    .filter(
      (o) =>
        (!start || o.dataEntrega >= start) &&
        (!end || o.dataEntrega <= end) &&
        (!selectedCustomerObj || customerMatches(o, selectedCustomerObj)),
    )
    .sort((a, b) => b.dataEntrega.localeCompare(a.dataEntrega));
  const receiptsInRange = (data.recebimentos || [])
    .filter(
      (r) =>
        (!start || r.data >= start) &&
        (!end || r.data <= end) &&
        (!selectedCustomerObj || customerMatches(r, selectedCustomerObj)) &&
        (!method || r.pagamento === method),
    )
    .sort((a, b) => b.data.localeCompare(a.data));
  const receiptsTotal = round(receiptsInRange.reduce((n, r) => n + r.valor, 0));
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
    const cust = data.clientes.find((c) => customerMatches(s, c));
    const product = productName(s);
    const key = `${cust?.id || s.pessoa}::${product}`;
    const group = details.get(key) || {
      customer: cust?.nome || s.pessoa,
      product,
      quantity: 0,
      total: 0,
    };
    group.quantity += s.quantidade;
    group.total += saleTotal(s);
    details.set(key, group);
  });

  const purchasesInRange = data.despesas
    .filter(
      (e) =>
        (!start || e.data >= start) &&
        (!end || e.data <= end) &&
        (e.isNotaFiscal || !!e.entradaEstoque),
    )
    .sort((a, b) => b.data.localeCompare(a.data));
  const stockSummary = sortByTextPtBr(
    [
      ...data.ingredientes
        .filter((i) => !i.arquivado && (i.estoqueIniciado || (i.estoqueAtual ?? 0) > 0 || (i.estoqueMinimo ?? 0) > 0))
        .map((i) => ({
          key: `ing:${i.id}`,
          kind: "Ingrediente",
          name: i.nome,
          formatted: formatStock(i.estoqueAtual ?? 0, i.unidadePadrao),
          low: isLowStock(i),
        })),
      ...data.materiais
        .filter((m) => !m.arquivado && (m.estoqueIniciado || (m.estoqueAtual ?? 0) > 0 || (m.estoqueMinimo ?? 0) > 0))
        .map((m) => ({
          key: `mat:${m.id}`,
          kind: "Material",
          name: m.nome,
          formatted: formatStock(m.estoqueAtual ?? 0, "un"),
          low: isLowStock(m),
        })),
    ],
    (item) => item.name,
    (item) => item.key,
  );

  const saleStatusLabel = (s: Sale) => {
    const rec = saleReceived(s);
    const rem = saleRemaining(s);
    if (s.status === "P" && rec > 0 && rem > 0) return "Parcial";
    if (s.status === "P") return "Pendente";
    return s.status === "E" ? "Entregue e pago" : "Pago";
  };

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
          "Recebido",
          "Em aberto",
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
          saleReceived(s),
          saleRemaining(s),
          s.pagamento,
          saleStatusLabel(s),
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
            {sortedCustomers.map((c) => (
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
          disabled={
            invalidRange ||
            (!rows.length && !ordersInRange.length && !receiptsInRange.length)
          }
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
            <h1>Lá Divino Sabor · Relatório operacional e financeiro</h1>
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
              title="Recebimentos datados"
              value={receiptsTotal}
              detail={`${receiptsInRange.length} pagamento(s) no intervalo`}
            />
            <Metric
              title="Média por cliente"
              value={customers ? total / customers : 0}
              detail="Total dividido pelos clientes"
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
            Relatório consolidado no intervalo selecionado: vendas avulsas,
            encomendas por data de entrega, recebimentos efetivos por data do
            pagamento e compras/estoque.
          </p>
          <section className="panel">
            <div className="panel-header">
              <h2>Resumo por cliente</h2>
            </div>
            <Table
              headings={["Cliente", "Unidades", "Total"]}
              empty={!rows.length}
            >
              {sortByTextPtBr([...byCustomer.values()], (c) => c.name).map(
                (c) => (
                  <tr key={c.name}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td>{c.quantity}</td>
                    <td className="money">{money(c.total)}</td>
                  </tr>
                ),
              )}
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
              {sortByTextPtBr([...details.entries()], ([, i]) => i.customer).map(
                ([key, item]) => (
                  <tr key={key}>
                    <td>{item.customer}</td>
                    <td>{item.product}</td>
                    <td>{item.quantity}</td>
                    <td className="money">{money(item.total)}</td>
                  </tr>
                ),
              )}
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
                  <td>{saleStatusLabel(s)}</td>
                </tr>
              ))}
            </Table>
          </section>
          <section className="panel report-detail">
            <div className="panel-header">
              <h2>Encomendas no intervalo (por entrega)</h2>
            </div>
            <Table
              headings={[
                "Entrega",
                "Cliente",
                "Resumo",
                "Total",
                "Recebido",
                "Situação",
              ]}
              empty={!ordersInRange.length}
            >
              {ordersInRange.map((o) => (
                <tr key={o.id}>
                  <td>{dateText(o.dataEntrega)}</td>
                  <td>{o.clienteNome}</td>
                  <td>
                    {o.itens && o.itens.length > 0
                      ? summarizeOrderItems(
                          o.itens,
                          o.acessorios || [],
                          o.observacoes,
                        )
                      : o.produtoDescricao}
                  </td>
                  <td className="money">{money(o.valorTotal)}</td>
                  <td className="money">{money(orderReceived(o))}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </Table>
          </section>
          <section className="panel report-detail">
            <div className="panel-header">
              <h2>Recebimentos efetivos no intervalo</h2>
            </div>
            <Table
              headings={["Data", "Cliente", "Referência", "Forma", "Valor"]}
              empty={!receiptsInRange.length}
            >
              {receiptsInRange.map((r) => (
                <tr key={r.id}>
                  <td>{dateText(r.data)}</td>
                  <td>{r.clienteNome}</td>
                  <td>{r.descricao}</td>
                  <td>{r.pagamento}</td>
                  <td className="money">{money(r.valor)}</td>
                </tr>
              ))}
            </Table>
          </section>
          <section className="panel report-detail">
            <div className="panel-header">
              <h2>Compras com estoque e saldo atual</h2>
            </div>
            <Table
              headings={["Data", "Descrição", "Fornecedor", "Itens", "Total"]}
              empty={!purchasesInRange.length}
            >
              {purchasesInRange.map((e) => (
                <tr key={e.id}>
                  <td>{dateText(e.data)}</td>
                  <td>{e.descricao}</td>
                  <td>
                    {resolveExpenseSupplier(e, data.fornecedores || [])
                      .displayName || "—"}
                  </td>
                  <td>{e.isNotaFiscal ? e.itensNota?.length || 0 : 1}</td>
                  <td className="money">{money(e.valor)}</td>
                </tr>
              ))}
            </Table>
            {stockSummary.length > 0 && (
              <Table
                headings={["Item em estoque", "Tipo", "Saldo atual", "Status"]}
                empty={false}
              >
                {stockSummary.map((st) => (
                  <tr key={st.key}>
                    <td>{st.name}</td>
                    <td>{st.kind}</td>
                    <td>{st.formatted}</td>
                    <td>
                      {st.low ? (
                        <Badge tone="warning">Abaixo do mínimo</Badge>
                      ) : (
                        <Badge tone="good">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
        </article>
      )}
    </>
  );
}
