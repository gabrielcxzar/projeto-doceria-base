# Plano Técnico: Entrada de estoque opcional por item da nota fiscal

## Mudanças de modelo e domínio

1. **`src/types.ts` (`ExpenseInvoiceItem`):**
   - Manter `geraEstoque: boolean` e adicionar `adicionarEstoque?: boolean` para explicitar a escolha individual sem quebrar documentos ou regras existentes.
2. **`src/domain.ts`:**
   - `invoiceItemAddsToStock(item)`: resolve `item.itemTipo === "outro" ? false : Boolean(item.adicionarEstoque ?? item.geraEstoque)`.
   - `invoiceItemNetStockDelta(expenseId, item, movements)`: calcula o delta líquido efetivo (`deltaPadrao`) já gravado em `movimentacoes_estoque` para aquele `origemId === expenseId` e item (`origemItemId === item.id || m.id === "nf_<expenseId>_<item.id>"`), determinando se o item possui saldo ativo lançado no estoque independentemente de falhas/ausências da flag em dados legados.
   - `buildInvoiceMutations(...)`: função pura e testável em `src/domain.ts` para criação e edição de notas fiscais com:
     - Geração determinística (`nf_${expenseId}_${item.id}`, `createOnly: true`) para novas entradas nunca criadas antes;
     - Reversão segura (`correcao_nota`, `createOnly: true`, `origemItemId: item.id`) quando um item ativo passa a desmarcado na edição (bloqueando se `estoqueAtual < netDelta`);
     - Re-ativação idempotente quando um item desmarcado/estornado passa a marcado na edição;
     - Zero movimentações quando o estado efetivo do item não muda (ou ao salvar cabeçalho de nota legada sem flag).
   - `buildExpenseDeletionMutations(...)`: somar todas as movimentações com `m.origemId === expense.id` (incluindo `correcao_nota` já realizadas em edições anteriores) para calcular o delta líquido a estornar sem duplo estorno nem erro em itens que nunca entraram no estoque.
3. **UI (`src/editors.tsx`, `src/pages.tsx`, `src/App.tsx`, `src/styles.css`):**
   - `Editor` (`kind === "invoice"`): checkbox **Adicionar ao estoque** no builder de item (marcada por padrão quando `invType !== "outro"`), badge + checkbox interativa por item na lista `.composition-list` antes de salvar e na edição da nota (exibindo estado real gravado).
   - `Finance` (`src/pages.tsx`): usar `invoiceItemAddsToStock(item)` para o selo `Estoque +` e rótulo na tabela expandida (`Entra no estoque` vs `Sem estoque`).
   - `App.tsx`: verificar saldo líquido positivo em `movimentacoes_estoque` ao exibir o aviso de estorno no modal de exclusão.

## Arquivos afetados

- `src/types.ts`, `src/domain.ts`, `src/App.tsx`, `src/editors.tsx`, `src/pages.tsx`, `src/styles.css`
- `src/domain.test.ts`, `tests/browser/preview.spec.ts`, `tests/browser/firebase.spec.ts`
- `docs/modelo-de-dados.md`, `docs/manual-de-uso.md`, `docs/DECISIONS.md`, `.ai/CONTEXT.md`, `.ai/CHANGELOG_AI.md`, `specs/006-nota-fiscal-estoque-opcional/*`
