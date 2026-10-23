# Checklist: Responsividade e identidade

## Especificação

- [x] Pedido focado em valor ao usuário e sem decisões comerciais pendentes.
- [x] Cenários de menu, telas/formulários e marca possuem aceite verificável.
- [x] Critérios mensuráveis incluem limites de largura e alcance de ações.
- [x] Limites, alturas pequenas, paisagem e textos extensos estão cobertos.
- [x] Restrições Firebase e preservação do asset original são explícitas.

## Aceite de implementação

- [x] Menu inteiro alcançável por rolagem, com fechamento e teclado funcionais.
- [x] Todas as áreas e diálogos aprovados na matriz local, sem corte impeditivo; regressão final integral será repetida no CI.
- [x] Logo visível e integral; favicon/ícone PWA usam o arquivo original intacto.
- [x] Fluxos existentes, compilação e PWA aprovados localmente.
- [x] Capturas revisadas e diff sem alterações de banco ou segredos.
- [ ] CI integral, merge e publicação no endereço existente confirmados.

## Evidências

- Reprodução antes da correção em 1366×600: lateral com `clientHeight=600`, `scrollHeight=692`, `overflowY=visible` e botão Sair abaixo de 691px. Nenhuma imagem de logo no layout e favicon apontando para o desenho substituto.
- Depois da correção: lateral de 600px, conteúdo de 815px e `overflowY=auto`, com todas as ações alcançáveis. Captura com barras reais em [menu-notebook.png](../../../docs/design/responsividade/menu-notebook.png).
- A matriz local percorreu 17 dimensões Chromium e duas WebKit. As três falhas iniciais do harness foram corrigidas: esperar a montagem antes de escolher menu móvel e rolar verticalmente até a ação da tabela. Os 13 cenários de 320px, 901px, WebKit celular/tablet e conteúdo extenso foram revalidados com sucesso.
- O teste adicional encontrou e corrigiu overflow com totais em milhões. Painel, financeiro e relatórios passaram com nome de 116 caracteres e valor de R$ 9.999.990,00, em nove larguras, sem cortar ou quebrar o total.
- `npm run check`: 11 testes de domínio e tipos aprovados; `npm run test:e2e`: 10 aprovados; `npm run test:integration`: 12 aprovados nos emuladores. O CI também verifica explicitamente que o logout pelo drawer libera a rolagem do login.
- `npm run build` e `npm run test:pwa`: aprovados; manifesto com PNG original 1024×1024, instalação sem erros no Chromium e logo disponível no cache offline. Blob original preservado: `0b344d7417c4f20b811eb09ba2401c080cc64aa3`.
- `npm audit --omit=dev`: nenhuma vulnerabilidade; `git diff --check`: sem erros. Serviço, domínio, regras, projeto Firebase e arquivo da logo sem alterações.
- Cinco capturas intencionais com dados fictícios em [docs/design/responsividade](../../../docs/design/responsividade/), geradas com barras de rolagem habilitadas. Nenhuma validação em aparelho físico foi realizada; alturas pequenas simulam espaço reduzido, não o comportamento completo de teclados móveis.
- Publicação: aguardando o pipeline da PR e o deploy de `main`.
