# Pesquisa e decisão de adoção

## Bootstrap primeiro

**Decisão:** usar o workflow público `bootstrap` com nível Standard.

**Evidência:** o framework local se destina a projetos existentes e exige preservar equivalências, documentar código/configuração e escolher o menor conjunto suficiente. A [auditoria](../../.meta/AUDIT.md) encontrou organização parcial, README e histórico úteis.

**Alternativas:** Spec Kit sozinho deixaria o contexto do sistema implícito; executar o bootstrap canônico enterprise completo produziria responsabilidades não justificadas neste repositório. O usuário pediu avaliação da ordem, não um inventário de templates vazio.

## Spec Kit oficial e fixado

**Decisão:** GitHub Spec Kit 1.2.3, tag oficial `v1.2.3`, executado por `uvx`, com integração Codex e PowerShell.

**Evidência:** [release oficial](https://github.com/github/spec-kit/releases/tag/v1.2.3), [instalação](https://github.github.io/spec-kit/installation.html) e [integração Codex](https://github.github.io/spec-kit/integrations/codex.html). A CLI global encontrada era `0.13.1.dev0`; não foi atualizada.

**Consequência:** metadados gerados registram versão 1.2.3 e skills em `.agents/skills/`. Templates correspondem à CLI usada, sem buscar uma versão diferente durante o init.

## Uso brownfield

O [guia oficial para projetos existentes](https://github.github.io/spec-kit/guides/existing-projects.html) recomenda registrar restrições verdadeiras e começar pela próxima mudança delimitada, sem recriar o sistema a partir de especificações. A primeira feature documenta esta adoção, não vendas/encomendas como desenvolvimento ainda pendente.

Os artefatos concluídos de uma feature são históricos; arquitetura/modelo/manual acompanham o estado atual. A constituição concentra princípios e as convenções concentram destinos e manutenção.

## Não aplicável

Não houve pesquisa de preço, migração de dados, alteração do Firebase ou escolha de um novo backend. Nenhuma regra comercial nova foi inferida para preencher os templates.
