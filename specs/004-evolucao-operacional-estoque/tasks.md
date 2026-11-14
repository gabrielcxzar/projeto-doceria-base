# Tarefas: Evolução operacional, financeira, agrupamentos e estoque

- [x] T001 Registrar especificação, plano e tarefas em `specs/004-evolucao-operacional-estoque/`.
- [x] T002 Atualizar contratos em `src/types.ts`, regras em `firestore.rules` e suporte transacional `createOnly` em `src/firebase.ts` e `src/App.tsx`.
- [x] T003 Implementar funções de domínio em `src/domain.ts` (ordenação `pt-BR`, recebimentos parciais, agrupamentos de vendas/encomendas, normalização/cálculo de estoque, finanças com data efetiva de pagamento) e testes unitários em `src/domain.test.ts`.
- [x] T004 Atualizar `src/editors.tsx` (seletores ordenados, Venda com **Salvar e continuar**, Encomenda multi-produto com acessórios cobrados/internos, Despesa com entrada opcional, Nota Fiscal multi-item, modais de estoque).
- [x] T005 Atualizar `src/pages.tsx`, `src/App.tsx`, `src/styles.css` e `src/demo.ts` (Cadastros A–Z, Vendas agrupadas com etiqueta, Encomendas ordenadas e agrupadas, Cobranças com baixa parcial e histórico, Financeiro com Nota Fiscal e estorno seguro, novo módulo Estoque, Relatórios consistentes).
- [x] T006 Atualizar e ampliar testes (`tests/rules.test.ts`, `tests/browser/preview.spec.ts`, `tests/browser/firebase.spec.ts`, `tests/browser/responsive.spec.ts`, `tests/browser/responsive-content.spec.ts`).
- [x] T007 Executar toda a matriz de verificação (`check`, `build`, `test:e2e`, `test:responsive` Chromium, `test:pwa`, `test:rules`, `test:integration`).
- [x] T008 Atualizar documentação (`README.md`, `docs/*`, `.ai/CONTEXT.md`, `.ai/CHANGELOG_AI.md`) e revisar diff/segredos sem fazer push em `main`.
