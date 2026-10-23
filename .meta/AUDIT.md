# Auditoria documental e adoção SDD

Data: 2026-10-23. Baseline: commit `77417d3`. Escopo: documentação, governança e ferramentas locais de especificação. Nenhuma alteração funcional, migração de dados ou publicação Firebase é necessária nesta adoção.

## Objetivo, escopo e aceite

Aplicar primeiro o workflow público `bootstrap` do AI Project Bootstrap 1.0.0 (fonte local, revisão `6a13dd6`), nível Standard; em seguida instalar o GitHub Spec Kit oficial em versão estável fixada, com integração Codex e scripts PowerShell. O Bootstrap descreve o sistema existente; o Spec Kit especifica mudanças futuras.

Critérios verificáveis:

- Preservar README, `AGENTS.md`, histórico da reformulação, imagens e configurações executáveis.
- Documentar contexto, arquitetura, modelo de dados, operação e decisões a partir do código e dos testes.
- Instalar infraestrutura real do Spec Kit e validar seus comandos auxiliares, sem substituir a aplicação por um template.
- Preencher constituição e os artefatos da própria adoção; não apresentar o sistema inteiro como uma funcionalidade ainda por implementar.
- Manter fontes de verdade distintas e links válidos; registrar idioma, versões e responsabilidades.
- Revisar diff, segredos e arquivos gerados. Validar ferramentas e aplicação proporcionalmente à mudança documental.

Restrições Firebase: preservar `gestao-de-confeitaria`, contas, coleções, regras, índices, CLI e faturamento. Não executar `firebase init`, testes com escrita na produção, migrações, deploy ou criação de serviços nesta tarefa.

## Inventário confirmado

| Local                                                                  | Responsabilidade e evidência                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/main.tsx`, `src/App.tsx`                                          | Inicialização React, sessão, navegação por hash, demonstração local, operações e PWA |
| `src/pages.tsx`, `src/editors.tsx`, `src/ui.tsx`                       | Telas, formulários e componentes compartilhados                                      |
| `src/domain.ts`, `src/types.ts`                                        | Regras de negócio, cálculos, validações e contratos de dados                         |
| `src/firebase.ts`                                                      | Authentication, listeners Firestore, transações e exportação                         |
| `src/demo.ts`                                                          | Dados fictícios exclusivos da prévia de desenvolvimento                              |
| `public/`, `scripts/`                                                  | Assets, ícones e capturas; não há backend Node de produção                           |
| `firebase.json`, `.firebaserc`, `firestore.rules`                      | Hosting de `dist/`, projeto existente, emuladores e autorização                      |
| `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json` | React 19, TypeScript 5.9, Vite 8, Firebase 12, npm e compilação                      |
| `tests/`, `src/domain.test.ts`, `playwright*.config.ts`                | Testes de domínio, regras, navegador, integração e PWA                               |
| `.github/workflows/deploy.yml`                                         | Validação em PR e publicação somente por push em `main`                              |

Perfis aplicáveis: React e Node. O Node executa ferramentas de desenvolvimento e CI; não foi identificado servidor Node publicado. Repositório de uma aplicação, sem evidência de monorepo.

## Documentos existentes e equivalências

| Documento                                           | Classificação inicial                    | Tratamento                                                  |
| --------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `README.md`                                         | Atual; entrada humana e execução         | Preservar; acrescentar navegação e orientação SDD           |
| `AGENTS.md`                                         | Atual, porém incompleto para onboarding  | Preservar as três instruções SDD; acrescentar referências   |
| `docs/reformulacao.md`                              | Histórico atual da reformulação          | Preservar como evidência e especificação histórica          |
| `docs/design/stitch/`                               | Referências de design                    | Preservar; protótipos não equivalem a módulos implementados |
| `docs/design/aplicacao/`                            | Capturas com dados fictícios             | Preservar; não substituem teste de comportamento            |
| Arquitetura, decisões, modelo de dados e convenções | Ausentes como responsabilidades próprias | Criar documentos focados e ligados à entrada humana         |
| `.specify/`, `specs/` e skills Spec Kit             | Ausentes                                 | Inicializar após documentar o baseline                      |

Organização inicial: **parcial**. `docs/` já tem responsabilidade coerente; será preservado. Idioma confirmado: **pt-BR**, evidenciado por README, `AGENTS.md` e `docs/reformulacao.md`. Manter os arquivos oficiais gerados pelo Spec Kit no idioma upstream, com documentação autoral em português.

## Fatos, conflitos e limitações

- Há documentação útil desde a reformulação; a lacuna é sua cobertura e organização, não a ausência absoluta de arquivos.
- A versão global encontrada do Specify é `0.13.1.dev0`. A adoção usará uma versão estável fixada por `uvx`, sem atualizar a instalação global ou outros projetos.
- Authentication e regras usam perfis em `usuarios/{uid}`. Não há cadastro público nem administração de contas pela interface.
- A PWA armazena assets estáticos; o código não configura persistência Firestore em disco. Depois de reabrir offline, a consulta dos dados não é garantida. Gravações exigem conexão.
- A exportação cobre as 12 coleções conhecidas, não senhas/Auth ou infraestrutura. Não existe restauração automática.
- `ultimoBackup` existe no contrato, mas exportar o JSON não atualiza esse campo no código atual. Não documentar agendamento ou registro automático inexistente.
- Não há ESLint, backend próprio, loja pública, estoque quantitativo ou integração de pagamento automático configurados. Não inventar esses componentes.

## Seleção proporcional

Nível **Standard**: entrada humana, auditoria, instruções de agentes, contexto, arquitetura, decisões e registro de mudanças por IA. As convenções também cobrirão governança e a inicialização obrigatória dos agentes.

Não criar `MEMORY.md`, inventário separado, roadmap, catálogo de padrões, exemplos ou especificação global duplicada: contexto/decisões, esta auditoria, manual, código e histórico já terão essas responsabilidades. A própria adoção ficará em `specs/001-adocao-documentacao/`.

## Validação humana e inferências

As decisões de produto documentadas em `docs/reformulacao.md` foram confirmadas na sessão anterior. Regras atuais de autorização são verificáveis em `firestore.rules` e nos testes; isso não atribui intenção comercial nova ao código.

Nenhuma decisão humana pendente bloqueia a adoção documental. Retenção legal de dados, restauração operacional de backups e eventual operação offline completa não foram definidos pelo usuário e não serão inventados como compromissos.

## Execução e conclusão

Os resultados efetivamente executados serão registrados na checklist da adoção, em `specs/001-adocao-documentacao/`. O registro `bootstrap.yaml` será criado somente após a validação da documentação.
