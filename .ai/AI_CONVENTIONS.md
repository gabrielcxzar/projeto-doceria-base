# Convenções de colaboração e documentação

## Inicialização obrigatória

Antes de criar, modificar, mover ou excluir arquivos neste repositório, leia este documento e valide o destino na tabela abaixo. Em seguida leia o [contexto](CONTEXT.md), a [constituição](../.specify/memory/constitution.md) e os documentos pertinentes à tarefa. As instruções explícitas do usuário e do ambiente mantêm sua precedência.

Preserve o `AGENTS.md` da raiz como entrada de agentes. Não crie outro arquivo com a mesma responsabilidade em `.ai/`. Não dependa de memória privada da sessão ou de um caminho absoluto na máquina do autor.

## Destinos e responsabilidades

| Conteúdo                                               | Destino                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| Aplicação, componentes, contratos e domínio            | `src/`                                                      |
| Testes de domínio próximos à implementação             | `src/*.test.ts`                                             |
| Regras e cenários de navegador                         | `tests/`                                                    |
| Assets publicados                                      | `public/`                                                   |
| Automação auxiliar do projeto                          | `scripts/`                                                  |
| Conhecimento técnico e manual de uso                   | `docs/`                                                     |
| Design e capturas intencionais com dados fictícios     | `docs/design/`                                              |
| Contexto de agentes e registro de mudanças por IA      | `.ai/`                                                      |
| Auditorias e evidências analíticas                     | `.meta/`                                                    |
| Constituição, templates e scripts oficiais Spec Kit    | `.specify/`                                                 |
| Skills oficiais da integração Codex                    | `.agents/skills/`                                           |
| Especificação, plano, tarefas e aceite de cada mudança | `specs/NNN-nome-da-mudanca/`                                |
| Arquivos locais, logs e exportações reais              | Fora do Git; temporários em diretório temporário do sistema |

Na raiz ficam somente entradas e configurações que pertencem a esse nível: `README.md`, `AGENTS.md`, `bootstrap.yaml`, `.gitattributes`, `package.json`, lockfile, `index.html` e configurações existentes de TypeScript, Vite, Playwright e Firebase. Um novo arquivo na raiz precisa ter responsabilidade que não caiba num dos destinos definidos.

## Fontes de verdade e preservação

- Para descrever o estado implementado, priorize código/configuração executável, testes, documentação atual e histórico, nessa ordem. Marque informação não comprovada como `*Inference*`.
- A constituição registra restrições aceitas; especificações descrevem mudanças pretendidas. Uma divergência com o código deve ser registrada e resolvida, não ocultada como comportamento já implementado.
- Atualize documentos equivalentes no lugar. Não mova arquivos ou renomeie pastas só para imitar um template.
- Preserve `docs/reformulacao.md` como histórico; não use esse documento para acrescentar tarefas futuras sem relação com a reformulação.
- Documentação autoral em português brasileiro. Artefatos oficiais de ferramentas podem permanecer em inglês para preservar sua manutenção upstream.

## Fluxo para mudanças

1. Leia contexto, constituição e evidências relacionadas.
2. Para mudança relevante, registre objetivo, escopo, critérios de aceite e restrições Firebase em uma especificação limitada ao pedido.
3. Gere ou atualize plano e tarefas verificáveis na mesma pasta de feature. Não crie uma especificação retroativa do sistema inteiro para cada tarefa.
4. Implemente em passos pequenos; valide somente os caminhos afetados e os checks obrigatórios aplicáveis.
5. Atualize o documento que possui o conhecimento alterado. Registre decisões duráveis em `docs/DECISIONS.md` e mudanças relevantes por IA em `.ai/CHANGELOG_AI.md`.
6. Revise diff, links, consistência documental, segredos e artefatos locais antes de concluir.

O Spec Kit organiza esse fluxo; o AI Project Bootstrap mantém contexto e documentação. Não duplique a constituição em prompts, README, planos e instruções de agentes: referencie sua localização.

## Firebase, dados e validação

As restrições de produção e qualidade estão na constituição. Os comandos reais são definidos em `package.json` e descritos no README e no guia operacional. Não redefina ferramentas ou papéis por suposição.

Não coloque senhas, chaves do Stitch, tokens administrativos, dumps reais ou dados pessoais em especificações e exemplos. A configuração web pública do Firebase não é uma credencial administrativa; movê-la de lugar não substitui regras de segurança.

Esta adoção documental não autoriza recriar o Firebase, habilitar cobranças, modificar regras ou publicar o site. A autorização de futuras tarefas deve ser interpretada a partir do pedido e da sessão, sem inventar aprovações adicionais para passos já autorizados.

## Manutenção e propriedade

O mantenedor humano decide intenção de produto, custos e mudanças incompatíveis. Quem altera um contrato mantém a documentação correspondente e as evidências de aceite. Agentes devem registrar dúvidas comerciais reais, sem perguntar ao usuário fatos verificáveis no repositório.

Os diretórios de features concluídas são registros históricos de mudanças. Ajustes posteriores do produto recebem uma nova feature; correções nas evidências de uma feature podem ser feitas com o motivo explícito. O contexto atual permanece em `.ai/CONTEXT.md` e nos documentos técnicos, evitando várias cópias concorrentes de uma especificação global.
