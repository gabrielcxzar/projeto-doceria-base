# Checklist de aceite da adoção

Estado: concluída em 2026-10-23. Esta checklist registra verificações efetivamente executadas; não substitui os templates oficiais.

- [x] CHK001 Auditoria anterior ao kit, com idioma, perfis e equivalências (FR-001, FR-006).
- [x] CHK002 Arquitetura, dados/cálculos, uso e operação rastreáveis ao código (FR-002).
- [x] CHK003 Kit instalado por fonte oficial, versão 1.2.3, Codex e PowerShell (FR-003).
- [x] CHK004 Constituição 1.0.0 específica do projeto, sem requisitos comerciais inventados (FR-004).
- [x] CHK005 Spec, plano, pesquisa e tarefas tratam da adoção, sem duplicar o sistema inteiro (FR-005).
- [x] CHK006 Integração, resolução de templates e pré-requisitos executados com sucesso (FR-003, FR-009; SC-003).
- [x] CHK007 Links locais de documentos autorais válidos e sem placeholders pendentes (FR-009; SC-001, SC-005).
- [x] CHK008 `npm run check` passou; fonte/configuração funcional, dependências e workflow preservados (FR-008; SC-004).
- [x] CHK009 Diff sem segredos, dados reais ou ponteiro local versionado (FR-009; SC-005).
- [x] CHK010 `bootstrap.yaml` registrado somente após validação e changelog coerente (FR-007).
- [x] CHK011 Todos os requisitos FR-001–FR-009 cobertos por tarefas e evidências (SC-002).

## Evidências

- CLI oficial fixada reportou versão 1.2.3; `integration list` confirmou Codex instalado/default e scripts `ps` nos metadados.
- `create-new-feature.ps1` criou a feature 001; `resolve-template.ps1 constitution-template -Json` resolveu o template oficial.
- `setup-plan.ps1 -Json` preservou o plano preenchido; `setup-tasks.ps1 -Json` resolveu o template; `check-prerequisites.ps1 -Json -RequireSpec -RequireTasks -IncludeTasks` terminou com sucesso.
- Conferência de SHA-256 dos 22 arquivos gerenciados pelos manifests oficiais: nenhuma modificação upstream.
- Conferência dos links Markdown locais e placeholders dos documentos autorais: nenhuma ocorrência pendente.
- `npm run check`: TypeScript e 11 testes de domínio passaram. Não houve alteração funcional que justificasse repetir testes de navegador/emuladores nesta tarefa.
- Diff dos arquivos da aplicação, dependências, regras, configurações Firebase e workflow: vazio.
- `.specify/feature.json` ignorado pelo Git; revisão de candidatos ao Git sem chave Stitch, chave privada ou refresh token.
- Cobertura: FR-001 → T001/T002; FR-002 → T001/T003–T007; FR-003 → T008/T011; FR-004 → T009; FR-005 → T010/T011/T015; FR-006 → T002/T007; FR-007 → T014; FR-008 → T003/T007/T013; FR-009 → T011–T013/T015.

Não houve consulta a dados pessoais, escrita, migração ou publicação em produção para este aceite.
