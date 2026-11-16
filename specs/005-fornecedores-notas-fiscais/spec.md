# Especificação: Cadastro de Fornecedores e Agrupamento de Notas Fiscais

**Feature Branch**: `feat/fornecedores-notas-fiscais`  
**Created**: 2026-11-16  
**Status**: Concluída (validada localmente na branch dedicada)  
**Restrições permanentes**: Ver [constituição](../../.specify/memory/constitution.md) e [convenções](../../.ai/AI_CONVENTIONS.md).

## Contexto e objetivo

Evoluir o sistema **Lá Divino Sabor** para adicionar o cadastro completo de **Fornecedores** (6ª aba em Cadastros) e melhorar a apresentação das notas fiscais no **Financeiro**, exibindo cada nota como um único lançamento resumido com expansão responsiva **Exibir itens** sobre a estrutura já implementada de `itensNota[]` e controle quantitativo de estoque, sem recriar fluxos financeiros nem quebrar dados históricos.

## Cenários e requisitos por módulo

### US1 — Cadastro de Fornecedores em Cadastros (Prioridade P1)
- Adicionar sexta aba **Fornecedores** em **Cadastros**, mantendo a ordem exata: `Clientes`, `Produtos`, `Receitas`, `Ingredientes`, `Materiais`, `Fornecedores`.
- Permitir cadastrar, editar, pesquisar (por nome/razão social, nome fantasia, CNPJ/CPF, contato ou e-mail), arquivar e reativar fornecedores.
- Campos:
  - `nome` (Nome / Razão social — obrigatório);
  - `nomeFantasia` (Nome fantasia — opcional);
  - `documento` (CNPJ / CPF — opcional, validando formato proporcional apenas quando preenchido);
  - `contato` (Telefone / WhatsApp — opcional);
  - `email` (E-mail — opcional);
  - `endereco` (Endereço — opcional);
  - `observacoes` (Observações — opcionais).
- Ordenação alfabética A–Z (`Intl.Collator("pt-BR")`) antes da paginação, preservando busca e exibição de arquivados.
- Persistir na coleção de primeiro nível `fornecedores`, integrada a tipos TypeScript, `subscribeData`, exportação JSON (15 coleções), regras `admin`/`viewer` e bloqueio de exclusão física em favor de arquivamento.

### US2 — Seleção obrigatória de fornecedor em Notas Fiscais e compatibilidade legada (Prioridade P1)
- Em **Financeiro > Registrar nota fiscal**, adicionar campo obrigatório **Fornecedor** como lista suspensa pesquisável em ordem alfabética com os fornecedores ativos, gravando `fornecedorId` e snapshot histórico `fornecedorNome` (mantendo `fornecedor` por compatibilidade).
- Disponibilizar ação rápida **+ Novo fornecedor** dentro do formulário da nota para cadastrar um fornecedor sem perder os itens já informados na nota.
- Manter **despesas simples** funcionando sem exigir fornecedor.
- Permitir edição de notas fiscais (fornecedor, data, categoria, número da nota, observações) **sem gerar novas movimentações de estoque** ao alterar o fornecedor ou cabeçalho.
- Para notas históricas sem `fornecedorId`, preservar o texto original em `fornecedor` sem atribuir vínculo automático por semelhança de nome, permitindo vinculação manual posterior.
- Renomear ou arquivar um fornecedor preserva `fornecedorNome` histórico nas notas já emitidas e mantém o vínculo por `fornecedorId`.

### US3 — Financeiro com agrupamento por Nota Fiscal, expansão **Exibir itens** e filtros (Prioridade P1)
- Exibir cada nota fiscal como uma única linha contendo: Data, Fornecedor (snapshot histórico e referência atual se renomeado), Número da nota (quando informado), Quantidade de itens, Valor total, botão **Exibir itens** (alternando com **Ocultar itens**) e ações autorizadas de edição/exclusão.
- Ao expandir, mostrar de forma responsiva (computador e celular) tabela de itens reais de `itensNota[]` com `Produto`, `Quantidade`, `Valor unitário`, `Subtotal` e `Total da nota`.
- Agrupar estritamente por nota fiscal (documento em `despesas`), nunca unindo notas distintas do mesmo fornecedor ou data.
- Diferenciar discretamente **Nota fiscal** e **Despesa simples**; despesas simples permanecem individuais sem grupos artificiais.
- Incluir filtros por fornecedor e tipo de lançamento (`Todos`, `Nota fiscal`, `Despesa simples`), ampliar busca para fornecedor/descrição/número da nota/itens, e manter filtros de categoria/período, ordenação decrescente por data (com alternância opcional) e paginação de 1 nota = 1 lançamento.

### US4 — Integração segura com estoque, regras e relatórios (Prioridade P1)
- Preservar entradas automáticas únicas na gravação da nota e estorno/bloqueio na exclusão conforme saldo em `estoqueAtual`.
- Atualizar `firestore.rules` (coleção `fornecedores` + exigência de `fornecedorId`/`fornecedorNome` em criação de `isNotaFiscal == true` sem obrigar em despesas simples nem bloquear edição legada).
- Atualizar tabela de compras em **Relatórios** para considerar `fornecedorId`/`fornecedorNome`/legado `fornecedor`.

## Critérios de aceite mensuráveis
- **SC-001**: Cadastro de fornecedor funciona com apenas `nome` preenchido e com todos os campos opcionais, ordenado A–Z em `pt-BR` antes da paginação, com busca, edição, arquivamento e reativação.
- **SC-002**: Nova nota fiscal impede salvar sem selecionar fornecedor (salva com `fornecedorId` + `fornecedorNome` + `fornecedor`), permite cadastrar fornecedor inline mantendo itens na tela, e despesa simples continua salvando sem fornecedor.
- **SC-003**: Duas notas fiscais distintas do mesmo fornecedor aparecem como duas linhas separadas na tabela do Financeiro; uma nota com múltiplos itens aparece como 1 linha com **Exibir itens**, soma de subtotais igual ao total e expansão responsiva em desktop e mobile.
- **SC-004**: Renomear ou arquivar fornecedor preserva o snapshot histórico nas notas existentes e não quebra filtros/vínculos por `fornecedorId`; editar fornecedor em uma nota existente não cria novas movimentações em `movimentacoes_estoque`.
- **SC-005**: Notas fiscais antigas sem `fornecedorId` continuam legíveis, filtráveis e editáveis sem vinculação automática indevida.
- **SC-006**: `npm run check`, `npm run build`, `npm run test:e2e`, `npm run test:pwa`, `npm run test:rules`, `npm run test:integration` e `npm run test:responsive` passam com a cobertura nova adicionada.
