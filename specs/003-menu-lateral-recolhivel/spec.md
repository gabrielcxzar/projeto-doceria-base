# Feature Specification: Menu lateral recolhível

**Feature Branch**: `feat/menu-lateral-recolhivel`
**Created**: 2026-10-23
**Status**: Implementada e validada localmente; aguardando CI e publicação
**Input**: Deve ser possível ocultar o menu lateral.

## User Scenarios & Testing

### US1 — Liberar espaço no computador (Priority: P1)

Como usuário, quero ocultar a lateral e reabri-la pelo cabeçalho para ampliar a área de trabalho.

**Independent Test**: ocultar e reabrir pelo mesmo controle; navegar e confirmar que o conteúdo ocupa o espaço liberado.

**Acceptance Scenarios**:
1. **Given** a lateral aberta no computador, **When** aciono Ocultar menu lateral, **Then** ela desaparece, sai da navegação por teclado e o conteúdo ocupa a largura disponível.
2. **Given** a lateral oculta, **When** aciono Mostrar menu lateral, **Then** a navegação completa volta e o foco permanece no controle.
3. **Given** minha escolha de lateral oculta, **When** recarrego ou navego, **Then** ela continua oculta e posso reabri-la.

### US2 — Preservar navegação e identidade (Priority: P1)

**Independent Test**: alternar entre celular e computador com a lateral oculta e aberta.

**Acceptance Scenarios**:
1. **Given** a preferência de computador, **When** uso celular, **Then** o menu móvel abre e fecha normalmente, sem alterar a preferência de computador.
2. **Given** a lateral oculta, **When** uso o sistema, **Then** a logo original permanece visível no cabeçalho.

### Edge Cases

Limites de 900/901px, janela baixa, teclado, armazenamento local indisponível, recarga, troca de módulo e mudança de orientação com drawer aberto.

## Requirements

- **FR-001**: Oferecer controle acessível no cabeçalho para ocultar e reabrir a lateral em computadores.
- **FR-002**: O conteúdo deve usar a largura liberada, sem overflow global.
- **FR-003**: Persistir somente a preferência visual neste navegador; falha de armazenamento não pode impedir uso.
- **FR-004**: Preservar o drawer móvel, Escape, foco e liberação de rolagem.
- **FR-005**: Logo original, favicon, permissões, módulos, dados, cálculos e configuração Firebase devem ser preservados.

## Success Criteria

- **SC-001**: Ocultar/reabrir funciona por clique e teclado, com nome e estado acessíveis corretos.
- **SC-002**: A lateral oculta não ocupa largura nem permite foco nos itens; o conteúdo expande imediatamente.
- **SC-003**: Recarga, navegação, transições de tamanho e indisponibilidade de armazenamento não quebram a navegação.

## Assumptions

Ocultar significa retirar toda a lateral da área de trabalho, mantendo o botão de reabertura e a marca no cabeçalho. A preferência é local ao navegador e independente do menu móvel. Nenhuma operação Firebase ou serviço pago é necessário. Publicação segue o pipeline existente da sessão.
