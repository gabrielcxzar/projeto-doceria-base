# Mudanças relevantes por IA

## 2026-11-16 — Cadastro de fornecedores e agrupamento de notas fiscais no Financeiro

**Agente:** Antigravity. **Objetivo:** implementar a 6ª aba **Fornecedores** em Cadastros, exigir seleção de fornecedor cadastrado ao registrar novas notas fiscais (com criação rápida inline) e exibir cada nota fiscal no Financeiro como linha única com expansão responsiva **Exibir itens** e filtros por fornecedor e tipo de lançamento.

**Mudanças:** coleção `fornecedores` (`Supplier`) e vínculos opcionais `fornecedorId`/`fornecedorNome` em `Expense` (`src/types.ts`, `src/context.ts`, `src/firebase.ts` com 15 coleções e `firestore.rules`); helpers `isArchivableCollection`, `validateSupplierInput`, `resolveExpenseSupplier` e `expenseMatchesSupplierFilter` (`src/domain.ts`); aba **Fornecedores** e visualização agrupada por nota com tabela expansível **Exibir itens** + filtros em `src/pages.tsx`, `src/styles.css` e `src/App.tsx`; formulário de fornecedor, seletor pesquisável com `+ Novo fornecedor` e edição segura de cabeçalho sem duplicar estoque em `src/editors.tsx`. Testes ampliados em `src/domain.test.ts`, `tests/rules.test.ts`, `tests/browser/preview.spec.ts`, `tests/browser/firebase.spec.ts` e `tests/browser/responsive.spec.ts`, e documentação atualizada (`docs/`, `.ai/`, `specs/005-fornecedores-notas-fiscais/`). **Evidências:** [feature 005](../specs/005-fornecedores-notas-fiscais/spec.md) e [tasks](../specs/005-fornecedores-notas-fiscais/tasks.md). **Observação:** alterações mantidas na branch `feat/fornecedores-notas-fiscais` sem push em `main`.

## 2026-11-13 — Evolução operacional, financeira, agrupamentos e estoque quantitativo

**Agente:** Antigravity. **Objetivo:** implementar ordenação alfabética A–Z em cadastros/seletores, vendas com **Salvar e continuar** e agrupamento por pedido, cobranças com recebimentos parciais auditáveis (`recebimentos`), lançamento de notas fiscais com múltiplos itens em Financeiro, encomendas baseadas em produtos cadastrados com acessórios/ordenação por entrega e controle quantitativo de **Estoque** (`movimentacoes_estoque`).

**Mudanças:** contratos compatíveis em `src/types.ts`, transações idempotentes (`createOnly`) em `src/firebase.ts` e `src/App.tsx`, regras em `firestore.rules`, regras de cálculo/agrupamento/estoque em `src/domain.ts`, módulo `src/stock.tsx`, formulários em `src/editors.tsx`, listagens/detalhes em `src/pages.tsx` (incluindo flag **Quitar saldo restante (pagamento total)** e botão único **Confirmar recebimento** no modal individual `PartialPaymentDialog`) e estilos responsivos em `src/styles.css`. Testes atualizados/ampliados em `src/domain.test.ts`, `tests/rules.test.ts`, `tests/browser/preview.spec.ts`, `tests/browser/firebase.spec.ts`, `tests/browser/responsive.spec.ts` e `tests/browser/responsive-content.spec.ts`. Documentação técnica e proposta separada de baixa automática futura registradas em `docs/`. **Evidências:** [feature 004](../specs/004-evolucao-operacional-estoque/spec.md) e [tasks](../specs/004-evolucao-operacional-estoque/tasks.md). **Observação:** alterações mantidas na branch `feat/evolucao-operacional-estoque` sem push em `main`.

## 2026-10-23 — Menu lateral recolhível

**Agente:** Codex. **Objetivo:** permitir ocultar e reabrir o menu lateral no computador.

**Mudanças:** controle no cabeçalho, expansão do conteúdo e preferência local persistente, independente do drawer móvel. Logo original e demais fluxos preservados; nenhum serviço, dado ou regra Firebase alterado. **Evidências:** [feature 003](../specs/003-menu-lateral-recolhivel/checklists/requirements.md).

**Entrega:** PR #4 integrada (`1c5d6d5`), 105 testes aprovados na PR e em `main`, deploy confirmado e código novo verificado nas duas URLs públicas. O fechamento documental não altera o pacote publicado.

## 2026-10-23 — Responsividade e restauração da identidade

**Agente:** Codex. **Objetivo:** corrigir menu cortado, revisar telas e restaurar a marca original solicitada pelo mantenedor.

**Mudanças:** lateral com rolagem própria, drawer com fechamento/foco/teclado, ajustes de grids/filtros/campos/listas e diálogos sem sobreposição. Logo original no login e aplicação, favicon e manifesto; ícones substitutos removidos. Matriz responsiva automatizada incorporada ao CI.

**Preservação:** nenhuma mudança de regras, domínio, serviço Firebase, dados ou faturamento. O PNG original é mantido byte a byte. **Evidências:** [feature 002](../specs/002-responsividade-identidade/checklists/requirements.md).

**Entrega:** PR #3 integrada (`50b5086`), 103 testes aprovados no CI da PR e de `main`, deploy confirmado e verificação pública nas duas URLs Firebase. Este fechamento documental não altera o pacote publicado.

## 2026-10-23 — Adoção documental e Spec Kit

**Agente:** Codex. **Objetivo:** aplicar Spec Kit e avaliar a precedência do AI Project Bootstrap local.

**Mudanças:** auditoria proporcional, contexto/convenções de agentes, arquitetura, modelo de dados, manual, guia operacional, decisões e índice. Integração oficial do Spec Kit, constituição e artefatos da adoção. Referências acrescentadas ao README e ao `AGENTS.md`; configuração de adoção registrada ao término da validação.

**Motivo:** permitir que futuras sessões e mantenedores entendam o sistema e especifiquem mudanças sem depender do histórico do chat. Não houve alteração do comportamento da aplicação, das regras Firebase, do faturamento ou dos dados de produção.

**Evidência de conclusão:** [checklist da adoção](../specs/001-adocao-documentacao/checklists/requirements.md). **Validação humana pendente:** nenhuma necessária para esta adoção; novas decisões de produto continuam a depender do pedido correspondente.

O histórico da reformulação anterior permanece em [docs/reformulacao.md](../docs/reformulacao.md) e no commit `77417d3`; não é duplicado neste registro.
