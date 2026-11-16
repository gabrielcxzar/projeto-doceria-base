# Especificação: Apresentação vertical dos itens nas encomendas

**Feature Branch**: `feat/encomendas-detalhes-itens`  
**Created**: 2026-11-16  
**Status**: Concluída (validada localmente na branch dedicada)  
**Restrições permanentes**: Ver [constituição](../../.specify/memory/constitution.md) e [convenções](../../.ai/AI_CONVENTIONS.md).

## Contexto e objetivo

Melhorar a legibilidade dos detalhes de pedidos na tela **Encomendas** ao clicar em **Ver detalhes**, exibindo cada produto e acessório estruturado em uma linha separada (`1× Produto` e preço), eliminando concatenações por ponto ou vírgula e descrições repetidas dentro da área expandida, sem alterar cálculos, contratos do Firestore ou agrupamento por cliente e data de entrega.

## Requisitos

1. **Exibição por linha em Ver detalhes (`Orders` em `src/pages.tsx`):**
   - Para encomendas com itens estruturados (`itens[]` e/ou `acessorios[]`), não exibir o resumo concatenado `orderSummary(o)` nem listas `.join(", ")` dentro dos detalhes.
   - Listar cada produto de `itens[]` em uma linha própria (`{quantidade}× {produtoNome}` + valor `{money(subtotal)}`) e cada acessório de `acessorios[]` em uma linha própria (`{quantidade}× {descricao}`, tipo cobrado/incluso e valor ou `Incluso`).
   - Preservar `Obs.: {observacoes}` (quando preenchida), situação da encomenda, ações individuais (editar/arquivar ou excluir) e resumo financeiro (`Total`, `Recebido`, `A receber`).
2. **Múltiplas encomendas agrupadas e compatibilidade com legado:**
   - Quando um grupo `(cliente, dataEntrega)` tiver várias encomendas, discriminar os itens individualmente dentro de cada bloco de encomenda (`Encomenda 1`, `Encomenda 2`, ...).
   - Para encomendas antigas que possuam apenas `produtoDescricao` (sem `itens[]` nem `acessorios[]`), preservar a exibição de `produtoDescricao` sem inventar itens estruturados.
3. **Preservação de tela principal e dados:**
   - Manter o cabeçalho e linhas principais da tabela de Encomendas compactos e legíveis.
   - Nenhuma alteração em documentos Firestore, regras ou valores financeiros.
   - Responsividade garantida em desktop e celular, inclusive com nomes longos (`overflow-wrap: anywhere`).

## Critérios de aceite
- **SC-001**: Encomenda com 1 ou múltiplos produtos exibe cada produto em sua própria linha em **Ver detalhes**, com preço discriminado e sem strings concatenadas redundantes.
- **SC-002**: Agrupamento com múltiplas encomendas do mesmo cliente/data exibe os produtos de cada encomenda em blocos separados e mantém totais corretos.
- **SC-003**: Encomendas legadas somente com `produtoDescricao` continuam legíveis sem perda de informação.
- **SC-004**: `npm run check`, `npm run build`, `npm run test:e2e`, `npm run test:integration` e testes responsivos em desktop/mobile passam sem regressões.
