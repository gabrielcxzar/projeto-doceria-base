# Tarefas: Apresentação vertical dos itens nas encomendas

- [x] T001 Refatorar área expandida `Ver detalhes` de `Orders` em `src/pages.tsx` para listar produtos e acessórios linha a linha sem concatenação nem repetição, preservando compatibilidade com `produtoDescricao` legado.
- [x] T002 Adicionar estilos responsivos `.order-detail-lines` / `.order-detail-line` em `src/styles.css` compatíveis com nomes extensos em desktop e mobile.
- [x] T003 Atualizar e expandir testes em `tests/browser/preview.spec.ts` e `tests/browser/firebase.spec.ts` cobrindo 1 item, múltiplos itens/acessórios, múltiplas encomendas agrupadas e totais em desktop e celular.
- [x] T004 Atualizar documentação (`docs/manual-de-uso.md`, `.ai/CHANGELOG_AI.md`, `specs/007-encomendas-detalhes-itens/`) e executar verificações (`check`, `build`, `e2e`, `pwa`, `integration`, `responsive`).
