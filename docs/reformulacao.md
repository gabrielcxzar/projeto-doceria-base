# Reformulação da gestão Lá Divino Sabor

## Objetivo e decisões confirmadas

Restabelecer a operação por meio de uma reformulação completa antes da volta ao uso. O produto é uma aplicação de gestão interna, para celular e computador, instalável como PWA. Preservar a identidade chocolate/creme e todas as funcionalidades existentes. Perfis: administrador e somente consulta. A primeira versão exige internet para gravar operações. Não habilitar serviços pagos ou alterar faturamento.

## Diagnóstico comprovado

- O Hosting responde HTTP 200, mas o módulo JavaScript publicado contém `return` fora de função e não inicia.
- O deploy no GitHub não valida a sintaxe antes de publicar.
- Há falhas de atualização das encomendas, paginação de vendas, consistência dos totais e exportação parcial apresentada como backup completo.
- O acesso de consulta precisa ser imposto nas regras e nas operações, além da interface.

## Escopo

- React, TypeScript e Vite, com componentes e serviços separados; valores e datas validados.
- Login e saída pelo Firebase Authentication, com papéis existentes em `usuarios/{uid}`.
- Painel, metas e atividades; vendas; encomendas e entradas; despesas; clientes; produtos e precificação; ingredientes, receitas e materiais; cobranças e mensagens de WhatsApp abertas pelo usuário; relatórios e impressão.
- Exportação completa em JSON com IDs e tipos preservados, além de exportação tabular para uso cotidiano.
- PWA instalável; aviso sem conexão e bloqueio de gravações offline; atualização controlada.
- Interface responsiva, acessível, sem depender de fontes ou bibliotecas JavaScript servidas por CDN.
- Verificações de tipos, testes de regras de negócio, compilação e verificação dos fluxos em navegador antes da publicação.

## Restrições do Firebase e dos dados

- Preservar o projeto `gestao-de-confeitaria`, as contas e os dados existentes. Não recriar banco, trocar projeto ou executar migração destrutiva.
- Manter leitura compatível com as coleções e campos legados. Não criar dados de exemplo na produção.
- Inspecionar regras e índices ativos antes de propor alterações. Não publicar regras que removam acesso legítimo ou ampliem permissões.
- Gravações relacionadas devem ser atômicas quando aplicável; falhas não podem aparecer como sucesso.
- Testes devem usar dados fictícios isolados; nenhum lançamento comercial será criado na produção para testar.
- Não versionar tokens, credenciais administrativas, dados pessoais, logs, caches ou exportações reais.
- Respeitar cotas e evitar novas assinaturas, Cloud Functions ou serviços que exijam faturamento.

## Critérios de aceitação

1. Compilação e verificações impedem publicar JavaScript inválido.
2. Usuário sem login não acessa dados; perfil de consulta não grava; falhas de permissão são explícitas.
3. Vendas e encomendas salvas aparecem imediatamente; valores recebidos e pendentes são consistentes e não duplicados.
4. Cadastros, composição de produtos e receitas preservam os contratos existentes e validam valores e unidades.
5. Filtros, busca e relatórios apresentam o mesmo critério de período e cálculos verificáveis.
6. Exportação completa inclui todas as coleções conhecidas e os IDs; não se apresenta como restauração automática.
7. Interface utilizável em 390 px e desktop, navegação por teclado e formulários com rótulos.
8. Manifesto, ícones e atualização permitem instalar a PWA nos navegadores compatíveis; gravar exige conexão.
9. Revisão do diff sem segredos ou artefatos locais; configurações existentes preservadas quando compatíveis.

## Tarefas verificáveis

- [x] Confirmar causa da indisponibilidade e decisões do produto.
- [x] Concluir auditoria autenticada de Firebase e contrato dos dados.
- [x] Preparar estrutura React/TypeScript/Vite e validações.
- [x] Implementar serviços e regras de negócio compatíveis.
- [x] Implementar todas as telas e fluxos responsivos.
- [x] Preparar PWA e exportações.
- [x] Validar cálculos, permissões, fluxos e compilação.
- [x] Revisar diff, documentar execução e limites da validação.
- [x] Disponibilizar prévia para revisão antes de publicar a nova versão em produção.

## Evidências e compatibilidade

Auditoria autenticada: Firestore ativo em `southamerica-east1`, 331 documentos em oito coleções existentes, quatro contas Auth correspondentes aos quatro perfis (três administradores e um de consulta). Os 50 documentos existentes das coleções mutáveis atendem aos predicados das novas regras. Atividades históricas sem nome de usuário continuam legíveis; a nova exigência vale somente para atividades novas. Não houve migração nem escrita comercial na produção durante desenvolvimento ou testes.

A nova interface usa os mesmos nomes de coleções e preserva campos extras em atualizações. Novos relacionamentos também guardam IDs; nomes anteriores garantem compatibilidade com lançamentos legados. Cadastros são arquivados e reativáveis, protegendo referências históricas. Não houve mudança no faturamento ou criação de serviço pago.

O Stitch foi autenticado pela variável de usuário Windows e gerou duas telas reais no projeto `9508448770898154872`. Os arquivos exportados estão em `docs/design/stitch/`. Capturas da aplicação implementada, exclusivamente com dados fictícios, estão em `docs/design/aplicacao/`.

## Verificações executadas

- TypeScript e compilação de produção.
- 11 testes de datas, validações, custos, relações legadas, caixa e exportação.
- 11 testes no emulador de regras: admin/viewer/sem perfil, validação, atomicidade, arquivamento, histórico e lote de 25 operações.
- 10 cenários de navegador da prévia: computador/celular, navegação, gravações, consulta, offline, JSON e virada de data com PWA aberta.
- 12 cenários de integração Authentication/Firestore: login/saída, venda, encomenda, despesa, consulta, conta sem perfil, concorrência, insumo, receita, precificação, arquivamento, cobranças e CSV, em computador e celular.
- Verificação da PWA compilada: manifesto, ícones 192/512, service worker, shell offline, caches locais e ausência do modo de demonstração em produção.
- Auditoria das dependências de produção: zero vulnerabilidades reportadas. O conjunto de ferramentas de desenvolvimento inclui avisos transitivos do Firebase CLI; não é servido ao navegador.

Os testes de integração usam exclusivamente emuladores de Authentication e Firestore, em projeto fictício. O acesso com a senha real do proprietário permanece uma validação de uso após publicação; nenhuma senha foi solicitada ou redefinida.

## Stitch

O Stitch foi utilizado pelo endpoint MCP oficial, autenticado pela variável local do usuário Windows. O projeto e as duas telas foram gerados e exportados; nenhuma chave foi incluída no frontend ou no repositório. A conexão foi feita diretamente nesta sessão, sem alterar a configuração global de servidores MCP.
