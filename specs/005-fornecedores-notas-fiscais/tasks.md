# Tarefas: Cadastro de Fornecedores e Agrupamento de Notas Fiscais

- [x] T001 Atualizar contratos em `src/types.ts`, `src/context.ts`, `src/demo.ts` e regras em `firestore.rules` para `fornecedores` e vínculo em `despesas`.
- [x] T002 Implementar helpers puros de fornecedor, validação proporcional, ordenação/resolução sem auto-match por nome e testes unitários em `src/domain.ts` e `src/domain.test.ts`.
- [x] T003 Adicionar suporte centralizado de arquivamento em `src/App.tsx` e aba **Fornecedores** em **Cadastros** (`src/pages.tsx`) + formulário completo (`src/editors.tsx`).
- [x] T004 Atualizar **Registrar/Editar nota fiscal** em `src/editors.tsx` com seletor pesquisável obrigatório de fornecedor ativo (para novas notas), criação inline sem perda dos itens e edição de vínculo/cabeçalho sem gerar novas movimentações de estoque.
- [x] T005 Atualizar **Financeiro** e **Relatórios** (`src/pages.tsx` e `src/styles.css`) com agrupamento por nota fiscal, botão **Exibir itens** responsivo, etiquetas **Nota fiscal** / **Despesa simples**, filtros por fornecedor/tipo e busca ampliada.
- [x] T006 Expandir testes (`tests/rules.test.ts`, `tests/browser/preview.spec.ts`, `tests/browser/firebase.spec.ts`, `tests/browser/responsive.spec.ts`) cobrindo os 14 cenários solicitados.
- [x] T007 Atualizar documentação técnica/operacional (`docs/`, `.ai/`, `specs/005-fornecedores-notas-fiscais/`) e validar `check`, `build`, `e2e`, `pwa`, `rules`, `integration` e `responsive`.
