# Mudanças relevantes por IA

## 2026-10-23 — Menu lateral recolhível

**Agente:** Codex. **Objetivo:** permitir ocultar e reabrir o menu lateral no computador.

**Mudanças:** controle no cabeçalho, expansão do conteúdo e preferência local persistente, independente do drawer móvel. Logo original e demais fluxos preservados; nenhum serviço, dado ou regra Firebase alterado. **Evidências:** [feature 003](../specs/003-menu-lateral-recolhivel/checklists/requirements.md).

## 2026-10-23 — Responsividade e restauração da identidade

**Agente:** Codex. **Objetivo:** corrigir menu cortado, revisar telas e restaurar a marca original solicitada pelo mantenedor.

**Mudanças:** lateral com rolagem própria, drawer com fechamento/foco/teclado, ajustes de grids/filtros/campos/listas e diálogos sem sobreposição. Logo original no login e aplicação, favicon e manifesto; ícones substitutos removidos. Matriz responsiva automatizada incorporada ao CI.

**Preservação:** nenhuma mudança de regras, domínio, serviço Firebase, dados ou faturamento. O PNG original é mantido byte a byte. **Evidências:** [feature 002](../specs/002-responsividade-identidade/checklists/requirements.md).

**Entrega:** PR #3 integrada (`50b5086`), 103 testes aprovados no CI da PR e de `main`, deploy confirmado e verificação pública nas duas URLs Firebase. Este fechamento documental não altera o pacote publicado.

## 2026-10-23 — Adoção documental e Spec Kit

**Agente:** Codex. **Objetivo:** aplicar Spec Kit e avaliar a precedência do AI Project Bootstrap local.

**Mudanças:** auditoria proporcional, contexto/convenções de agentes, arquitetura, modelo de dados, manual, guia operacional, decisões e índice. Integração oficial do Spec Kit, constituição e artefatos da adoção. Referências acrescentadas ao README e ao `AGENTS.md`; configuração de adoção registrada ao término da validação.

**Motivo:** permitir que futuras sessões e mantenedores entendam o sistema e especifiquem mudanças sem depender do histórico do chat. Não houve alteração do comportamento da aplicação, das regras Firebase, do faturamento ou dos dados de produção.

**Evidência de conclusão:** [checklist da adoção](../specs/001-adocao-documentacao/checklists/requirements.md). **Validação humana pendente:** nenhuma necessária para esta adoção; novas decisões de produto continuam a depender do pedido correspondente.

O histórico da reformulação anterior permanece em [docs/reformulacao.md](../docs/reformulacao.md) e no commit `77417d3`; não é duplicado neste registro.
