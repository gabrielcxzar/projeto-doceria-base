# Especificação: Ação rápida para alterar situação de encomendas

**Feature Branch**: `feat/encomendas-situacao-rapida`  
**Created**: 2026-11-16  
**Status**: Concluída (validada localmente na branch dedicada)  
**Restrições permanentes**: Ver [constituição](../../.specify/memory/constitution.md) e [convenções](../../.ai/AI_CONVENTIONS.md).

## Contexto e objetivo

Adicionar uma ação rápida **Alterar situação** na tela **Encomendas** para atualizar exclusivamente a etapa operacional (`Pendente`, `Em Produção`, `Finalizado`) de uma encomenda individual (seja em linha avulsa ou dentro de um agrupamento expandido), sem exigir abrir o formulário completo de edição e mantendo a independência total entre etapa de produção e quitação financeira.

## Requisitos

1. **Ação unitária e visibilidade:**
   - Exibir botão **Alterar situação** na coluna **Ações** quando o agrupamento tiver uma única encomenda (`single`) e em cada item individual dentro de **Ver detalhes** quando houver múltiplas encomendas agrupadas.
   - Nunca criar botão em lote para alterar todas as encomendas do agrupamento ao mesmo tempo.
   - Disponível exclusivamente para administradores (`canWrite`).
2. **Modal `OrderStatusDialog` (`src/pages.tsx`):**
   - Exibir: nome do cliente, identificação/descrição da encomenda, data de entrega, situação atual, seletor com `Pendente`, `Em Produção`, `Finalizado`, botões **Cancelar** e **Confirmar**.
   - Ao confirmar, gravar apenas `{ status: nextStatus }` no documento selecionado usando `expectedUpdatedAt: versionOf(order)`, bloqueando submissões simultâneas e exibindo sucesso somente após confirmação.
   - Atualizar listagem e badge agregada (`Situações diferentes` vs status único) automaticamente sem recarregar.
3. **Independência operacional × financeira (desacoplamento):**
   - Finalizar (`status: "Finalizado"`) não registra recebimento, não altera `valorEntrada` nem zera saldo pendente (`orderRemaining` e `orderReceived` derivam exclusivamente de `valorEntrada` e `valorTotal`).
   - Remover a restrição legada que exigia `valorEntrada == valorTotal` para gravar `status = "Finalizado"` em `firestore.rules` e `src/editors.tsx`, preservando demais validações (`valorEntrada <= valorTotal`, `valorTotal > 0`, enum de `status` e formato de data).

## Critérios de aceite
- **SC-001**: Alteração rápida em encomenda única atualiza somente `status`, sem mudar `valorEntrada` nem saldo pendente.
- **SC-002**: Alteração rápida de 1 encomenda dentro de agrupamento múltiplo preserva intactas as situações das demais e recalcula a etiqueta agregada do grupo.
- **SC-003**: Conflito de concorrência (`expectedUpdatedAt`) é reportado ao usuário e não sobrescreve alteração concorrente.
- **SC-004**: Perfil `viewer` não vê nem executa a alteração rápida; funciona em desktop e celular.
