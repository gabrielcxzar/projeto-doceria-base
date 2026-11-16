# Tarefas: Cadastro de produto durante o lançamento de encomendas

- [x] T001 Adicionar suporte a `onSaved` com ID determinístico (`createOnly: true`) e montagem empilhada isolada do `<Editor kind="product">` a partir de `Nova Encomenda` e `Editar Encomenda` em `src/editors.tsx` + ajuste de layout em `src/styles.css`.
- [x] T002 Adicionar testes completos em `tests/browser/preview.spec.ts` e `tests/browser/firebase.spec.ts` para criação a partir de nova/edição, seleção automática, cancelamento, erro simulado de gravação, preservação de itens/acessórios, duplicidade, perfil `viewer` e responsividade desktop/mobile.
- [x] T003 Atualizar documentação (`docs/manual-de-uso.md`, `.ai/CHANGELOG_AI.md`, `specs/008-encomendas-cadastrar-produto/`) e validar com `check`, `build`, `e2e`, `pwa`, `integration` e bateria responsiva.
