# Checklist: Responsividade e identidade

## Especificação

- [x] Pedido focado em valor ao usuário e sem decisões comerciais pendentes.
- [x] Cenários de menu, telas/formulários e marca possuem aceite verificável.
- [x] Critérios mensuráveis incluem limites de largura e alcance de ações.
- [x] Limites, alturas pequenas, paisagem e textos extensos estão cobertos.
- [x] Restrições Firebase e preservação do asset original são explícitas.

## Aceite de implementação

- [x] Menu inteiro alcançável por rolagem, com fechamento e teclado funcionais.
- [x] Todas as áreas e diálogos aprovados na matriz local e no CI, sem corte impeditivo.
- [x] Logo visível e integral; favicon/ícone PWA usam o arquivo original intacto.
- [x] Fluxos existentes, compilação e PWA aprovados localmente.
- [x] Capturas revisadas e diff sem alterações de banco ou segredos.
- [x] CI integral, merge e publicação no endereço existente confirmados.

## Evidências

- Reprodução antes da correção em 1366×600: lateral com `clientHeight=600`, `scrollHeight=692`, `overflowY=visible` e botão Sair abaixo de 691px. Nenhuma imagem de logo no layout e favicon apontando para o desenho substituto.
- Depois da correção: lateral de 600px, conteúdo de 815px e `overflowY=auto`, com todas as ações alcançáveis. Captura com barras reais em [menu-notebook.png](../../../docs/design/responsividade/menu-notebook.png).
- A matriz local percorreu 17 dimensões Chromium e duas WebKit. As três falhas iniciais do harness foram corrigidas: esperar a montagem antes de escolher menu móvel e rolar verticalmente até a ação da tabela. Os 13 cenários de 320px, 901px, WebKit celular/tablet e conteúdo extenso foram revalidados com sucesso.
- O teste adicional encontrou e corrigiu overflow com totais em milhões. Painel, financeiro e relatórios passaram com nome de 116 caracteres e valor de R$ 9.999.990,00, em nove larguras, sem cortar ou quebrar o total.
- `npm run check`: 11 testes de domínio e tipos aprovados; `npm run test:e2e`: 10 aprovados; `npm run test:integration`: 12 aprovados nos emuladores. O CI também verifica explicitamente que o logout pelo drawer libera a rolagem do login.
- `npm run build` e `npm run test:pwa`: aprovados; manifesto com PNG original 1024×1024, instalação sem erros no Chromium e logo disponível no cache offline. Blob original preservado: `0b344d7417c4f20b811eb09ba2401c080cc64aa3`.
- `npm audit --omit=dev`: nenhuma vulnerabilidade; `git diff --check`: sem erros. Serviço, domínio, regras, projeto Firebase e arquivo da logo sem alterações.
- Cinco capturas intencionais com dados fictícios em [docs/design/responsividade](../../../docs/design/responsividade/), geradas com barras de rolagem habilitadas. Nenhuma validação em aparelho físico foi realizada; alturas pequenas simulam espaço reduzido, não o comportamento completo de teclados móveis.
- [PR #3](https://github.com/gabrielcxzar/projeto-doceria-base/pull/3) integrada como `50b5086d0450d8cf652cff732ef78d08a494f5b0`. [CI da PR](https://github.com/gabrielcxzar/projeto-doceria-base/actions/runs/39972023515) e [CI/publicação da main](https://github.com/gabrielcxzar/projeto-doceria-base/actions/runs/39973400797) aprovados. Cada execução confirmou 103 testes: 58 responsivos, 11 de domínio, 10 de navegador, 12 de integração, 11 de regras e 1 PWA; tipos, build e auditoria também aprovados.
- Deploy Firebase concluído em 2026-10-23 às 14:59:16 UTC. Verificação pública em `gestao-de-confeitaria.web.app` e `gestao-de-confeitaria.firebaseapp.com`: HTTP 200, bundle `/assets/index-CGbEzN-R.js`, favicon/manifesto corretos, PNG original de 1.554.486 bytes com hash histórico, nenhum erro de JavaScript e instalação Chromium sem erros.
- Login público conferido em cinco dimensões (320×568, 390×844, 768×1024, 844×390 e 1366×600) em cada URL: logo inteira carregada, página sem overflow e entrada alcançável por rolagem. Fluxos autenticados foram validados nos emuladores, sem usar contas ou dados comerciais para testes.
