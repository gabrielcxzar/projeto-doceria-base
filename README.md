# Lá Divino Sabor

Gestão interna da confeitaria, com React, TypeScript, Vite, Firebase Authentication e Firestore. PWA instalável para celular e computador. As gravações exigem internet; transações não são enfileiradas offline.

## Documentação

- [Índice da documentação](docs/README.md): arquitetura, modelo de dados, operação e decisões.
- [Manual de uso](docs/manual-de-uso.md): rotina da equipe.
- [Desenvolvimento com Bootstrap e Spec Kit](docs/desenvolvimento.md): especificações e manutenção do projeto.
- [Entrada de agentes](AGENTS.md) e [constituição](.specify/memory/constitution.md).

## Executar

Requer Node.js 22.12 ou superior (linha 22), npm e, para os emuladores, Java 21 ou superior.

```powershell
npm ci
npm run dev
```

- Aplicação: http://127.0.0.1:5173 (usa o Firebase existente após login).
- Prévia isolada: http://127.0.0.1:5173/?demo=1 (dados fictícios, sem gravações no Firebase).
- Perfil de consulta fictício: http://127.0.0.1:5173/?demo=viewer.
- Login visual: http://127.0.0.1:5173/?demo=login.

A demonstração só existe no servidor de desenvolvimento; não é incluída como modo acessível na compilação de produção. Nenhuma credencial administrativa é necessária no navegador. A configuração web pública do Firebase está em `src/firebase.ts`; tokens administrativos e chaves do Stitch não pertencem ao código.

## Verificar

```powershell
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:pwa
npm run test:rules
npm run test:integration
```

Os emuladores usam exclusivamente o projeto fictício `demo-doceria`, portas 8080 e 9099. Execute os dois comandos de emuladores em sequência. A integração usa uma segunda aplicação Vite na porta 5174 e bloqueia requisições externas no navegador de testes. Não utiliza contas ou registros reais.

## Fluxos preservados

Painel e metas; vendas e pagamentos; encomendas e entradas; despesas; clientes; produtos e precificação; ingredientes, receitas e materiais; cobranças por cliente e por lançamento; mensagens de WhatsApp abertas manualmente; relatórios por período, cliente e produto; CSV, impressão e exportação completa JSON.

- Vendas legadas continuam identificadas por nome. Novas vendas incluem também IDs. Renomear cadastros preserva nomes anteriores para manter os vínculos históricos.
- Totais dos clientes são calculados dos lançamentos, corrigindo agregados antigos inconsistentes sem reescrever o histórico.
- Custos indiretos entram no preço. O percentual sobre custo é chamado de acréscimo/markup, sem confusão com margem sobre receita.
- Receitas e produtos mantêm custos salvos. Após reajustar insumos, revise e salve as receitas e os produtos dependentes. Vendas novas preservam o custo unitário da ocasião.
- Cadastros são arquivados e podem ser reativados; referências históricas são preservadas.
- O resultado de caixa é recebido menos despesas; não é apresentado como lucro contábil.
- O período de encomendas considera a entrega, pois o legado não registra cada recebimento com sua própria data. Não foi inventado histórico financeiro.
- O JSON inclui as 12 coleções conhecidas, IDs, campos extras e datas tipadas. Não inclui senhas/Auth, infraestrutura ou restauração automática. Guarde os arquivos exportados fora do repositório.

## Firebase e publicação

O projeto existente permanece `gestao-de-confeitaria`; `.firebaserc` foi preservado. Hosting publica `dist/`. Regras em `firestore.rules` usam os perfis existentes em `usuarios/{uid}`, permitem consulta a admin/viewer e escrita somente a admin. A criação de contas e papéis continua administrativa; não há cadastro público.

O GitHub valida tipos, cálculos, regras, navegador e compilação antes de publicar a branch `main`. O secret existente `FIREBASE_TOKEN` é preservado; não copie seu valor para o repositório. É recomendável migrar futuramente a autenticação do CI para identidade federada, separadamente desta recuperação.

Para uma prévia do Hosting:

```powershell
npm run build
npx firebase hosting:channel:deploy reformulacao --project gestao-de-confeitaria --expires 7d
```

Uma prévia do Hosting utiliza o mesmo backend: operações feitas após login são reais. Para demonstração sem dados reais, use `?demo=1` no servidor local.

Publicação, após as verificações:

```powershell
npx firebase deploy --project gestao-de-confeitaria --only 'hosting,firestore:rules'
```

Não executar `firebase init`, recriar o banco, habilitar faturamento ou publicar índices desnecessariamente. Para reverter o frontend, use a versão anterior no histórico do Hosting; regras devem ser revertidas separadamente. Consulte `docs/reformulacao.md` para critérios e validação.

## Design do Stitch

Projeto: https://stitch.withgoogle.com/projects/9508448770898154872

Imagens, HTMLs e IDs estão em `docs/design/stitch/`. São propostas visuais com dados fictícios; sugestões de estoque/produção do protótipo não representam módulos implementados. A aplicação utiliza a direção chocolate/creme, com os fluxos reais do escopo.

A chave `STITCH_API_KEY` é uma variável local de usuário Windows; ela não é necessária para executar o site e não deve ser enviada ao frontend ou ao GitHub.
