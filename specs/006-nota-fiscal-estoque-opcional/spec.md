# Especificação: Entrada de estoque opcional por item da nota fiscal

**Feature Branch**: `feat/nota-fiscal-estoque-opcional`  
**Created**: 2026-11-16  
**Status**: Concluída (validada localmente na branch dedicada)  
**Restrições permanentes**: Ver [constituição](../../.specify/memory/constitution.md) e [convenções](../../.ai/AI_CONVENTIONS.md).

## Contexto e objetivo

Permitir que, em **Financeiro > Registrar nota fiscal** (e edição de notas), o usuário decida **individualmente por item** se a compra deve ou não gerar entrada de estoque, adicionando uma checkbox **[ ] Adicionar ao estoque** por item no formulário de inclusão e na relação de itens adicionados antes e durante a edição da nota, preservando o total financeiro da nota e a integridade das movimentações em `movimentacoes_estoque`.

## Requisitos

1. **Checkbox individual no construtor de itens da nota fiscal:**
   - Adicionar checkbox **Adicionar ao estoque** ao formulário de inclusão de itens elegíveis (`ingrediente` ou `material`), marcada por padrão para manter o fluxo rápido, porém permitindo desmarcá-la livremente por item.
   - Itens do tipo `outro` ("Outro (sem estoque)") não geram entrada no estoque.
2. **Persistência e exibição por item:**
   - Persistir a decisão individual em `itensNota[]` via `adicionarEstoque?: boolean` e `geraEstoque: boolean`.
   - Exibir claramente na relação de itens adicionados se cada item entra no estoque ou não, permitindo alternar a opção antes de salvar a nota, sem alterar o subtotal nem o valor total da nota fiscal.
3. **Criação e edição seguras (sem duplicação ou presunção sobre legados):**
   - Ao salvar nota fiscal com mistura de itens marcados e desmarcados, registrar todos os itens e o valor total completo em `despesas`, gerando `movimentacoes_estoque` e atualização de `estoqueAtual` **apenas** para os itens com entrada marcada.
   - Ao editar uma nota existente, determinar o estado real de estoque de cada item a partir das movimentações gravadas em `movimentacoes_estoque` (`origemId === nota.id`) e dos flags salvos, sem presumir que itens antigos sem a flag devem gerar novas entradas.
   - Permitir ligar/desligar **Adicionar ao estoque** por item na edição de forma transacional: desligar item com entrada ativa gera estorno (`correcao_nota`) apenas se o saldo disponível comportar; ligar item sem entrada ativa cria a movimentação única; itens cujo estado não mudou não geram novas movimentações.
4. **Exclusão/estorno e cancelamento:**
   - A exclusão da nota soma o saldo líquido de `movimentacoes_estoque` por item e estorna somente o que realmente entrou e ainda não foi estornado ou consumido.
   - No Financeiro e na visualização expandida **Exibir itens**, distinguir itens que entram no estoque dos que não movimentam estoque.
5. **Acessibilidade e responsividade:**
   - Funcionar integralmente em desktop e celular sem estouro horizontal.

## Critérios de aceite mensuráveis
- **SC-001**: Nota mista (3 itens marcados + 1 material/ingrediente desmarcado) registra os 4 itens e a soma dos 4 subtotais no total financeiro da nota, mas gera exatamente 3 movimentações de entrada sem alterar o saldo do item desmarcado.
- **SC-002**: Toggle da checkbox na inclusão e na lista antes de salvar atualiza a exibição e o comportamento ao gravar sem mudar preços ou total.
- **SC-003**: Edição de nota existente (inclusive nota antiga sem `adicionarEstoque` ou sem movimento) preserva o estado real sem duplicar entradas nem criar entradas indevidas; desmarcar item já entrado estorna apenas aquele item se houver saldo.
- **SC-004**: Exclusão de nota com itens mistos ou corrigidos estorna exatamente o saldo líquido criado e bloqueia apenas se o saldo necessário tiver sido consumido.
- **SC-005**: `npm run check`, `npm run build`, `npm run test:e2e`, `npm run test:rules`, `npm run test:integration`, `npm run test:pwa` e testes responsivos aprovados.
