# Lá Divino Sabor Constitution

## Core Principles

### I. Compatibilidade e preservação do Firebase

Manter o projeto `gestao-de-confeitaria`, as contas, coleções, relações e dados existentes. Uma mudança de contrato deve explicitar leitura do legado, migração quando necessária, validação e reversão. Não recriar o banco, executar `firebase init`, habilitar serviços pagos ou alterar faturamento sem que isso faça parte do escopo autorizado pelo usuário. Esse princípio reduz o risco de uma melhoria apagar a operação real da confeitaria.

### II. Especificação delimitada e evidências

Antes de uma mudança relevante, registrar objetivo, escopo, critérios de aceite e restrições Firebase. Transformar o plano em tarefas verificáveis. Descrever o estado atual com evidências de código, configuração e testes; identificar inferências e conflitos. Preservar documentos úteis e evitar cópias concorrentes do mesmo conhecimento. Usar o Spec Kit para a próxima mudança delimitada, sem reespecificar retrospectivamente todo o sistema.

### III. Autorização efetiva e proteção de informações

Preservar os perfis `admin` e `viewer` em `usuarios/{uid}`. Gravação depende de administrador; conta sem perfil autorizado não deve consultar dados comerciais. Validar autorização nas regras, além da interface. Não versionar senhas, tokens administrativos, chaves do Stitch, hashes de autenticação, exportações reais ou dados pessoais em fixtures. Testar operações com dados fictícios e emuladores isolados, nunca com lançamentos comerciais falsos na produção.

### IV. Integridade das operações e transparência financeira

Exigir conexão para gravar. Manter operações relacionadas atômicas e detectar edição concorrente a partir da versão aberta pelo usuário. Não mostrar sucesso antes da confirmação do commit nem enfileirar gravação offline silenciosamente. Preservar vínculos por ID e compatibilidade com nomes legados. Distinguir total vendido, recebido, pendente, custos e resultado de caixa; não apresentar recebido menos despesas como lucro contábil nem inventar dados históricos ausentes.

### V. Qualidade proporcional e uso em celular/computador

Preservar os módulos internos confirmados, interface responsiva, campos rotulados e PWA instalável. Validar caminhos afetados e executar os checks exigidos para o tipo de mudança. Alterações em domínio, serviço, regras ou PWA devem incluir a verificação correspondente já existente. Uma mudança exclusivamente documental deve validar consistência, links e ferramentas, sem inventar testes funcionais que apenas repitam texto. Antes de concluir, revisar diff, segredos, artefatos locais e documentação afetada.

## Restrições de arquitetura e operação

A aplicação atual é uma SPA React/TypeScript/Vite publicada como arquivos estáticos. Adoção de servidor, sincronização offline completa, loja pública, estoque quantitativo, multiempresa ou outro serviço representa novo escopo. Não tratar sugestões visuais do Stitch como funcionalidades já aprovadas.

O projeto de emuladores é `demo-doceria`. Uma prévia do Hosting não isola o banco real. O JSON de exportação cobre coleções conhecidas, não contas/senhas Authentication ou infraestrutura, e não realiza restauração automática.

As descrições detalhadas ficam na [arquitetura](../../docs/ARCHITECTURE.md), no [modelo de dados](../../docs/modelo-de-dados.md) e no [guia operacional](../../docs/operacao.md), sem repetir esta constituição em cada template.

## Workflow e revisão

Ler primeiro as [convenções](../../.ai/AI_CONVENTIONS.md) e o [contexto](../../.ai/CONTEXT.md). Para mudança relevante, manter `spec.md`, `plan.md`, `tasks.md` e evidências de aceite na mesma pasta `specs/NNN-nome/`. Analisar consistência antes de implementar e reconciliar as evidências ao concluir.

Requisitos de uma feature concluída permanecem como registro histórico. Documentos de arquitetura, dados e operação descrevem o sistema corrente. Atualizar o dono da informação e registrar decisões duráveis sem apagar decisões antigas. Validar instruções e comandos contra os arquivos executáveis do projeto.

O workflow GitHub valida PRs e publica em push em `main`. Não pular seus gates para publicar código. Um pedido documental não exige alterações funcionais ou operações Firebase; não introduzi-las incidentalmente.

## Governance

Esta é a constituição inicial, versão 1.0.0, fundamentada nas escolhas já confirmadas do projeto e nesta adoção documental. Instruções explícitas do usuário e do ambiente têm precedência; divergências devem ser registradas e reconciliadas.

Mudanças nos princípios exigem justificativa, revisão dos artefatos afetados e registro em `docs/DECISIONS.md`. Use SemVer: major para remoção/redefinição incompatível, minor para novo princípio ou expansão material, patch para esclarecimentos sem mudança de obrigação. Registre a data da emenda.

O mantenedor humano decide novas intenções comerciais e custos. Não inventar aprovações adicionais para trabalho já autorizado; registrar dúvidas reais quando as evidências não determinarem intenção ou houver risco de perda de dados. A governança documental e os destinos dos arquivos são mantidos nas convenções.

**Version**: 1.0.0 | **Ratified**: 2026-10-23 | **Last Amended**: 2026-10-23
