# Tarefas: Entrada de estoque opcional por item da nota fiscal

- [x] T001 Estender `ExpenseInvoiceItem` com `adicionarEstoque?: boolean` em `src/types.ts`.
- [x] T002 Implementar helpers puros (`invoiceItemAddsToStock`, `invoiceItemNetStockDelta`, `expenseHasActiveStockEntries`, `buildInvoiceMutations`) e corrigir delta líquido em `buildExpenseDeletionMutations` (`src/domain.ts` e `src/App.tsx`).
- [x] T003 Adicionar checkbox `[x] Adicionar ao estoque` no construtor de itens e controle individual por item na lista da nota (criação e edição) em `src/editors.tsx` e ajustar exibição em `src/pages.tsx` / `src/styles.css`.
- [x] T004 Adicionar testes unitários (`src/domain.test.ts`), E2E (`tests/browser/preview.spec.ts`) e integração Firebase (`tests/browser/firebase.spec.ts`) cobrindo itens mistos, alternância antes de salvar, edição (incluindo legados e estorno parcial), cancelamento/exclusão e celular.
- [x] T005 Atualizar documentação (`docs/`, `.ai/`, `specs/006-nota-fiscal-estoque-opcional/`) e executar `npm run check`, `npm run build`, Playwright (`e2e`, `pwa`, `responsive`), `test:rules` e `test:integration`.
