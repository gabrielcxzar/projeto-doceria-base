# Implementation Plan: Documentação e SDD

**Branch**: `docs/bootstrap-speckit` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

## Summary

Aplicar o workflow público Standard do AI Project Bootstrap ao baseline existente e depois instalar GitHub Spec Kit 1.2.3. Preservar arquivos atuais, separar contexto permanente de features e preencher a própria adoção. Não modificar aplicação nem infraestrutura Firebase.

## Technical Context

- **Language/Version**: documentação autoral pt-BR; scripts PowerShell; Python 3.11+ para Specify. Ambiente validado: PowerShell 5.1 e Python 3.13.
- **Primary Dependencies**: AI Project Bootstrap 1.0.0, revisão `6a13dd6`; GitHub Spec Kit 1.2.3, fonte oficial fixada por tag.
- **Storage**: arquivos Markdown/YAML/JSON versionados; nenhum schema de banco novo.
- **Testing**: scripts oficiais Spec Kit, conferência de links/configuração, `npm run check`, diff e revisão de segredos.
- **Target Platform**: checkout Windows com espaços no caminho; integração Codex em `.agents/skills/`.
- **Project Type**: adoção documental numa SPA existente.
- **Performance Goals**: não aplicáveis a esta mudança; sem alterar bundle ou desempenho do produto.
- **Constraints**: preservar Firebase, custos, regras, workflows e dependências; não instalar ferramenta global nem hooks extras.
- **Scale/Scope**: um repositório, uma aplicação e uma feature de documentação. Não é adoção enterprise completa.

## Constitution Check

| Princípio                       | Antes da implementação                                        | Depois da implementação              |
| ------------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| I — Firebase e compatibilidade  | Nenhuma operação Firebase planejada                           | Conferir diff de arquivos protegidos |
| II — SDD e evidências           | Auditoria e especificação delimitadas                         | Rastrear FR a tarefas e checklist    |
| III — autorização e privacidade | Sem dumps reais ou credenciais                                | Revisar arquivos candidatos ao Git   |
| IV — integridade                | Nenhuma alteração de gravação ou cálculo                      | Confirmar `src/` intacto             |
| V — validação proporcional      | Validar documentação/ferramentas, sem testes funcionais novos | Executar checks e registrar limites  |

Não há violação que exija exceção constitucional.

## Project Structure

### Documentation (this feature)

```text
specs/001-adocao-documentacao/
  spec.md
  plan.md
  research.md
  quickstart.md
  tasks.md
  checklists/requirements.md
```

### Source Code (repository root)

```text
AGENTS.md                 entrada existente, expandida por referências
README.md                 entrada humana existente, preservada
bootstrap.yaml            adoção criada ao final
.ai/                      convenções, contexto e registro de IA
.meta/                    auditoria e evidências
.specify/                 infraestrutura oficial e constituição
.agents/skills/           skills oficiais Codex
docs/                     conhecimento, manual e histórico preservado
src/ public/ tests/       sem alteração nesta feature
```

**Structure Decision**: preservar `docs/` e entradas existentes. Acrescentar somente grupos de responsabilidade ausentes. Não criar um segundo `AGENTS.md`, memória duplicada, roadmap inventado ou nova API.

## Fases e validação

1. Auditar e registrar fontes, idioma e equivalências; selecionar Standard e perfis React/Node.
2. Escrever convenções/contexto e documentação técnica/operacional a partir do código.
3. Inicializar kit oficial; resolver constituição; preencher artefatos desta feature.
4. Validar integração, templates, caminhos, links, requisitos, preservação funcional e segredos.
5. Registrar adoção concluída e resultado no changelog e checklist.

Não criar `data-model.md` ou `contracts/` para esta feature: não há mudança de dados ou interface de serviço. O contrato comercial existente é descrito em `docs/modelo-de-dados.md`.

## Complexity Tracking

Sem exceções. Extensões de Git, bugs, GitHub Issues, execução remota ou eventos automáticos não são necessárias para este pedido. Os templates upstream permanecem gerenciados pelo kit e não são personalizados incidentalmente.
