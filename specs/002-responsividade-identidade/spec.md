# Feature Specification: Responsividade e identidade visual

**Feature Branch**: `fix/responsividade-identidade`
**Created**: 2026-10-23
**Status**: Concluída e publicada em 2026-10-23
**Input**: Revisar a responsividade do site inteiro, permitir acesso ao menu completo com rolagem e restaurar logo/favicon originais.

## User Scenarios & Testing

### US1 — Acessar toda a navegação (Priority: P1)

Como usuário em celular, tablet ou computador com pouca altura, preciso alcançar todos os itens do menu, exportação e saída.

**Independent Test**: abrir o menu em telas pequenas/reduzidas, rolar até as últimas ações e navegar sem cortes.

**Acceptance Scenarios**:
1. **Given** altura insuficiente para o menu, **When** o usuário rola a barra lateral, **Then** chega a todas as ações e percebe a área rolável.
2. **Given** menu móvel aberto, **When** fecha por botão, fundo ou Escape, **Then** retorna ao conteúdo e a rolagem normal é restaurada.
3. **Given** navegação por teclado, **When** abre o menu móvel, **Then** o foco fica no menu, todos os controles são alcançáveis e o fechamento devolve o foco.

### US2 — Operar todas as telas (Priority: P1)

Como membro da equipe, preciso ler filtros e resultados e usar os formulários em larguras pequenas e em paisagem, sem ações encobertas.

**Independent Test**: percorrer painel, vendas, encomendas, financeiro, todos os cadastros, cobranças e relatórios, abrindo formulários e diálogos nas dimensões da matriz.

**Acceptance Scenarios**:
1. **Given** uma tela entre 320 e 1920 pixels de largura, **When** abre qualquer área, **Then** a página não exige rolagem horizontal global.
2. **Given** uma tabela larga, **When** usa sua área de rolagem, **Then** alcança a última coluna e suas ações sem cortar a página.
3. **Given** formulário longo e pouca altura disponível, **When** rola seu conteúdo, **Then** consegue ler o total e alcançar salvar/cancelar sem sobreposição.
4. **Given** texto de cadastro longo, **When** aparece em listas, títulos e composições, **Then** não encobre botões nem expande a página além da tela.

### US3 — Reconhecer a marca original (Priority: P1)

Como responsável pela confeitaria, quero a logo original visível no acesso e na aplicação e o favicon original restaurado, preservando a identidade já combinada.

**Independent Test**: conferir a logo em login, menu e cabeçalho móvel; comparar o asset com o original do histórico e conferir os ícones publicados.

**Acceptance Scenarios**:
1. **Given** a logo original preservada no repositório, **When** abre login ou aplicação, **Then** vê a imagem inteira, sem recorte, deformação, recoloração ou substituição.
2. **Given** a versão atualizada, **When** o navegador solicita favicon/ícone do aplicativo, **Then** recebe a marca original.

### Edge Cases

Telas de 320px; celular em paisagem; notebook de 600px de altura; pouco espaço com teclado virtual; limites dos breakpoints; nomes longos; tema claro/escuro; perfil de consulta; reabertura de menu após mudança de tamanho; conteúdo maior que um modal.

## Requirements

- **FR-001**: O menu inteiro deve ser alcançável por rolagem em qualquer altura suportada.
- **FR-002**: O menu móvel deve oferecer fechamento claro, Escape e navegação por teclado, sem deixar a página bloqueada depois de fechar.
- **FR-003**: Todas as áreas e cadastros devem permanecer utilizáveis de 320px a desktop, sem rolagem horizontal da página.
- **FR-004**: Tabelas largas devem ter rolagem local e permitir alcançar ações finais.
- **FR-005**: Todos os formulários e diálogos devem manter conteúdo e ações acessíveis em telas pequenas e de pouca altura.
- **FR-006**: Restaurar a logo original nas entradas visuais da aplicação, favicon e ícone instalável, sem alterar seus pixels.
- **FR-007**: Preservar os módulos, cálculos, permissões, dados e projeto Firebase.
- **FR-008**: Validar com uma matriz de larguras, alturas e orientações, incluindo todas as áreas, navegação e diálogos.

## Success Criteria

- **SC-001**: Todas as áreas testadas ficam dentro da largura da tela, com tolerância máxima de 1px, em toda a matriz.
- **SC-002**: Em telas com menu maior que a altura, as últimas ações podem ser alcançadas e acionadas por rolagem/teclado.
- **SC-003**: Todos os formulários e diálogos auditados permitem ler o conteúdo e alcançar ações sem sobreposição impeditiva.
- **SC-004**: A imagem original é exibida integralmente e corresponde ao arquivo histórico em todas as referências da marca.
- **SC-005**: Fluxos de vendas, encomendas, despesas e consulta continuam passando nas validações existentes.

## Assumptions

A marca original é `public/images/logo.png`, com o mesmo conteúdo do commit anterior à reformulação. Rolagem horizontal local de tabelas/gráficos é aceitável; rolagem horizontal global e conteúdo inacessível não são. A correção será publicada no endereço existente após validação, sem alterações no banco ou faturamento.
