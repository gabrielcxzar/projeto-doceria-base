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
