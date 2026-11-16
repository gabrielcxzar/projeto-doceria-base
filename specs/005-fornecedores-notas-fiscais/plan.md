# Plano Técnico: Cadastro de Fornecedores e Agrupamento de Notas Fiscais

## Decisões de arquitetura e modelo de dados

1. **Preservação do Firebase e compatibilidade com histórico**:
   - Nova coleção de primeiro nível `fornecedores` (`Supplier`) em `src/types.ts`, automaticamente incluída em `subscribeData` e `completeBackup` (`src/firebase.ts`), elevando a exportação JSON para 15 coleções.
   - `Expense` (`despesas`) recebe campos opcionais `fornecedorId?: string` e `fornecedorNome?: string`, preservando `fornecedor?: string` para compatibilidade reversa com notas anteriores e relatórios.
   - Nenhuma migração automática: notas antigas sem `fornecedorId` preservam `fornecedor` em texto e só recebem vínculo formal quando editadas manualmente pelo usuário.

2. **Regras de segurança (`firestore.rules`)**:
   - `/fornecedores/{id}`: leitura para `authorized()`, criação/atualização para `admin()` com `nome` textual não vazio, `allow delete: if false` (arquivamento lógico).
   - `/despesas/{id}`: `create` exige `fornecedorId` e `fornecedorNome` **somente** quando `isNotaFiscal == true`; despesas simples e `update` em documentos legados continuam permitidos sem esses campos.

3. **Domínio puro (`src/domain.ts`) e Helpers compartilhados**:
   - `isArchivableCollection()` centraliza as 6 coleções arquiváveis (`clientes`, `produtos`, `ingredientes`, `receitas`, `materiais`, `fornecedores`) usadas por `App.tsx` e `pages.tsx`.
   - `validateSupplierPayload()` valida `nome` obrigatório e aplica validações proporcionais a CNPJ/CPF (11 ou 14 dígitos), e-mail e contato quando preenchidos.
   - `resolveExpenseSupplier()` resolve `{ linked, snapshotName, displayName, isLegacyUnlinked }` estritamente por `fornecedorId`, preservando o nome registrado na nota e indicando eventual renomeação cadastral sem alterar o snapshot histórico.

4. **Interface e fluxos (`src/editors.tsx`, `src/pages.tsx`, `src/styles.css`)**:
   - `Catalog`: sexta aba **Fornecedores** com ordenação A–Z (`pt-BR`) antes da paginação, busca multi-campo, contagem de notas vinculadas, arquivamento e reativação.
   - `Editor`: `kind === "supplier"` e melhorias em `kind === "invoice"` (seletor pesquisável de fornecedores ativos A–Z, formulário inline `+ Novo fornecedor` sem perder os itens da nota, edição segura de cabeçalho/vínculo sem duplicar `movimentacoes_estoque`).
   - `Finance`: linha única por nota fiscal com etiqueta **Nota fiscal**, fornecedor, número da nota, contagem de itens, total e expansão inline responsiva **Exibir itens** / **Ocultar itens** com tabela `Produto | Quantidade | Valor unitário | Subtotal` + total; etiquetas **Despesa simples**; filtros por fornecedor, tipo de lançamento, categoria, busca e alternância de ordenação por data.

## Arquivos afetados

- `src/types.ts`, `src/context.ts`, `firestore.rules`, `src/demo.ts`
- `src/domain.ts`, `src/domain.test.ts`
- `src/App.tsx`, `src/editors.tsx`, `src/pages.tsx`, `src/styles.css`
- `tests/rules.test.ts`, `tests/browser/preview.spec.ts`, `tests/browser/firebase.spec.ts`, `tests/browser/responsive.spec.ts`
- `docs/ARCHITECTURE.md`, `docs/modelo-de-dados.md`, `docs/manual-de-uso.md`, `docs/DECISIONS.md`, `.ai/CONTEXT.md`, `.ai/CHANGELOG_AI.md`, `specs/005-fornecedores-notas-fiscais/*`
