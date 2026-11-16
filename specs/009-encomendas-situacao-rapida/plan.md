# Plano Técnico: Ação rápida para alterar situação de encomendas

## Mudanças planejadas

1. **Desacoplamento operacional × financeiro:**
   - `src/domain.ts`: ajustar `orderReceived` e `orderRemaining` para depender exclusivamente de `valorEntrada` e `valorTotal` (removendo o atalho `o.status === "Finalizado" ? o.valorTotal : ...` / `? 0 : ...`).
   - `src/editors.tsx`: remover bloqueio antigo `orderObj.status === "Finalizado" && orderObj.valorEntrada !== orderObj.valorTotal`.
   - `firestore.rules`: remover condição `valorEntrada == valorTotal` exigida para `status == 'Finalizado'` em `/encomendas/{id}`, mantendo validação de enum e limites de `valorEntrada`.
2. **Ação rápida na interface (`src/pages.tsx` > `Orders`):**
   - Adicionar estado `const [statusTarget, setStatusTarget] = useState<Order | null>(null);` em `Orders`.
   - Exibir botão ícone (`aria-label={`Alterar situação da encomenda de ${o.clienteNome}`}`, com `<Check size={16} />` seguindo exatamente `Sales`) diretamente em `row-actions` quando `single && canWrite` e em cada item dentro de `isOpen` (`<Actions />` + botão de alteração rápida quando `canWrite`).
   - Implementar `OrderStatusDialog` mostrando cliente, identificação/descrição, data de entrega, situação atual (`Badge`), campo `Situação` (`select`) e botões `Cancelar` / `Confirmar`, com tratamento de erro explícito mantendo o diálogo aberto ou notificando conflito (`expectedUpdatedAt`).
3. **Testes:**
   - `src/domain.test.ts`: validar que finalizar encomenda com entrada parcial mantém `orderReceived === valorEntrada` e `orderRemaining > 0`.
   - `tests/rules.test.ts`: atualizar teste de `/encomendas` para comprovar que `status: "Finalizado"` com `valorEntrada < valorTotal` agora é aceito enquanto regras de enum/teto continuam bloqueando inválidos.
   - `tests/browser/preview.spec.ts`: testar alteração rápida individual, em encomenda agrupada (verificando preservação das outras encomendas e valores financeiros intactos), e ocultação para `viewer` em desktop e mobile.
   - `tests/browser/firebase.spec.ts`: testar alteração rápida no emulador Firestore (inclusive finalizando encomenda com saldo em aberto sem alterar `valorEntrada` nem `recebimentos`), conflito de concorrência (`expectedUpdatedAt`) e `viewer`.
   - `tests/browser/responsive.spec.ts`: inspecionar modal `Situação da encomenda` em desktop e mobile.
4. **Documentação (`docs/modelo-de-dados.md`, `docs/manual-de-uso.md`, `docs/DECISIONS.md`, `.ai/CONTEXT.md`, `.ai/CHANGELOG_AI.md`, `specs/009-encomendas-situacao-rapida/*`).**
