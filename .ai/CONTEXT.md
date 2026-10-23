# Contexto da Lá Divino Sabor

## Produto confirmado

Aplicação interna de gestão de uma confeitaria. O usuário confirmou a preservação de todos os módulos atuais, acesso por administrador ou consulta, uso em celular/computador, PWA instalável e internet para gravar. A identidade visual é chocolate/creme. Não há loja pública ou pedido de cliente externo nesta versão.

| Área        | Responsabilidade                                                                      |
| ----------- | ------------------------------------------------------------------------------------- |
| Visão geral | Vendas, recebimentos, despesas, pendências, metas, entregas e atividades              |
| Vendas      | Registrar venda avulsa, preço unitário, quantidade, pagamento e situação              |
| Encomendas  | Cliente, descrição, entrega, entrada, saldo e andamento                               |
| Financeiro  | Despesas e resultado de caixa do período                                              |
| Cadastros   | Clientes, produtos, ingredientes, receitas e materiais; arquivamento e reativação     |
| Cobranças   | Pendências por cliente/lançamento, quitação e mensagem aberta manualmente no WhatsApp |
| Relatórios  | Vendas por intervalo, cliente e pagamento; agrupamentos, CSV e impressão              |

O manual de operação está em [docs/manual-de-uso.md](../docs/manual-de-uso.md). Regras e campos implementados estão no [modelo de dados](../docs/modelo-de-dados.md).

## Tecnologia e fronteiras

Uma SPA React/TypeScript compilada pelo Vite, com navegação por hash e Firebase Authentication/Firestore. Firebase Hosting entrega `dist/`. Node e Python são ferramentas locais de desenvolvimento, não servidores da aplicação publicada.

O projeto Firebase permanece `gestao-de-confeitaria`. Testes de integração usam exclusivamente `demo-doceria` nos emuladores. A demonstração só existe em desenvolvimento e não grava no Firebase. Não confundir uma prévia do Hosting com a demonstração: depois do login, a prévia do Hosting usa o backend real.

O código e as configurações executáveis prevalecem para descrever o estado atual. A [arquitetura](../docs/ARCHITECTURE.md) aponta os módulos; a [constituição](../.specify/memory/constitution.md) registra restrições aceitas.

## Leitura para uma nova tarefa

1. [Convenções](AI_CONVENTIONS.md), `AGENTS.md` e constituição.
2. [Índice de documentação](../docs/README.md) e documento específico do módulo.
3. [Decisões](../docs/DECISIONS.md), quando a tarefa mudar uma escolha durável.
4. Código e testes afetados.
5. `specs/NNN-nome/` da mudança em andamento.

O [registro da reformulação](../docs/reformulacao.md) contém histórico e evidências da recuperação. Ele não representa uma lista de novas tarefas pendentes. Quantidades de documentos/contas citadas nesse histórico são uma fotografia de 2026-10-23, não um inventário vivo de produção.

## Limites conhecidos

- Não há checkout, estoque quantitativo, pagamento automático, multiempresa ou gestão de contas na interface.
- Resultado de caixa não é lucro contábil. Encomendas são filtradas pela entrega, pois o legado não possui um livro de recebimentos datados.
- Receitas e produtos guardam custos calculados ao salvar; alterar um insumo não atualiza automaticamente toda a cadeia.
- Exportação JSON não é restauração automática, backup do Authentication ou rotina agendada.
- A PWA mantém assets estáticos; não oferece promessa de dados disponíveis após reabrir offline.

Não há decisão humana pendente que impeça trabalhar na documentação ou manter o sistema. Novas funcionalidades, custos e mudanças de contrato devem ser tratadas no pedido correspondente.
