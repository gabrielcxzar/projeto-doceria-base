# Feature Specification: Adoção de documentação e SDD

**Feature Branch**: `docs/bootstrap-speckit`
**Created**: 2026-10-23
**Status**: Concluída e validada
**Input**: Aplicar Spec Kit e avaliar se o AI Project Bootstrap local deve vir primeiro.

## User Scenarios & Testing

### US1 — Entender e operar o projeto sem histórico do chat (Priority: P1)

Como mantenedor, quero descobrir arquitetura, dados, execução e decisões a partir do README, para manter o sistema sem depender da memória de uma sessão de IA.

**Why this priority**: a informação permanente estava limitada ao README e ao histórico da reformulação.
**Independent Test**: partir do README e localizar manual, arquitetura, modelo de dados, operação e contexto por links relativos válidos.

**Acceptance Scenarios**:

1. **Given** um checkout do projeto, **When** o mantenedor abre o README, **Then** encontra um índice da documentação e comandos existentes verificáveis.
2. **Given** uma dúvida de cálculo ou relação legada, **When** consulta o modelo de dados, **Then** encontra o contrato implementado e a origem no código.
3. **Given** o histórico e imagens já existentes, **When** a documentação é organizada, **Then** esses arquivos permanecem em seus locais e não são duplicados.

### US2 — Especificar a próxima mudança com ferramentas reais (Priority: P1)

Como agente ou desenvolvedor, quero infraestrutura oficial do Spec Kit, uma constituição preenchida e uma feature de exemplo verificável, para usar o processo na próxima tarefa.

**Why this priority**: instalar templates vazios sem integração ou regras específicas não satisfaz a adoção.
**Independent Test**: listar a integração Codex, resolver templates e executar o script de pré-requisitos para esta feature.

**Acceptance Scenarios**:

1. **Given** o projeto inicializado, **When** a integração é inspecionada, **Then** Codex está instalado e as skills, scripts PowerShell e versão estão registrados.
2. **Given** esta feature selecionada, **When** os pré-requisitos exigem spec, plan e tasks, **Then** a ferramenta resolve os três arquivos e retorna sucesso.
3. **Given** um agente novo, **When** lê `AGENTS.md`, **Then** encontra convenções, contexto, constituição e o fluxo de trabalho sem depender de caminho absoluto local.

### US3 — Documentar sem alterar a operação (Priority: P1)

Como responsável pela confeitaria, quero que a adoção documental preserve o site em uso e os dados, sem criar serviços ou custos novos.

**Why this priority**: documentação não justifica tocar em dados comerciais ou configurações de publicação.
**Independent Test**: revisar o diff e confirmar que código da aplicação, dependências, testes funcionais, Firebase e workflow não foram modificados.

**Acceptance Scenarios**:

1. **Given** a aplicação publicada, **When** o Bootstrap e o Spec Kit são aplicados, **Then** não há mudança em `src/`, `public/`, regras, `firebase.json` ou billing.
2. **Given** uma chave local ou estado de ferramenta, **When** o diff é revisado, **Then** segredos, logs e ponteiros por máquina não estão versionados.

### Edge Cases

- Documento existente equivalente: atualizar referências e preservar sua responsabilidade, sem copiar para um filename de framework.
- CLI global diferente: usar a versão estável fixada por `uvx`, sem atualizar ferramentas de outros projetos.
- Scripts com espaços no caminho Windows: validar resolução e execução no diretório real do projeto.
- Um template conter exemplos: exemplos permanecem no template upstream, mas não nos artefatos preenchidos da feature.
- Skill recém-instalada não aparecer na sessão aberta: os arquivos estão disponíveis para leitura; uma nova sessão pode ser necessária para descoberta automática.

## Requirements

### Functional Requirements

- **FR-001**: A adoção deve começar por auditoria e contexto do sistema existente, antes da inicialização do Spec Kit.
- **FR-002**: A documentação deve cobrir arquitetura, coleções/relações, cálculos, uso, ambientes, validação e decisões, com evidências no repositório.
- **FR-003**: O Spec Kit deve ser oficial, fixado em versão estável, com integração Codex e scripts PowerShell.
- **FR-004**: A constituição deve concentrar princípios aceitos, restrições Firebase e qualidade proporcional, sem placeholders pendentes.
- **FR-005**: A própria adoção deve ter especificação, plano, tarefas e checklist coerentes, sem fingir uma nova implementação funcional.
- **FR-006**: A documentação autoral deve usar pt-BR; templates/skills oficiais podem preservar inglês upstream.
- **FR-007**: A adoção deve registrar versão e nível do Bootstrap somente após validação bem-sucedida.
- **FR-008**: O sistema, Firebase, dependências e workflow existentes devem permanecer preservados.
- **FR-009**: Links locais devem resolver, os scripts oficiais devem funcionar e o diff não deve incluir segredos ou estado local.

### Key Entities

Documentos de contexto, documentos técnicos, constituição, integração oficial e feature de adoção. Nenhuma entidade comercial ou persistência Firebase será alterada.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Todos os links locais dos documentos autorais novos/alterados apontam para destinos existentes.
- **SC-002**: Os nove requisitos FR possuem cobertura em tarefas e evidências de aceite.
- **SC-003**: Pré-requisitos e resolução de templates terminam com sucesso no caminho Windows real.
- **SC-004**: Zero arquivos funcionais/Firebase/dependências/workflow alterados nesta feature.
- **SC-005**: Não há placeholders não resolvidos nos artefatos preenchidos nem segredos no conjunto proposto para o Git.

## Assumptions

- As decisões confirmadas na reformulação continuam válidas; mudanças de produto estão fora deste pedido.
- A documentação descreve código e contratos atuais, com limitações explícitas, sem nova consulta a dados pessoais de produção.
- O Spec Kit organizará mudanças futuras delimitadas. Não é necessário reimplementar o site para adotá-lo.
