# Manual de uso

## Acesso e instalação

Abra [Lá Divino Sabor](https://gestao-de-confeitaria.web.app) e entre com a conta da equipe. Administradores podem alterar os registros; o perfil de consulta acompanha os dados e relatórios. A criação de contas, permissões e recuperação administrativa de acesso são feitas fora da interface, pelo responsável pelo Firebase.

A aplicação é instalável como PWA nos navegadores compatíveis. Quando o navegador disponibiliza a instalação, o menu pode exibir **Instalar aplicativo**. A instalação não habilita gravação sem internet. Se já estiver com o sistema aberto ao perder conexão, os dados em memória podem continuar visíveis; reabrir offline não garante acesso aos registros.

Use **Sair** em dispositivos compartilhados. O tema claro/escuro fica salvo no dispositivo e não muda os dados da empresa.

No celular e tablet, abra a navegação pelo botão de menu e feche pelo **X**, tocando fora do menu ou pressionando Escape. A lateral tem rolagem própria: em telas baixas, role dentro dela para alcançar relatórios, exportação e saída. Tabelas largas também rolam horizontalmente dentro do quadro; as ações ficam nas últimas colunas. Formulários longos rolam dentro da janela até **Cancelar** e **Salvar**.

No computador, o botão de menu no cabeçalho permite **Ocultar menu lateral** e **Mostrar menu lateral**. Ao ocultar, o conteúdo aproveita o espaço liberado. A escolha fica salva neste navegador, inclusive após recarregar a página, e não altera o comportamento do menu no celular.

## Visão geral

Escolha mês, ano ou todo o histórico. O painel distingue total vendido, já recebido, saldo a receber e despesas. Entregas futuras e últimas vendas ajudam a acompanhar a operação. A meta é mensal; ao consultar ano/todo o histórico, não interprete a comparação como uma meta anual.

## Cadastros e custos

1. Cadastre clientes e contatos, incluindo DDD para WhatsApp.
2. Em ingredientes, informe preço de compra, embalagem e quantidade na unidade padrão. Um pacote de 1 kg corresponde a 1000 g.
3. Monte receitas com ingredientes e rendimento. O sistema converte kg/g e l/ml quando compatíveis.
4. Cadastre materiais como caixas e embalagens pelo custo unitário.
5. Monte o produto com uma unidade de cada receita/material selecionado ou uma base manual. Acrescente mão de obra, custos indiretos e preço manual ou markup.
6. Em **Fornecedores**, cadastre empresas ou fornecedores informais/pessoas físicas (apenas Nome/Razão social é obrigatório; CNPJ/CPF, nome fantasia, contato, e-mail, endereço e observações são opcionais). Todos os cadastros seguem ordem alfabética A–Z.

Depois de alterar o preço de um ingrediente, revise e salve suas receitas e produtos dependentes. Não existe recálculo automático de toda a cadeia.

**Arquivar** preserva o cadastro no histórico e o retira de novas seleções. Em **Mostrar arquivados**, use a ação de reativação para voltar a utilizá-lo.

## Venda avulsa

Em **Vendas**, escolha **Registrar venda**, cliente, data e produto. Confira quantidade, preço unitário, forma de pagamento e situação. O formulário mostra o total antes de salvar. Para lançar vários itens para o mesmo cliente na mesma compra, use **Salvar e continuar** mantendo cliente e dados do pedido; na listagem, compras com mais de um produto diferente exibem o marcador **N produtos** e **Ver detalhes**.

- **Pendente**: ainda precisa receber.
- **Pago**: recebimento confirmado.
- **Entregue e pago**: entrega e recebimento confirmados.

Use a ação de situação para corrigir o estado de uma venda. Confirme recebimento apenas quando o dinheiro realmente tiver entrado. Uma falha ao salvar não deve ser interpretada como operação concluída; aguarde a confirmação e confira a lista antes de tentar novamente.

## Encomenda

Em **Encomendas**, selecione cliente, data de entrega (lista ordenada das mais recentes/futuras para as mais antigas, com opção de alternar) e adicione os produtos cadastrados desejados, ajustando quantidades e preço negociado se necessário. Opcionalmente, adicione pratos, embalagens e acessórios marcando **Cobrar separadamente** (soma no total) ou **Uso interno / já incluso** (apenas registrado para preparo), além de observações de personalização e valor já recebido.

A agenda inclui todas as entregas, mesmo fora do período escolhido no painel, agrupando visualmente pedidos de um mesmo cliente na mesma data sem fundir seus saldos nem situações individuais. No financeiro, entradas registradas com data em `recebimentos` contam pela data efetiva do pagamento.

## Despesas, notas fiscais e estoque

Em **Financeiro**, use **Registrar despesa** para gastos simples (sem exigir fornecedor, com opção de vincular entrada no estoque para um ingrediente/material) ou **Registrar nota fiscal** para lançar vários itens comprados em um único documento financeiro selecionando um fornecedor cadastrado na lista pesquisável (ou criando rapidamente em **+ Novo fornecedor** sem perder os itens da nota), número da nota e quantidades rápidas. Para cada ingrediente ou material incluído na nota, a checkbox **Adicionar ao estoque** (marcada por padrão) permite decidir individualmente se aquele item deve ou não gerar entrada no estoque, inclusive podendo alternar a escolha na relação de itens antes de salvar ou ajustar individualmente ao editar a nota, sem alterar o valor financeiro da nota. Na tabela do Financeiro, cada nota fiscal aparece em uma única linha com seu fornecedor, número da nota, quantidade de itens e valor total; clique em **Exibir itens** para expandir o detalhamento de produtos, quantidades, valores unitários e subtotais. Notas diferentes do mesmo fornecedor permanecem separadas. Filtre por tipo de lançamento, fornecedor, categoria ou pesquise por fornecedor/descrição/número da nota/item. Os itens marcados para entrada atualizam os saldos na aba **Estoque** uma única vez; editar apenas fornecedor ou cabeçalho da nota não gera novas movimentações, e excluir ou corrigir uma nota estorna somente as movimentações realmente criadas cujos saldos ainda estejam disponíveis.

Na tela **Estoque**, inicie manualmente os saldos atuais existentes (**Iniciar saldo**, sem inventar estoque retroativo), registre **Saída**, faça **Ajuste**, defina **Estoque mínimo** para alertas e acompanhe o **Histórico de movimentações**.

O resultado de caixa é recebido menos despesas. O custo estimado de produção das vendas é informativo. Esse painel não constitui uma apuração contábil de lucro.

## Cobranças

- Veja pendências de vendas e encomendas agrupadas por cliente em ordem alfabética.
- **Mensagem** prepara o texto com o saldo; confira-o antes de copiar ou abrir o WhatsApp. O envio é feito por você.
- **Registrar contato realizado** grava o histórico de contato; não marca a dívida como paga.
- **Baixar lançamento** inicia com a opção **Quitar saldo restante (pagamento total)** desmarcada para evitar quitação acidental: informe manualmente o valor recebido para registrar pagamento parcial, ou marque a opção para preencher automaticamente o saldo restante (somente leitura) e concluir com **Confirmar recebimento**, mantendo o histórico auditável em **Histórico de recebimentos**.
- **Quitar** na tabela por cliente exibe explicitamente quantos lançamentos em aberto serão quitados antes da confirmação.

A data de referência é a venda ou entrega. Não existe vencimento contratual de cobrança cadastrado nesta versão.

## Relatórios e cópias de dados

Em **Relatórios**, filtre o intervalo, cliente (ordenado A–Z) e forma de pagamento. Além das vendas avulsas (incluindo status parcial), o relatório consolida encomendas por entrega, recebimentos efetivos por data do pagamento e compras com saldos atuais de estoque. Há resumo por cliente/produto, CSV e impressão.

Administradores podem usar **Exportar arquivo completo** para baixar um JSON das 15 coleções conhecidas. Guarde em local privado, fora do repositório. Esse arquivo não contém senhas ou infraestrutura e não realiza restauração automática. A exportação não configura uma rotina agendada.

## Problemas comuns

| Mensagem/situação                  | Ação                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| Sem conexão                        | Reconecte antes de salvar; aguarde confirmação da operação                             |
| Registro alterado por outra pessoa | Feche o formulário, revise a versão atualizada e reaplique conscientemente a alteração |
| Sem perfil autorizado              | Solicite ao administrador conferir a conta e `usuarios/{uid}`                          |
| E-mail ou senha incorretos         | Confira as credenciais; não compartilhe senhas em tickets ou documentação              |
| Nova versão disponível             | Conclua a operação atual e use **Atualizar aplicativo**                                |

Diagnóstico técnico e procedimentos administrativos estão no [guia operacional](operacao.md).
