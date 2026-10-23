# Manual de uso

## Acesso e instalação

Abra [Lá Divino Sabor](https://gestao-de-confeitaria.web.app) e entre com a conta da equipe. Administradores podem alterar os registros; o perfil de consulta acompanha os dados e relatórios. A criação de contas, permissões e recuperação administrativa de acesso são feitas fora da interface, pelo responsável pelo Firebase.

A aplicação é instalável como PWA nos navegadores compatíveis. Quando o navegador disponibiliza a instalação, o menu pode exibir **Instalar aplicativo**. A instalação não habilita gravação sem internet. Se já estiver com o sistema aberto ao perder conexão, os dados em memória podem continuar visíveis; reabrir offline não garante acesso aos registros.

Use **Sair** em dispositivos compartilhados. O tema claro/escuro fica salvo no dispositivo e não muda os dados da empresa.

## Visão geral

Escolha mês, ano ou todo o histórico. O painel distingue total vendido, já recebido, saldo a receber e despesas. Entregas futuras e últimas vendas ajudam a acompanhar a operação. A meta é mensal; ao consultar ano/todo o histórico, não interprete a comparação como uma meta anual.

## Cadastros e custos

1. Cadastre clientes e contatos, incluindo DDD para WhatsApp.
2. Em ingredientes, informe preço de compra, embalagem e quantidade na unidade padrão. Um pacote de 1 kg corresponde a 1000 g.
3. Monte receitas com ingredientes e rendimento. O sistema converte kg/g e l/ml quando compatíveis.
4. Cadastre materiais como caixas e embalagens pelo custo unitário.
5. Monte o produto com uma unidade de cada receita/material selecionado ou uma base manual. Acrescente mão de obra, custos indiretos e preço manual ou markup.

Depois de alterar o preço de um ingrediente, revise e salve suas receitas e produtos dependentes. Não existe recálculo automático de toda a cadeia.

**Arquivar** preserva o cadastro no histórico e o retira de novas seleções. Em **Mostrar arquivados**, use a ação de reativação para voltar a utilizá-lo.

## Venda avulsa

Em **Vendas**, escolha **Registrar venda**, cliente, data e produto. Confira quantidade, preço unitário, forma de pagamento e situação. O formulário mostra o total antes de salvar.

- **Pendente**: ainda precisa receber.
- **Pago**: recebimento confirmado.
- **Entregue e pago**: entrega e recebimento confirmados.

Use a ação de situação para corrigir o estado de uma venda. Confirme recebimento apenas quando o dinheiro realmente tiver entrado. Uma falha ao salvar não deve ser interpretada como operação concluída; aguarde a confirmação e confira a lista antes de tentar novamente.

## Encomenda

Em **Encomendas**, informe cliente, descrição do preparo, entrega, total e valor já recebido. O saldo é calculado. O andamento pode ser pendente, em produção ou finalizado. Para finalizar, confirme o recebimento total; a entrada não pode exceder o valor da encomenda.

A agenda inclui todas as entregas, mesmo fora do período escolhido no painel. No financeiro, o período de uma encomenda é sua entrega, não necessariamente o dia em que cada entrada foi recebida.

## Despesas e caixa

Em **Financeiro**, registre a categoria, descrição e **total pago**. A quantidade é uma observação: escrever `5 kg` não multiplica o valor.

O resultado de caixa é recebido menos despesas. O custo estimado de produção das vendas é informativo. Esse painel não constitui uma apuração contábil de lucro.

## Cobranças

- Veja pendências de vendas e encomendas agrupadas por cliente.
- **Mensagem** prepara o texto com o saldo; confira-o antes de copiar ou abrir o WhatsApp. O envio é feito por você.
- **Registrar contato realizado** grava o histórico de contato; não marca a dívida como paga.
- **Baixar lançamento** quita apenas a pendência escolhida.
- **Quitar** pede confirmação para quitar todas as pendências daquele cliente.

A data de referência é a venda ou entrega. Não existe vencimento contratual de cobrança cadastrado nesta versão.

## Relatórios e cópias de dados

Em **Relatórios**, filtre o intervalo, cliente e forma de pagamento. O relatório é de vendas avulsas, incluindo pendentes; encomendas continuam na agenda e no financeiro. Há resumo por cliente/produto, CSV e impressão.

Administradores podem usar **Exportar arquivo completo** para baixar um JSON das 12 coleções conhecidas. Guarde em local privado, fora do repositório. Esse arquivo não contém senhas ou infraestrutura e não realiza restauração automática. A exportação não configura uma rotina agendada.

## Problemas comuns

| Mensagem/situação                  | Ação                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| Sem conexão                        | Reconecte antes de salvar; aguarde confirmação da operação                             |
| Registro alterado por outra pessoa | Feche o formulário, revise a versão atualizada e reaplique conscientemente a alteração |
| Sem perfil autorizado              | Solicite ao administrador conferir a conta e `usuarios/{uid}`                          |
| E-mail ou senha incorretos         | Confira as credenciais; não compartilhe senhas em tickets ou documentação              |
| Nova versão disponível             | Conclua a operação atual e use **Atualizar aplicativo**                                |

Diagnóstico técnico e procedimentos administrativos estão no [guia operacional](operacao.md).
