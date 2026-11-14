# Especificação: Evolução operacional, financeira, agrupamentos e estoque

**Feature Branch**: `feat/evolucao-operacional-estoque`  
**Created**: 2026-11-13  
**Status**: Em implementação  
**Restrições permanentes**: Ver [constituição](../../.specify/memory/constitution.md) e [convenções](../../.ai/AI_CONVENTIONS.md).

## Contexto e objetivo

Evoluir o sistema **Lá Divino Sabor** para aumentar a agilidade de lançamentos, estruturar pedidos com múltiplos produtos, habilitar recebimentos parciais auditáveis, registrar notas fiscais de compra com vários itens e implantar controle quantitativo real de estoque para ingredientes e materiais, preservando integralmente dados legados, perfis `admin`/`viewer`, regras do Firestore e identidade visual.

## Cenários e requisitos por módulo

### US1 — Ordenação alfabética nos cadastros e seletores (Prioridade P1)
- Ordenar A–Z (`Intl.Collator("pt-BR", { sensitivity: "base", numeric: true })`) os registros das cinco abas de Cadastros: Clientes, Produtos, Receitas, Ingredientes e Materiais, antes da paginação.
- Ordenar igualmente os seletores e listas de seleção nos formulários de Vendas, Encomendas, Receitas, Produtos, Financeiro, Estoque e Relatórios.
- Preservar busca, filtro de arquivados, paginação e reativação sem alterar documentos no Firestore.

### US2 — Vendas com múltiplos produtos (`Salvar e continuar`) e visualização agrupada (Prioridade P1)
- Adicionar botão **Salvar e continuar** ao formulário de Vendas, ao lado de **Cancelar** e **Salvar**.
- Ao usar **Salvar e continuar**, gravar imediatamente o item atual no Firestore com um identificador de compra (`pedidoId`) e manter cliente, data, pagamento, situação e `pedidoId` abertos para o próximo produto, listando os itens já gravados e alertando que o cancelamento posterior não apaga itens já confirmados.
- Na listagem de Vendas, agrupar itens com o mesmo `pedidoId` em uma linha resumida com **Ver detalhes** (exibindo produto, quantidade, valor unitário, subtotal e ações por item) e organizar visualmente por data e cliente sem fundir pedidos distintos do mesmo dia nem inventar vínculo para registros legados sem `pedidoId`.
- Exibir etiqueta `N produtos` ao lado do cliente **somente** quando uma mesma compra (`pedidoId`) possuir mais de 1 produto distinto (não pela soma de unidades do mesmo produto nem pela soma histórica do cliente).

### US3 — Encomendas estruturadas, acessórios opcionais, agrupamento e ordenação por data (Prioridade P1)
- Substituir o fluxo principal de texto livre por seleção alfabética de produtos ativos cadastrados (com ID, preço sugerido editável, quantidade e subtotal) e suporte a múltiplos produtos na mesma encomenda, mantendo `observacoes` e compatibilidade com `produtoDescricao` legado.
- Permitir selecionar materiais/acessórios (ou descrição manual) marcando explicitamente se são **cobrados separadamente do cliente** (somam no `valorTotal`) ou **uso interno / já inclusos** (não inflam `valorTotal`), evitando duplicação com materiais já embutidos no produto.
- Ordenar Encomendas por `dataEntrega` **decrescente** por padrão, com cabeçalho clicável na coluna **Entrega** alternando entre mais recente primeiro e mais antiga primeiro (critério determinístico por nome do cliente e ID em datas iguais).
- Agrupar visualmente na tabela os lançamentos do mesmo cliente (por `clienteId`, ou compatibilidade de nome documentada para legados) e mesma `dataEntrega`, com **Ver detalhes** revelando cada lançamento individual, sem fundir identidades financeiras nem aplicar ações em lote sem confirmação específica. Paginação conta agrupamentos.

### US4 — Cobranças com recebimento parcial e histórico auditável (Prioridade P1)
- No modal **Baixar lançamento**, exibir cliente, referência, valor original, total já recebido, saldo pendente, flag **Quitar saldo restante (pagamento total)** (desmarcada inicialmente), campos **Valor recebido agora (R$)**, **Data do recebimento** e **Forma de pagamento**, **Cancelar** e botão único **Confirmar recebimento**. Quando marcada, preenche automaticamente o campo com o saldo restante atualizado em modo somente leitura e prevê saldo `R$ 0,00`; quando desmarcada, aceita valor manual, valida limites e exibe o saldo restante em aberto.
- Permitir pagamentos parciais sucessivos em vendas (individuais ou agrupadas por `pedidoId`) e encomendas, gravando histórico auditável na coleção `recebimentos` com data efetiva, valor, origem e vínculo.
- Não marcar venda parcialmente paga como quitada (`status` permanece `"P"` com `valorPago` atualizado). Em encomendas, atualizar `valorEntrada` sem exigir mudança automática de `Em Produção` para `Finalizado` ao quitar o saldo financeiro.
- Bloquear valor `<= 0`, negativo, acima do saldo pendente, duplo clique e edição concorrente (`expectedUpdatedAt`).
- Manter quitação total por cliente deixando explícito o alcance (quantas vendas e encomendas serão quitadas). Contatos em `cobrancas` continuam sendo apenas histórico de contato.

### US5 — Financeiro com despesa simples e Nota Fiscal multi-item (Prioridade P1)
- Manter **Registrar despesa** (despesa simples, com opção explícita e opcional de registrar entrada no estoque quando vinculada a ingrediente/material cadastrado e quantidade/unidade válidas).
- Criar fluxo **Registrar nota fiscal** com cabeçalho (`data`, `fornecedor`, `numeroNota`, `tipo`, `observacoes`) e lista editável de itens (`ingrediente` ou `material`, seleção rápida 1/2/3/outro, quantidade numérica, unidade compatível, valor unitário e subtotal).
- Persistir a nota como **um único documento** em `despesas` (`isNotaFiscal: true` e `itensNota`), evitando dupla contagem no financeiro, com **Ver detalhes** na tabela.

### US6 — Estoque quantitativo real (Prioridade P1)
- Criar aba/módulo **Estoque** com consulta de saldos por ingrediente e material, alertas de estoque mínimo e histórico de movimentações (`movimentacoes_estoque`).
- Disponibilizar **Saldo inicial** explícito (sem atribuir saldos fictícios a registros antigos), **Saída manual** (produção, consumo, perda, descarte, outros), **Ajuste de estoque** com motivo obrigatório e configuração de **Estoque mínimo**.
- Integrar entradas automáticas transacionais ao salvar **Nota fiscal** (ou despesa simples com entrada marcada), com proteção contra duplicação (`create` idempotente por item da nota) e tratamento seguro de exclusão/estorno de notas já movimentadas (bloqueando exclusão se o saldo já foi consumido).
- Normalizar unidades compatíveis (`g`/`kg`, `ml`/`l`, `unidade`) sem misturar grandezas incompatíveis.
- Não ativar baixa automática pela venda/encomenda nesta entrega; registrar proposta técnica separada para decisão futura.

### US7 — Consistência entre indicadores, relatórios, regras e exportação (Prioridade P1)
- Garantir consistência entre Dashboard, Vendas, Encomendas, Financeiro, Cobranças, Estoque e Relatórios, usando data efetiva de `recebimentos` para novos pagamentos sem inventar datas para pagamentos legados.
- Expandir Relatórios com abas/seções confiáveis para vendas (por cliente, produto e recebimentos), encomendas estruturadas no período, estoque atual e compras de insumos/materiais por período.
- Atualizar `firestore.rules`, `subscribeData`, backup JSON (`collections`) e suíte completa de testes.

## Critérios de aceite mensuráveis
- **SC-001**: Ordenação A–Z `pt-BR` aplicada antes da paginação nos 5 cadastros e em todos os seletores de formulário.
- **SC-002**: Pagamento parcial de R$ 40,00 sobre R$ 100,00 mantém R$ 60,00 pendentes; segundo pagamento de R$ 60,00 quita sem duplicação e gera 2 registros em `recebimentos`.
- **SC-003**: Nota fiscal com N itens gera exatamente 1 documento em `despesas` e N movimentações únicas em `movimentacoes_estoque`, atualizando os saldos atomicamente.
- **SC-004**: Exclusão de nota com estoque ainda disponível estorna o saldo na mesma transação; exclusão com saldo já consumido é bloqueada.
- **SC-005**: Venda com **Salvar e continuar** agrupa itens pelo mesmo `pedidoId`, exibe etiqueta `N produtos` apenas com mais de 1 produto distinto e mantém pedidos separados do mesmo cliente/dia independentes.
- **SC-006**: Encomendas iniciam ordenadas por `dataEntrega` decrescente com alternância clicável, agrupamento visual por `(cliente, dataEntrega)` e seleção de produtos e acessórios opcionais.
- **SC-007**: `npm run check`, `npm run build`, `npm run test:e2e`, `npm run test:responsive`, `npm run test:pwa`, `npm run test:rules` e `npm run test:integration` passam integralmente.
