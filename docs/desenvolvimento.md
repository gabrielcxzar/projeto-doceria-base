# Desenvolvimento com Bootstrap e Spec Kit

## Ordem adotada e fontes de verdade

O AI Project Bootstrap foi aplicado primeiro para tornar explícitos o contexto e o sistema existente. O Spec Kit foi instalado depois para conduzir mudanças delimitadas. Consulte a [decisão ADR-004](DECISIONS.md) e a [auditoria](../.meta/AUDIT.md).

| Informação                               | Fonte                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------- |
| Instalar/executar a aplicação            | `README.md` e `package.json`                                          |
| Comportamento implementado               | Código, configurações e testes; descrito em arquitetura/modelo/manual |
| Restrições permanentes aceitas           | `.specify/memory/constitution.md`                                     |
| Destinos e manutenção documental         | `.ai/AI_CONVENTIONS.md`                                               |
| Intenção, plano e tarefas de uma mudança | `specs/NNN-nome/`                                                     |
| Decisões duráveis                        | `docs/DECISIONS.md`                                                   |
| Auditoria e evidências                   | `.meta/` e checklist da feature                                       |

Templates e skills em inglês são infraestrutura oficial; os documentos preenchidos do projeto usam português. Não traduzir ou editar arquivos gerenciados pelo kit somente para uniformizar estilo.

## Versões e instalação

- AI Project Bootstrap: **1.0.0**, revisão de origem `6a13dd6`, workflow público `bootstrap`, nível **Standard**, perfis React e Node.
- GitHub Spec Kit: **1.2.3**, tag oficial `v1.2.3`, integração **Codex**, scripts **PowerShell**.
- Constituição do projeto: **1.0.0**.

A instalação global encontrada do Specify era diferente e foi preservada. Para comandos administrativos desta adoção, use a versão fixada:

```powershell
uvx --from 'git+https://github.com/github/spec-kit.git@v1.2.3' specify version
uvx --from 'git+https://github.com/github/spec-kit.git@v1.2.3' specify integration list
```

O kit já está inicializado neste checkout. Não é necessário repetir `init` para cada feature. Em uma atualização, revise a documentação oficial e o diff; mantenha a constituição preenchida e as customizações. Não atualize a instalação global ou outros projetos como efeito colateral.

## Skills no chat do Codex

As skills oficiais estão em `.agents/skills/`. Use-as no chat, não no PowerShell:

```text
$speckit-specify Descreva uma mudança limitada e as compatibilidades necessárias.
$speckit-clarify
$speckit-plan Preserve a arquitetura atual e explicite as restrições do Firebase.
$speckit-tasks
$speckit-analyze
$speckit-implement
$speckit-converge
```

Cada linha é uma etapa separada: confira o resultado antes de avançar. Clarificação serve para dúvidas reais, não para perguntar fatos que o agente pode verificar no código. A constituição já existe; `$speckit-constitution` é usado para uma emenda de princípios quando necessária, não em toda tarefa.

`$speckit-checklist` oferece checklists adicionais quando úteis. A skill antiga `speckit-taskstoissues` está presente por compatibilidade upstream e é descontinuada; criar issues não faz parte da adoção e não deve ocorrer automaticamente.

As skills recém-adicionadas podem precisar de uma nova sessão do agente para aparecer na descoberta automática. Seus arquivos e scripts já podem ser inspecionados diretamente no repositório.

## Selecionar uma feature e verificar pré-requisitos

O ponteiro `.specify/feature.json` é estado local ignorado pelo Git. Em outro checkout, selecione explicitamente a feature desejada antes de executar scripts:

```powershell
$env:SPECIFY_FEATURE_DIRECTORY = (Resolve-Path -LiteralPath 'specs/001-adocao-documentacao').Path
& ./.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireSpec -RequireTasks -IncludeTasks
```

Isso seleciona a feature somente para o processo e pode persistir o ponteiro local, conforme o script oficial. Não versionar esse ponteiro nem exportar a variável globalmente no Windows. Substitua o caminho quando trabalhar em outra feature.

Para validar resolução sem escrita de ponteiro:

```powershell
& ./.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly
```

O comando de especificação cria o diretório da nova feature. A integração de Git é opcional no Spec Kit; nesta adoção não foi instalada uma extensão de Git. A branch de trabalho é gerenciada normalmente pelo Git do repositório, sem confundir o nome da branch com o diretório selecionado.

## Manter as ferramentas sem misturar responsabilidades

- Mantenha os arquivos oficiais em `.specify/` e `.agents/skills/` versionados, incluindo metadados de integração. Preserve o `.gitignore` gerado para estado por máquina.
- `.gitattributes` preserva LF somente nos artefatos dessas ferramentas, para os hashes dos manifests permanecerem estáveis em Windows e Linux.
- Não adicione credenciais do agente a essas pastas. Só as skills oficiais fazem parte da adoção.
- Não altere os templates upstream para copiar a constituição. Eles a leem durante o workflow.
- Uma feature concluída fica como histórico. Abra outra feature para um novo requisito, atualizando também os documentos do sistema corrente que forem afetados.
- Sem alterar aplicação, regras ou publicação nesta adoção. A [matriz de validação](operacao.md) define os checks proporcionais.

O exemplo concluído desta adoção está em [specs/001-adocao-documentacao](../specs/001-adocao-documentacao/quickstart.md).

Fontes oficiais: [adoção em projeto existente](https://github.github.io/spec-kit/guides/existing-projects.html), [integração Codex](https://github.github.io/spec-kit/integrations/codex.html) e [instalação](https://github.github.io/spec-kit/installation.html).
