# Especificação: Cadastro de produto durante o lançamento de encomendas

**Feature Branch**: `feat/encomendas-cadastrar-produto`  
**Created**: 2026-11-16  
**Status**: Concluída (validada localmente na branch dedicada)  
**Restrições permanentes**: Ver [constituição](../../.specify/memory/constitution.md) e [convenções](../../.ai/AI_CONVENTIONS.md).

## Contexto e objetivo

Permitir que o usuário acesse o cadastro completo de produtos diretamente durante o preenchimento de **Nova Encomenda** ou **Editar Encomenda** por meio do botão **Cadastrar produto** na seção **Produtos da encomenda**, reutilizando integralmente o mesmo formulário e regras de validação do cadastro de produtos e preservando integralmente o rascunho da encomenda aberta.

## Requisitos

1. **Acesso na seção de produtos da encomenda (`src/editors.tsx`):**
   - Exibir botão `type="button"` **+ Cadastrar produto** próximo ao campo **Produto cadastrado** em **Nova Encomenda** e **Editar Encomenda**, visível apenas para perfis autorizados (`admin`).
   - Impedir que o clique no botão ou a submissão do produto dispare submissão acidental do formulário de encomenda.
2. **Reutilização integral do cadastro de produtos:**
   - Reutilizar exatamente o componente `Editor` (`kind="product"`), preservando todas as regras e campos (categoria, composição por receitas/materiais, custos, tempo de preparo, preço manual ou automático por markup e bloqueio de nomes duplicados).
3. **Preservação do formulário da encomenda e seleção automática:**
   - Ao abrir **Cadastrar produto**, renderizá-lo em diálogo empilhado fora do `<form>` da encomenda (evitando propagação de eventos em React e problemas de `Escape`, backdrop ou foco).
   - Preservar cliente, data de entrega, produtos já adicionados, quantidades, valores, acessórios, observações, entrada e situação.
   - Ao salvar o produto, gerar/persistir o ID real (`crypto.randomUUID()` com `createOnly: true` quando novo), retornar ao diálogo da encomenda, selecionar automaticamente o novo produto no campo **Produto cadastrado** e preencher seu preço unitário sugerido.
   - Ao cancelar ou fechar por `Escape`, retornar à encomenda preservando todos os dados.
   - Em falha de gravação ou validação (ex.: nome duplicado ou erro de rede), exibir alerta no formulário do produto mantendo os dados digitados no produto e na encomenda para correção.

## Critérios de aceite
- **SC-001**: Botão **Cadastrar produto** funciona em Nova Encomenda e Editar Encomenda somente para perfil autorizado (`admin`).
- **SC-002**: Salvar novo produto persiste na coleção `produtos`, retorna à encomenda com todos os dados/itens/acessórios preservados e seleciona o produto recém-criado pelo seu ID real.
- **SC-003**: Cancelar, fechar ou pressionar `Escape` fecha somente o cadastro de produto e preserva a encomenda intacta.
- **SC-004**: Falhas de validação/duplicidade/gravação exibem erro sem fechar nem perder os formulários.
- **SC-005**: Funciona em desktop e celular (`320px`/`390px`+) nos modos preview e emuladores Firebase.
