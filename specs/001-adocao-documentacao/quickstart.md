# Verificar esta adoção

## Entrada humana e agentes

1. Abra o [README](../../README.md) e siga o [índice](../../docs/README.md).
2. Confira [arquitetura](../../docs/ARCHITECTURE.md), [dados](../../docs/modelo-de-dados.md), [uso](../../docs/manual-de-uso.md) e [operação](../../docs/operacao.md).
3. Para trabalho por agente, comece em [AGENTS.md](../../AGENTS.md), [convenções](../../.ai/AI_CONVENTIONS.md), [contexto](../../.ai/CONTEXT.md) e [constituição](../../.specify/memory/constitution.md).

## Ferramentas

Na raiz do checkout, execute:

```powershell
uvx --from 'git+https://github.com/github/spec-kit.git@v1.2.3' specify integration list
$env:SPECIFY_FEATURE_DIRECTORY = (Resolve-Path -LiteralPath 'specs/001-adocao-documentacao').Path
& ./.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec -RequireTasks -IncludeTasks
npm run check
```

Resultado esperado: Codex instalado/default; pré-requisitos apontando para esta pasta e listando artefatos disponíveis; TypeScript e testes de domínio sem erro.

Não rode `init` novamente para verificar a instalação. Não execute deploy, emuladores ou mudanças no Firebase apenas para testar documentos. O [guia de desenvolvimento](../../docs/desenvolvimento.md) explica como usar as skills para a próxima feature.

## Revisão

Confira [tarefas](tasks.md) e [checklist](checklists/requirements.md). Os scripts e templates oficiais mantêm seus placeholders de exemplo por serem templates; os artefatos preenchidos desta pasta e a constituição não devem conservar esses placeholders.
