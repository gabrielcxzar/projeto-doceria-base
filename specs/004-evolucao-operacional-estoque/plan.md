# Plano Técnico: Evolução operacional, financeira, agrupamentos e estoque

## Decisões de arquitetura e modelo de dados

1. **Preservação do Firebase e legado**:
   - Projeto `gestao-de-confeitaria` preservado; emuladores em `demo-doceria`.
   - Nenhuma migração destrutiva ou reescrita automática de documentos antigos. Campos novos são opcionais nos contratos existentes.
   - Duas novas coleções de primeiro nível no Firestore:
     - `recebimentos` (`PaymentReceipt`): histórico auditável de recebimentos com `data`, `valor`, `origemTipo`, `origemId`, `vendaIds?`, `clienteId?`, `clienteNome`, `descricao`, `pagamento`, `tipoBaixa`, `observacao?`.
     - `movimentacoes_estoque` (`StockMovement`): ledger auditável de inventário com `data`, `itemTipo`, `itemId`, `itemNome`, `tipo`, `direcao`, `quantidade`, `unidade`, `quantidadePadrao`, `deltaPadrao`, `unidadePadrao`, `saldoAnterior`, `saldoPosterior`, `motivo`, `observacao?`, `origemTipo?`, `origemId?`, `origemItemId?`, `custoUnitario?`.

2. **Extensões compatíveis nos documentos existentes**:
   - `Sale` (`vendas`): `pedidoId?: string`, `valorPago?: number`. Itens do mesmo pedido compartilham `pedidoId`; não há documento cabeçalho duplicando valor.
   - `Order` (`encomendas`): `itens?: OrderItem[]`, `acessorios?: OrderAccessory[]`, `observacoes?: string`. `produtoDescricao` continua preenchido com resumo legível para compatibilidade com regras e telas legadas.
   - `Expense` (`despesas`): `isNotaFiscal?: boolean`, `fornecedor?: string`, `numeroNota?: string`, `observacoes?: string`, `itensNota?: ExpenseInvoiceItem[]`, `entradaEstoque?: { itemTipo; itemId; itemNome; quantidade; unidade; quantidadePadrao; unidadePadrao; movimentoId }`.
   - `Ingredient` (`ingredientes`) e `Material` (`materiais`): `estoqueAtual?: number`, `estoqueMinimo?: number`, `estoqueIniciado?: boolean`.

3. **Integridade transacional e concorrência**:
   - `Mutation` passa a suportar `createOnly?: boolean` para IDs determinísticos de movimentações vinculadas a itens de nota (`nf_${expenseId}_${itemId}`), impedindo duplicidade em nível de transação.
   - `finances()` calcula `received` somando `recebimentos` na data efetiva do pagamento + parcela legada sem recibo datado (`Math.max(0, recebidoDoLancamento - somaRecibosDoLancamento)`), garantindo ausência de dupla contagem e sem inventar datas retroativas.

4. **Regras de segurança (`firestore.rules`)**:
   - Preservar `admin()` para escrita e `authorized()` (`admin` / `viewer`) para leitura em todas as coleções, incluindo `recebimentos` e `movimentacoes_estoque`.
   - Validar campos numéricos, enums, datas e tetos de `valorPago` (com tolerância de centavo para IEEE-754) e integridade de `recebimentos` / `movimentacoes_estoque`.

5. **Proposta separada de baixa automática pela produção (decisão futura)**:
   - Documentar em `docs/DECISIONS.md` (ADR futuro sugerido) como `Recipe.ingredientes` + `Product.composicaoReceitas` + `Product.materiaisUtilizados` podem gerar baixas apenas quando houver um evento explícito de "Produção concluída", sem ativar nesta entrega.

## Arquivos afetados

- `src/types.ts`: novos contratos (`PaymentReceipt`, `StockMovement`, `OrderItem`, `OrderAccessory`, `ExpenseInvoiceItem`, extensões em `Sale`, `Order`, `Expense`, `Ingredient`, `Material`, `Mutation`, `collections`).
- `src/domain.ts`: `compareTextPtBr`, normalização de unidades de estoque (`normalizeStockQuantity`, `compatibleUnits`, `formatStock`), `saleReceived`/`saleRemaining`, agrupamento de vendas (`groupSales`) e encomendas (`groupOrders`), cálculo financeiro com `recebimentos` (`finances`, `customerTotals`), validações e helpers de pagamento parcial e estorno.
- `src/firebase.ts`: suporte a `createOnly` em `mutate()` dentro da transação com verificação de existência e versionamento.
- `src/context.ts`: novos `EditorKind` (`invoice`, `stockInitial`, `stockExit`, `stockAdjust`, `stockMin`) ou modais dedicados + estado em `App.tsx`.
- `src/editors.tsx`: ordenação alfabética nos seletores; `Registrar venda` com **Salvar e continuar**; `Encomenda` com seleção de produtos e acessórios opcionais; `Despesa` simples com entrada opcional de estoque; `Registrar nota fiscal` multi-item; modais de estoque.
- `src/pages.tsx`: ordenação A–Z nos 5 cadastros; Vendas agrupadas por pedido e data/cliente com etiqueta `N produtos` e **Ver detalhes**; Encomendas ordenadas por `dataEntrega` desc (alternável) e agrupadas por `(cliente, dataEntrega)` com **Ver detalhes**; Cobranças com recebimento parcial e histórico de recebimentos; Financeiro com botão **Registrar nota fiscal**, detalhes da nota e estorno seguro; nova área **Estoque**; Relatórios ampliados.
- `src/App.tsx`: item de navegação `Estoque`, contagem/suporte em memória no modo demo para `createOnly` e novas coleções, bloqueio/estorno seguro ao excluir despesas com estoque.
- `src/styles.css`: estilos responsivos chocolate/creme para grupos expansíveis, cabeçalho ordenável, lista editável de itens em modais, alertas de estoque e histórico.
- `src/demo.ts`: fixtures atualizadas preservando dados existentes e incluindo exemplos das novas coleções.
- `firestore.rules`: regras para `recebimentos`, `movimentacoes_estoque` e campos novos.
- `src/domain.test.ts`, `tests/rules.test.ts`, `tests/browser/*.spec.ts`: cobertura completa de domínio, regras, E2E, integração com emuladores e responsividade.
- `docs/`: atualização de `ARCHITECTURE.md`, `modelo-de-dados.md`, `manual-de-uso.md`, `DECISIONS.md`, `README.md` e `.ai/CONTEXT.md` / `.ai/CHANGELOG_AI.md`.
