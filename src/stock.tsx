import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";
import { useBusiness } from "./context";
import type { BaseUnit, Ingredient, Material, StockMovement } from "./types";
import {
  compatibleUnits,
  dateText,
  formatStock,
  isLowStock,
  normalizeStockQuantity,
  positive,
  roundStock,
  sortByTextPtBr,
  today,
  validDate,
  versionOf,
} from "./domain";
import { Badge, Button, Field, Modal, Pagination, Table, useListing } from "./ui";

type StockItem =
  | { kind: "ingrediente"; id: string; nome: string; baseUnit: BaseUnit; record: Ingredient }
  | { kind: "material"; id: string; nome: string; baseUnit: BaseUnit; record: Material };

type StockAction =
  | { mode: "initial"; item: StockItem }
  | { mode: "exit"; item: StockItem }
  | { mode: "adjust"; item: StockItem }
  | { mode: "min"; item: StockItem };

export function Stock() {
  const { data, canWrite } = useBusiness();
  const [tab, setTab] = useState<"saldos" | "historico">("saldos");
  const [filter, setFilter] = useState<"all" | "ingrediente" | "material" | "low" | "uninit">("all");
  const [movFilter, setMovFilter] = useState<"" | "saldo_inicial" | "entrada" | "saida" | "ajuste">("");
  const [action, setAction] = useState<StockAction | null>(null);

  const allItems: StockItem[] = sortByTextPtBr(
    [
      ...data.ingredientes
        .filter((i) => !i.arquivado)
        .map((i) => ({
          kind: "ingrediente" as const,
          id: i.id,
          nome: i.nome,
          baseUnit: i.unidadePadrao as BaseUnit,
          record: i,
        })),
      ...data.materiais
        .filter((m) => !m.arquivado)
        .map((m) => ({
          kind: "material" as const,
          id: m.id,
          nome: m.nome,
          baseUnit: "unidade" as BaseUnit,
          record: m,
        })),
    ],
    (item) => item.nome,
    (item) => item.id,
  );

  const controlledCount = allItems.filter(
    (i) => i.record.estoqueIniciado || i.record.estoqueAtual !== undefined,
  ).length;
  const lowCount = allItems.filter((i) => isLowStock(i.record)).length;
  const uninitCount = allItems.length - controlledCount;

  const filteredItems = allItems.filter((item) => {
    if (filter === "ingrediente") return item.kind === "ingrediente";
    if (filter === "material") return item.kind === "material";
    if (filter === "low") return isLowStock(item.record);
    if (filter === "uninit")
      return !item.record.estoqueIniciado && item.record.estoqueAtual === undefined;
    return true;
  });

  const itemList = useListing(filteredItems, (item) => item.nome);

  const movements = [...(data.movimentacoes_estoque || [])]
    .filter((m) => !movFilter || m.tipo === movFilter)
    .sort((a, b) => {
      const d = b.data.localeCompare(a.data);
      if (d !== 0) return d;
      const tA = typeof a.criadoEm === "object" && a.criadoEm && "toMillis" in a.criadoEm ? a.criadoEm.toMillis() : 0;
      const tB = typeof b.criadoEm === "object" && b.criadoEm && "toMillis" in b.criadoEm ? b.criadoEm.toMillis() : 0;
      return tB - tA || b.id.localeCompare(a.id);
    });

  const movList = useListing(
    movements,
    (m) => `${m.itemNome} ${m.motivo} ${m.observacao || ""}`,
  );

  const movBadge = (m: StockMovement) => {
    if (m.tipo === "saldo_inicial") return <Badge>Saldo inicial</Badge>;
    if (m.tipo === "entrada") return <Badge tone="good">Entrada</Badge>;
    if (m.tipo === "saida") return <Badge tone="warning">Saída</Badge>;
    return <Badge tone={m.direcao === "entrada" ? "good" : "warning"}>Ajuste</Badge>;
  };

  return (
    <>
      <div className="metric-grid">
        <section className="metric">
          <span>Itens com estoque iniciado</span>
          <strong>{controlledCount}</strong>
          <small>de {allItems.length} itens ativos</small>
        </section>
        <section className={`metric ${lowCount > 0 ? "accent" : ""}`}>
          <span>Abaixo do mínimo</span>
          <strong>{lowCount}</strong>
          <small>Requer atenção de compra</small>
        </section>
        <section className="metric">
          <span>Sem controle iniciado</span>
          <strong>{uninitCount}</strong>
          <small>Aguardando inventário inicial</small>
        </section>
        <section className="metric">
          <span>Movimentações</span>
          <strong>{(data.movimentacoes_estoque || []).length}</strong>
          <small>Entradas, saídas e ajustes</small>
        </section>
      </div>

      <p className="page-note">
        Registros antigos não recebem saldo fictício automaticamente. Informe o
        saldo inicial de cada insumo/material para iniciar o controle. Notas
        fiscais e despesas vinculadas alimentam o estoque automaticamente.
      </p>

      <div className="subnav" role="tablist" aria-label="Visões do estoque">
        <button
          role="tab"
          aria-selected={tab === "saldos"}
          className={tab === "saldos" ? "active" : ""}
          onClick={() => setTab("saldos")}
        >
          Saldos atuais<span>{allItems.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "historico"}
          className={tab === "historico" ? "active" : ""}
          onClick={() => setTab("historico")}
        >
          Histórico de movimentações
          <span>{(data.movimentacoes_estoque || []).length}</span>
        </button>
      </div>

      {tab === "saldos" ? (
        <>
          <div className="section-tools">
            {itemList.searchInput}
            <select
              aria-label="Filtrar itens do estoque"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as typeof filter);
                itemList.setPage(1);
              }}
            >
              <option value="all">Todos os itens</option>
              <option value="ingrediente">Somente ingredientes</option>
              <option value="material">Somente materiais</option>
              <option value="low">Abaixo do mínimo</option>
              <option value="uninit">Sem controle iniciado</option>
            </select>
          </div>
          <section className="panel">
            <Table
              headings={[
                "Item",
                "Tipo",
                "Saldo disponível",
                "Estoque mínimo",
                "Situação",
                "Ações",
              ]}
              empty={!itemList.rows.length}
            >
              {itemList.rows.map((item) => {
                const initiated =
                  !!item.record.estoqueIniciado ||
                  item.record.estoqueAtual !== undefined;
                const low = isLowStock(item.record);
                return (
                  <tr key={`${item.kind}-${item.id}`}>
                    <td>
                      <strong>{item.nome}</strong>
                    </td>
                    <td>
                      <Badge>
                        {item.kind === "ingrediente" ? "Ingrediente" : "Material"}
                      </Badge>
                    </td>
                    <td>
                      <strong>
                        {formatStock(item.record.estoqueAtual, item.baseUnit)}
                      </strong>
                    </td>
                    <td>
                      {item.record.estoqueMinimo !== undefined
                        ? formatStock(item.record.estoqueMinimo, item.baseUnit)
                        : "—"}
                    </td>
                    <td>
                      {!initiated ? (
                        <Badge>Não iniciado</Badge>
                      ) : low ? (
                        <Badge tone="warning">
                          <AlertTriangle size={12} /> Abaixo do mínimo
                        </Badge>
                      ) : (
                        <Badge tone="good">Normal</Badge>
                      )}
                    </td>
                    <td>
                      {canWrite ? (
                        <div className="row-actions">
                          {!initiated ? (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                setAction({ mode: "initial", item })
                              }
                            >
                              <ArrowUpCircle size={15} /> Saldo inicial
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() => setAction({ mode: "exit", item })}
                              >
                                <ArrowDownCircle size={15} /> Saída
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  setAction({ mode: "adjust", item })
                                }
                              >
                                <SlidersHorizontal size={15} /> Ajustar
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            onClick={() => setAction({ mode: "min", item })}
                          >
                            Mínimo
                          </Button>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
            <Pagination
              total={itemList.filtered.length}
              page={itemList.page}
              setPage={itemList.setPage}
            />
          </section>
        </>
      ) : (
        <>
          <div className="section-tools">
            {movList.searchInput}
            <select
              aria-label="Filtrar tipo de movimentação"
              value={movFilter}
              onChange={(e) => {
                setMovFilter(e.target.value as typeof movFilter);
                movList.setPage(1);
              }}
            >
              <option value="">Todas as movimentações</option>
              <option value="saldo_inicial">Saldo inicial</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
              <option value="ajuste">Ajustes</option>
            </select>
          </div>
          <section className="panel">
            <Table
              headings={[
                "Data",
                "Item",
                "Tipo",
                "Quantidade",
                "Motivo / origem",
                "Saldo após",
              ]}
              empty={!movList.rows.length}
            >
              {movList.rows.map((m) => (
                <tr key={m.id}>
                  <td>{dateText(m.data)}</td>
                  <td>
                    <strong>{m.itemNome}</strong>
                    <small>
                      {m.itemTipo === "ingrediente" ? "Ingrediente" : "Material"}
                    </small>
                  </td>
                  <td>{movBadge(m)}</td>
                  <td>
                    {m.direcao === "entrada" ? "+" : "-"}
                    {m.quantidade} {m.unidade}
                    {m.unidade !== m.unidadePadrao && (
                      <small>
                        ({formatStock(m.quantidadePadrao, m.unidadePadrao)})
                      </small>
                    )}
                  </td>
                  <td>
                    {m.motivo}
                    {m.observacao && <small>{m.observacao}</small>}
                  </td>
                  <td>{formatStock(m.saldoPosterior, m.unidadePadrao)}</td>
                </tr>
              ))}
            </Table>
            <Pagination
              total={movList.filtered.length}
              page={movList.page}
              setPage={movList.setPage}
            />
          </section>
        </>
      )}

      {action && (
        <StockActionModal action={action} onClose={() => setAction(null)} />
      )}
    </>
  );
}

function StockActionModal({
  action,
  onClose,
}: {
  action: StockAction;
  onClose: () => void;
}) {
  const { save, busy, canWrite } = useBusiness();
  const { mode, item } = action;
  const units = compatibleUnits(item.baseUnit);
  const [date, setDate] = useState(today());
  const [qty, setQty] = useState(
    mode === "adjust" && item.record.estoqueAtual !== undefined
      ? String(item.record.estoqueAtual)
      : mode === "min" && item.record.estoqueMinimo !== undefined
        ? String(item.record.estoqueMinimo)
        : "",
  );
  const [unit, setUnit] = useState<string>(item.baseUnit);
  const [minQty, setMinQty] = useState(
    item.record.estoqueMinimo !== undefined
      ? String(item.record.estoqueMinimo)
      : "",
  );
  const [reason, setReason] = useState(
    mode === "exit"
      ? "Produção"
      : mode === "adjust"
        ? "Contagem física"
        : "Inventário inicial",
  );
  const [obs, setObs] = useState("");
  const [error, setError] = useState("");

  const titles = {
    initial: `Saldo inicial · ${item.nome}`,
    exit: `Registrar saída · ${item.nome}`,
    adjust: `Ajustar estoque · ${item.nome}`,
    min: `Estoque mínimo · ${item.nome}`,
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!canWrite)
        throw new Error(
          "Seu perfil permite somente consulta ou a conexão está indisponível.",
        );
      const collection =
        item.kind === "ingrediente" ? "ingredientes" : "materiais";

      if (mode === "min") {
        const minVal = positive(qty, "Estoque mínimo", true);
        const { quantidadePadrao } = normalizeStockQuantity(
          minVal,
          unit,
          item.baseUnit,
        );
        await save(
          [
            {
              collection,
              id: item.id,
              expectedUpdatedAt: versionOf(item.record),
              data: { estoqueMinimo: quantidadePadrao },
            },
          ],
          `Estoque mínimo atualizado: ${item.nome}`,
        );
        onClose();
        return;
      }

      if (!validDate(date)) throw new Error("Informe uma data válida.");
      const rawQty = positive(
        qty,
        mode === "adjust" ? "Novo saldo físico" : "Quantidade",
        mode === "initial" || mode === "adjust",
      );
      const { quantidadePadrao, unidadePadrao } = normalizeStockQuantity(
        rawQty,
        unit,
        item.baseUnit,
      );

      if (mode === "initial") {
        if (item.record.estoqueIniciado)
          throw new Error(
            "Este item já teve o estoque iniciado. Use Ajustar estoque.",
          );
        const minVal =
          minQty.trim() !== ""
            ? positive(minQty, "Estoque mínimo", true)
            : undefined;
        await save(
          [
            {
              collection,
              id: item.id,
              expectedUpdatedAt: versionOf(item.record),
              data: {
                estoqueAtual: quantidadePadrao,
                estoqueIniciado: true,
                ...(minVal !== undefined ? { estoqueMinimo: minVal } : {}),
              },
            },
            {
              collection: "movimentacoes_estoque",
              data: {
                data: date,
                itemTipo: item.kind,
                itemId: item.id,
                itemNome: item.nome,
                tipo: "saldo_inicial",
                direcao: "entrada",
                quantidade: rawQty,
                unidade: unit,
                quantidadePadrao,
                deltaPadrao: quantidadePadrao,
                unidadePadrao,
                saldoAnterior: null,
                saldoPosterior: quantidadePadrao,
                motivo: "Inventário inicial",
                ...(obs.trim() ? { observacao: obs.trim() } : {}),
                origemTipo: "inventario",
              },
            },
          ],
          `Saldo inicial registrado: ${item.nome}`,
        );
      } else if (mode === "exit") {
        if (quantidadePadrao <= 0)
          throw new Error("Quantidade da saída deve ser maior que zero.");
        const current = item.record.estoqueAtual ?? 0;
        if (quantidadePadrao > current)
          throw new Error(
            `Saldo insuficiente em estoque (disponível: ${formatStock(current, item.baseUnit)}). Use Ajuste de estoque se precisar corrigir o inventário.`,
          );
        const nextBalance = roundStock(current - quantidadePadrao);
        await save(
          [
            {
              collection,
              id: item.id,
              expectedUpdatedAt: versionOf(item.record),
              data: { estoqueAtual: nextBalance, estoqueIniciado: true },
            },
            {
              collection: "movimentacoes_estoque",
              data: {
                data: date,
                itemTipo: item.kind,
                itemId: item.id,
                itemNome: item.nome,
                tipo: "saida",
                direcao: "saida",
                quantidade: rawQty,
                unidade: unit,
                quantidadePadrao,
                deltaPadrao: -quantidadePadrao,
                unidadePadrao,
                saldoAnterior: current,
                saldoPosterior: nextBalance,
                motivo: reason,
                ...(obs.trim() ? { observacao: obs.trim() } : {}),
                origemTipo: "manual",
              },
            },
          ],
          `Saída de estoque: ${item.nome}`,
        );
      } else if (mode === "adjust") {
        const current = item.record.estoqueAtual ?? 0;
        const delta = roundStock(quantidadePadrao - current);
        if (delta === 0)
          throw new Error("O novo saldo informado é igual ao saldo atual.");
        if (!reason.trim()) throw new Error("Informe o motivo do ajuste.");
        const absDelta = Math.abs(delta);
        await save(
          [
            {
              collection,
              id: item.id,
              expectedUpdatedAt: versionOf(item.record),
              data: { estoqueAtual: quantidadePadrao, estoqueIniciado: true },
            },
            {
              collection: "movimentacoes_estoque",
              data: {
                data: date,
                itemTipo: item.kind,
                itemId: item.id,
                itemNome: item.nome,
                tipo: "ajuste",
                direcao: delta > 0 ? "entrada" : "saida",
                quantidade: absDelta,
                unidade: unidadePadrao,
                quantidadePadrao: absDelta,
                deltaPadrao: delta,
                unidadePadrao,
                saldoAnterior: current,
                saldoPosterior: quantidadePadrao,
                motivo: reason,
                ...(obs.trim() ? { observacao: obs.trim() } : {}),
                origemTipo: "manual",
              },
            },
          ],
          `Ajuste de estoque: ${item.nome}`,
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <Modal title={titles[mode]} onClose={onClose} busy={busy}>
      <form onSubmit={submit}>
        <fieldset disabled={busy || !canWrite} className="form-grid">
          {mode !== "min" && (
            <Field label="Data">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
          )}
          <Field
            label={
              mode === "initial"
                ? "Quantidade física inicial"
                : mode === "exit"
                  ? "Quantidade da saída"
                  : mode === "adjust"
                    ? "Novo saldo físico correto"
                    : "Estoque mínimo"
            }
            hint={
              mode === "exit" || mode === "adjust"
                ? `Saldo atual: ${formatStock(item.record.estoqueAtual, item.baseUnit)}`
                : undefined
            }
          >
            <input
              type="number"
              min="0"
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </Field>
          <Field label="Unidade">
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          {mode === "initial" && (
            <Field label={`Estoque mínimo (${item.baseUnit}) - opcional`}>
              <input
                type="number"
                min="0"
                step="any"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
              />
            </Field>
          )}
          {mode === "exit" && (
            <Field label="Motivo da saída">
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="Produção">Produção</option>
                <option value="Consumo interno">Consumo interno</option>
                <option value="Perda / vencimento">Perda / vencimento</option>
                <option value="Descarte">Descarte</option>
                <option value="Outros">Outros</option>
              </select>
            </Field>
          )}
          {mode === "adjust" && (
            <Field label="Motivo do ajuste">
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="Contagem física">Contagem física</option>
                <option value="Correção de lançamento">Correção de lançamento</option>
                <option value="Quebra / avaria">Quebra / avaria</option>
                <option value="Outros">Outros</option>
              </select>
            </Field>
          )}
          {mode !== "min" && (
            <div className="span-2">
              <Field label="Observação (opcional)">
                <input
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  maxLength={300}
                />
              </Field>
            </div>
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
            {busy ? "Confirmando…" : "Confirmar"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
