# Tasks: Adoção de documentação e SDD

**Input:** [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md) e [auditoria](../../.meta/AUDIT.md).

## Fase 1 — Evidência e estrutura

- [x] T001 Auditar código, configurações, testes e documentação em `.meta/AUDIT.md` (FR-001, FR-002).
- [x] T002 Registrar classificação parcial, idioma pt-BR, equivalências e perfis React/Node na auditoria (FR-001, FR-006).
- [x] T003 Criar `.ai/AI_CONVENTIONS.md` e `.ai/CONTEXT.md` preservando `AGENTS.md` como entrada única (FR-002, FR-008).

## Fase 2 — US1: documentação utilizável

- [x] T004 [US1] Documentar componentes e fluxos em `docs/ARCHITECTURE.md` (FR-002).
- [x] T005 [US1] Documentar contratos e cálculos em `docs/modelo-de-dados.md` (FR-002).
- [x] T006 [US1] Criar `docs/manual-de-uso.md`, `docs/operacao.md` e `docs/DECISIONS.md` (FR-002).
- [x] T007 [US1] Integrar índice `docs/README.md`, README e instruções de agentes sem mover o histórico (FR-002, FR-006, FR-008).

## Fase 3 — US2: kit e workflow

- [x] T008 [US2] Inicializar Spec Kit 1.2.3 oficial, Codex/PowerShell em `.specify/` e `.agents/skills/` (FR-003).
- [x] T009 [US2] Resolver template oficial e preencher `.specify/memory/constitution.md` em versão 1.0.0 (FR-004).
- [x] T010 [US2] Preencher `specs/001-adocao-documentacao/` e `docs/desenvolvimento.md` com fluxo reproduzível (FR-005).
- [x] T011 [US2] Validar templates, integração e pré-requisitos reais; registrar evidência em `checklists/requirements.md` (FR-003, FR-005, FR-009).

## Fase 4 — US3: preservação e conclusão

- [x] T012 [US3] Validar links e ausência de placeholders nos documentos autorais (FR-009).
- [x] T013 [US3] Executar `npm run check`, revisar diff funcional e segredos (FR-008, FR-009).
- [x] T014 [US3] Registrar `bootstrap.yaml` e `.ai/CHANGELOG_AI.md` após sucesso das validações (FR-007).
- [x] T015 [US3] Finalizar checklist de aceite e estado da feature (FR-005, FR-009).

## Dependências

T001–T003 antecedem os documentos. T004–T007 formam a base do projeto antes do kit. T008 antecede T009–T011. T012–T015 encerram a adoção. Não há implementação funcional, dados novos ou etapa de deploy.
