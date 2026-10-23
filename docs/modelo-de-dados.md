# Modelo de dados e regras de cálculo

Contratos observados em [src/types.ts](../src/types.ts), [src/domain.ts](../src/domain.ts), [formulários](../src/editors.tsx) e [regras](../firestore.rules). As coleções estão no primeiro nível do Firestore. Não há subcoleções usadas pela aplicação.

## Convenções comuns

- `id` em memória é o ID do documento Firestore; ele também é incluído na exportação. Atualizações preservam campos adicionais do documento.
- `criadoEm` e `atualizadoEm` são timestamps. Registros antigos podem ter campos opcionais ausentes. Novas operações usam horário do servidor.
- `arquivado` oculta cadastros para novas seleções e permite reativação; preserva relações históricas.
- Datas comerciais são strings `YYYY-MM-DD`; não converter indiscriminadamente para UTC.
- Valores financeiros são números; totais monetários usam arredondamento de centavos. Custos unitários de insumos podem precisar de mais casas decimais.

## Coleções

| Coleção         | Campos do contrato                                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usuarios`      | ID igual ao UID Authentication; `nome`, `role` (`admin` ou `viewer`). Documentos existentes também podem ter `email` preservado. Senha não pertence ao Firestore.                                                                                               |
| `clientes`      | `nome`, `contato`, `email`, `endereco`, `observacoes`, `nomesAnteriores`; `totalGasto` e `ultimaCompra` são campos legados preservados. A interface calcula compras/pendências pelos lançamentos.                                                               |
| `produtos`      | `nome`, `categoria`, `valor` unitário, `custoMaterial`, `custoMaoObra`, `custosInvisiveis` percentual, `margem` legado como markup, `tempoPreparo` em minutos, `nomesAnteriores`, `composicaoReceitas` (`id`, `titulo`) e `materiaisUtilizados` (`id`, `nome`). |
| `ingredientes`  | `nome`, `unidadeCompra` descritiva, `precoCompra`, `tamanhoCompra` na unidade padrão, `unidadePadrao` (`g`, `ml`, `unidade`), `custoUnitarioPadrao`.                                                                                                            |
| `receitas`      | `titulo`, `rendimento`, `ingredientes` (`ingredienteId`, `quantidade`, `unidadeUso`, `custo`), `custoTotal`, `custoPorUnidade`.                                                                                                                                 |
| `materiais`     | `nome`, `custo` por unidade.                                                                                                                                                                                                                                    |
| `vendas`        | `data`, `pessoa` (nome do cliente), `clienteId` opcional, `produto` (nome), `produtoId` opcional, `quantidade` inteira positiva, `valor` unitário, `custoUnitario` opcional, `pagamento`, `status`.                                                             |
| `encomendas`    | `clienteNome`, `clienteId` opcional, `produtoDescricao`, `dataEntrega`, `valorTotal`, `valorEntrada`, `status`.                                                                                                                                                 |
| `despesas`      | `data`, `tipo`, `descricao`, `quantidade` descritiva e `valor` total. A quantidade não multiplica o valor.                                                                                                                                                      |
| `cobrancas`     | `clienteNome`, `tipo`, `data` timestamp. Novos registros também gravam `clienteId`; ele é usado pelo matcher, embora ainda não esteja declarado em `Charge`. É histórico de contato, não uma dívida adicional.                                                  |
| `atividades`    | `tipo`, `descricao`, `usuarioNome` opcional no legado. Novas atividades exigem nome e são imutáveis pelas regras do cliente web.                                                                                                                                |
| `configuracoes` | `metaMensal`, `ultimoBackup` anulável. A interface utiliza o primeiro documento retornado. Não existe atualizador automático de `ultimoBackup` no fluxo de exportação atual.                                                                                    |

## Enums e relações

Venda: `P` pendente, `A` pago, `E` entregue e pago. Pagamentos: `PIX`, `Dinheiro`, `Cartão`, `Transferência`.

Encomenda: `Pendente`, `Em Produção`, `Finalizado`. A finalização exige o recebimento total. A entrada deve ficar entre zero e o total.

Categorias de produto: `Bolos`, `Doces`, `Salgados`, `Bebidas`, `Outros`. Tipos de despesa: `Material`, `Equipamento`, `Marketing`, `Transporte`, `Outros`.

Vendas antigas identificam clientes/produtos por nome; novos registros também guardam IDs. O ID tem precedência. Sem ID, o matcher consulta o nome atual e `nomesAnteriores`. Renomear um cadastro conserva o nome anterior sem reescrever o histórico.

Receita referencia ingrediente por ID. Produto referencia receitas e materiais por ID, incluindo uma unidade de cada item selecionado na composição atual.

## Custos e precificação

```text
custo unitário do ingrediente = preço de compra / quantidade na unidade padrão
custo da linha da receita = quantidade convertida × custo unitário do ingrediente
custo da receita = soma das linhas
custo por unidade da receita = custo total / rendimento
base do produto = receitas selecionadas + materiais selecionados, ou base manual
custo do produto = (base + mão de obra) × (1 + custos indiretos / 100)
preço automático = custo do produto × (1 + markup / 100)
```

Há conversão de kg para g e de l para ml; massa e volume não podem ser misturados. Markup de 100% dobra o custo; isso não equivale a margem de lucro de 100% sobre receita. O campo legado `margem` não foi renomeado no banco.

Editar ingrediente não recalcula automaticamente receitas/produtos já salvos. Ao revisar uma receita, preview e gravação usam os custos atuais dos ingredientes. Revise a cadeia conscientemente.

## Recebimentos e caixa

- Total de venda = `valor × quantidade`.
- Vendas `A` e `E` são recebidas; `P` entra em pendências.
- Recebido da encomenda = entrada, ou total quando finalizada. Saldo = total menos entrada, limitado a zero; finalizada não gera pendência.
- Vendido = total das vendas + total das encomendas do período.
- Recebido = vendas recebidas + entradas/quitados das encomendas do período.
- Resultado de caixa = recebido menos despesas. Não descontar novamente o custo estimado de produção como se todas as compras fossem despesas diferentes.
- Período usa `data` de venda/despesa e `dataEntrega` de encomenda. Uma string de mês filtra mês; ano filtra ano; vazio mostra todo o histórico.

Os totais por cliente são derivados dos registros. Os agregados legados permanecem no documento, mas não são a fonte da tela de compras/pendências.

## Exportação

O JSON contém `schemaVersion`, `projectId`, `exportedAt` e `collections`. Inclui todas as 12 coleções conhecidas e IDs. Timestamps recebem marcador `__type`, ISO e, para Timestamp Firestore, segundos/nanossegundos. Campos extras são preservados.

Não há importação automática. Contas/senhas Authentication, regras, índices e recursos de infraestrutura não integram esse arquivo. O CSV é relatório tabular de vendas com proteção contra interpretação de fórmulas; não substitui o JSON completo.
