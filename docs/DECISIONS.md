# Decisões

Não apagar decisões antigas. Uma substituição deve apontar para a decisão anterior e explicar a mudança. As entradas de 2026-10-23 abaixo se apoiam no código, no histórico e nas escolhas confirmadas durante a recuperação.

## ADR-001 — Manter Firebase e os dados existentes

**Status:** aceita, 2026-10-23.

**Contexto:** a indisponibilidade funcional foi causada por JavaScript inválido, não pela necessidade de recriar o banco. O projeto já possuía contas e dados comerciais.

**Decisão:** preservar Hosting, Authentication, Firestore e o projeto `gestao-de-confeitaria`; manter os contratos legados e acrescentar IDs/aliases de maneira compatível.

**Alternativas:** recriar o projeto ou migrar o backend. Sem necessidade evidenciada, aumentariam risco e trabalho.

**Consequência:** evoluções devem respeitar os dados já gravados e testar autorização. Evidências em [reformulacao.md](reformulacao.md), `src/firebase.ts` e `src/domain.ts`.

## ADR-002 — SPA React/TypeScript/Vite e PWA com gravação online

**Status:** aceita, 2026-10-23.

**Decisão:** interface interna responsiva, compilada como arquivos estáticos, com validações e checks antes da publicação. PWA instalável, sem fila de gravação offline; transações reconfirmam permissões e versão dos registros.

**Alternativas:** manter o módulo JavaScript monolítico ou acrescentar servidor/infraestrutura desnecessária. HTML/CSS/JavaScript não foram considerados inadequados por si mesmos; a mudança buscou organização e validação.

**Consequência:** operação offline completa e sincronização de conflitos são outro escopo. Não habilitar serviços pagos apenas para hospedar a SPA.

## ADR-003 — Preservar relações e distinguir caixa de lucro

**Status:** aceita, 2026-10-23.

**Decisão:** arquivar cadastros em vez de apagá-los, derivar totais por cliente dos registros e manter snapshots de custo onde disponíveis. Mostrar recebido menos despesas como resultado de caixa, com custo de produção informativo.

**Consequência:** agregados legados continuam preservados no documento; não são a fonte da tela atual. Não inventar datas de recebimentos ou custos históricos que o legado não guardou. Consulte o [modelo de dados](modelo-de-dados.md).

## ADR-004 — Bootstrap antes de Spec Kit

**Status:** aceita para este pedido, 2026-10-23.

**Contexto:** havia README e histórico, mas faltava documentação de arquitetura, dados e colaboração. O usuário solicitou avaliar o AI Project Bootstrap local e aplicar Spec Kit.

**Decisão:** usar o workflow público `bootstrap` do AI Project Bootstrap 1.0.0 em nível Standard, documentando o baseline primeiro; depois inicializar GitHub Spec Kit oficial com versão fixa, integração Codex e PowerShell. Manter `AGENTS.md` existente como entrada e usar a constituição como fonte dos princípios permanentes.

**Alternativas:** apenas Spec Kit deixaria o contexto atual implícito; gerar todos os templates de ambos criaria duplicação. O padrão público Standard satisfaz o pedido sem impor o bootstrap enterprise completo ou uma etapa de aprovação não solicitada.

**Consequência:** `.ai/` guarda contexto/convenções, `docs/` conhecimento técnico, `.meta/` auditoria, `.specify/` infraestrutura e `specs/` mudanças delimitadas. O README e o histórico não são movidos. Versionar adoção em `bootstrap.yaml` somente depois de validada.

Referências: [auditoria](../.meta/AUDIT.md), [guia oficial para projetos existentes](https://github.github.io/spec-kit/guides/existing-projects.html) e [instalação oficial](https://github.github.io/spec-kit/installation.html).

## ADR-005 — Marca original e rolagem acessível em toda a interface

**Status:** aceita, 2026-10-23, conforme correção solicitada pelo mantenedor.

**Contexto:** a reformulação substituiu a marca por texto e um ícone genérico, contrariando a preservação da identidade. O menu fixo também deixava ações fora da tela em janelas baixas.

**Decisão:** usar o arquivo original `public/images/logo.png` integralmente no layout, favicon e PWA. O blob Git deve continuar `0b344d7417c4f20b811eb09ba2401c080cc64aa3`. Remover os ícones substitutos e seu gerador. Toda a lateral pode rolar; tabelas rolam localmente e ações dos modais permanecem no fluxo, sem rodapé sobreposto ao conteúdo.

**Alternativas:** encolher toda a navegação, esconder ações ou recriar a marca. Não satisfariam acesso integral e preservação da identidade.

**Consequência:** o PNG original de 1024×1024 é maior que os antigos ícones genéricos, mas é armazenado no cache estático. O teste de instalação no Chromium valida seu uso no manifesto. A regressão cobre sete áreas, cinco cadastros e diálogos em 17 dimensões, com WebKit adicional; não substitui uma sessão em aparelhos físicos.

Requisitos e evidências: [feature 002](../specs/002-responsividade-identidade/spec.md) e [checklist](../specs/002-responsividade-identidade/checklists/requirements.md).

## ADR-006 — Permitir ocultar toda a lateral no computador

**Status:** aceita, 2026-10-23, por pedido do mantenedor.

**Decisão:** controle permanente no cabeçalho para ocultar/reabrir a lateral e liberar a largura da área de trabalho. Guardar a preferência somente neste navegador, sem relação com o estado temporário do drawer móvel. A marca original continua no cabeçalho e a navegação oculta não recebe foco.

**Consequência:** o usuário reabre a lateral pelo mesmo botão para escolher os módulos. Armazenamento bloqueado perde apenas a persistência da escolha, sem impedir o controle. Não há alteração no Firebase. Aceite em [feature 003](../specs/003-menu-lateral-recolhivel/spec.md).

## ADR-007 — Evolução operacional, recebimentos datados, notas fiscais e estoque quantitativo sem baixa automática de produção

**Status:** aceita, 2026-11-13 (implementada para homologação em branch dedicada `feat/evolucao-operacional-estoque`).

**Contexto:** a operação real demandou ordenação alfabética brasileira nos cadastros/seletores, registro sequencial de múltiplos itens em vendas (`Salvar e continuar` + `pedidoId`), recebimentos parciais auditáveis com data real de caixa, lançamento de notas fiscais com vários itens em um único documento de despesa, encomendas baseadas em produtos cadastrados com acessórios opcionais e controle real de estoque com base nas compras.

**Decisão:**
1. Preservar todos os documentos legados sem inventar saldos iniciais retroativos ou datas históricas de pagamentos anteriores; usar `Intl.Collator("pt-BR", { sensitivity: "base", numeric: true })` somente em memória antes da paginação.
2. Criar coleções imutáveis após escrita (`update: if false`) para `recebimentos` e `movimentacoes_estoque`, com `createOnly` transacional para evitar duplicação e proteger `despesas` com estorno seguro de estoque.
3. Desacoplar a quitação financeira em `encomendas` (`valorEntrada = valorTotal`) da conclusão de produção (`status = "Finalizado"`), pois quitar não significa que o pedido já foi produzido/entregue (decisão já documentada para validação final da equipe).
4. Não realizar baixa automática de ingredientes/materiais ao registrar vendas ou encomendas nesta entrega, mantendo o estoque rigoroso por entradas de compra, saldo inicial, saídas manuais e ajustes explícitos.

**Consequência:** nenhuma coleção existente sofreu migração destrutiva; relatórios de caixa contam `recebimentos` pela data efetiva sem contagem dupla sobre registros legados. Consulte [feature 004](../specs/004-evolucao-operacional-estoque/spec.md).

### Proposta futura separada — Baixa automática por ficha técnica na produção/venda

Como evolução independente futura (pendente de aprovação da operação após o uso estável do estoque atual):
1. **Rendimento e frações:** usar a composição de `produtos` (`composicaoReceitas` e `materiaisUtilizados`) e dividir os insumos de cada receita pelo `rendimento`, multiplicando pelas quantidades produzidas/vendidas, com validação de incompatibilidade entre produtos com base apenas manual (`custoMaterial`) e conversões (`kg`/`g`, `l`/`ml`, `unidade`).
2. **Gatilho configurável:** definir por decisão de negócio se a baixa ocorre ao registrar a `venda`, ao mover uma `encomenda` para `"Em Produção"` / `"Finalizado"`, ou por confirmação explícita ("Dar baixa da produção") para evitar duplicidade caso a confeitaria produza em lotes antecipados.
3. **Estorno e divergência:** prever estorno/reversão em cancelamentos, perdas operacionais e alertas claros caso o produto ainda não tenha ficha técnica vinculada ou o saldo em estoque esteja insuficiente ou não iniciado.

## ADR-008 — Cadastro de fornecedores, snapshot histórico e agrupamento por nota fiscal no Financeiro

**Status:** aceita, 2026-11-16 (implementada na branch `feat/fornecedores-notas-fiscais`).

**Contexto:** com notas fiscais multi-item já persistidas em um documento único de `despesas`, o sistema precisava padronizar o cadastro de fornecedores (formais ou informais), tornar o fornecedor obrigatório somente em novas notas fiscais (sem bloquear despesas simples ou notas antigas) e exibir cada nota em uma linha resumida expansível no Financeiro.

**Decisão:**
1. Adicionar a coleção de primeiro nível `fornecedores` (arquivável logicamente com `delete: if false`), exibida como sexta aba em Cadastros em ordem alfabética `pt-BR`.
2. Gravar `fornecedorId` e `fornecedorNome` (além de `fornecedor` por compatibilidade) nas novas notas fiscais; exibir o snapshot histórico original mesmo que o fornecedor seja renomeado ou arquivado, mantendo vínculo de filtros e consultas pelo `fornecedorId`.
3. Não auto-vincular registros legados sem `fornecedorId` por semelhança textual; permitir edição manual de cabeçalho/vínculo sem gerar novas movimentações em `movimentacoes_estoque`.
4. Manter agrupamento estritamente por nota fiscal (documento em `despesas`), nunca unindo notas distintas do mesmo fornecedor ou data, com expansão responsiva **Exibir itens** sobre `itensNota[]`.

**Consequência:** nenhuma nota histórica perde seus dados originais, despesas simples continuam dispensando fornecedor e a exportação JSON passa a abranger 15 coleções. Evidências em [feature 005](../specs/005-fornecedores-notas-fiscais/spec.md).

## ADR-009 — Entrada opcional de estoque por item na nota fiscal

**Status:** aceita, 2026-11-16 (implementada na branch `feat/nota-fiscal-estoque-opcional`).

**Contexto:** compras lançadas em notas fiscais podem combinar insumos que devem entrar no inventário com embalagens ou materiais pontuais que não devem movimentar o estoque, exigindo decisão individual por item sem afetar o total financeiro da nota.

**Decisão:**
1. Acrescentar `adicionarEstoque?: boolean` em `ExpenseInvoiceItem` (mantendo `geraEstoque` sincronizado por compatibilidade) com padrão `true` para ingredientes e materiais, sem flag global na nota.
2. Centralizar criação, edição por item e reconciliação líquida em `buildInvoiceMutations` e `buildExpenseDeletionMutations` (`src/domain.ts`), usando exclusivamente as movimentações gravadas em `movimentacoes_estoque` (`origemId`) para determinar o estado real de itens existentes sem presumir novas entradas para registros legados.
3. Permitir alternar **Adicionar ao estoque** antes de salvar e na edição da nota (estornando via `correcao_nota` apenas o item desmarcado quando houver saldo suficiente e nunca duplicando entradas existentes).

**Consequência:** notas fiscais mistas registram todos os itens no Financeiro com valor total intacto, movimentam o estoque apenas para os itens marcados e garantem estorno líquido exato em edições e exclusões. Evidências em [feature 006](../specs/006-nota-fiscal-estoque-opcional/spec.md).
