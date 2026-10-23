# Checklist: Menu lateral recolhível

- [x] Objetivo, cenários, aceite e restrições Firebase explícitos.
- [x] Sem decisões comerciais pendentes ou mudança da marca.
- [x] Ocultar/reabrir expande o conteúdo e conserva foco/estado acessível.
- [x] Preferência persiste e falha de armazenamento não impede operação.
- [x] Navegação móvel e transições entre tamanhos preservadas.
- [x] Checks locais e revisão de diff concluídos.
- [x] Publicação confirmada no endereço existente.

## Evidências

- `npm run check`: tipos e 11 testes de domínio aprovados.
- `npm run test:e2e`: 12 cenários aprovados, incluindo preferência, recarga, troca de módulo, transições desktop/celular, teclado e armazenamento bloqueado.
- Seis cenários direcionados da matriz aprovados: 390×844, 901×600, 1366×600, 1920×1080 e WebKit em celular/tablet. Confirmam lateral oculta inerte, margem zerada, logo visível, foco mantido e reabertura sem overflow.
- Logo original preservada: blob Git `0b344d7417c4f20b811eb09ba2401c080cc64aa3`. Nenhuma mudança de regras, dados, serviço Firebase, manifesto ou faturamento. `git diff --check` sem erros.
- [PR #4](https://github.com/gabrielcxzar/projeto-doceria-base/pull/4) integrada como `1c5d6d5`. [CI da PR](https://github.com/gabrielcxzar/projeto-doceria-base/actions/runs/39976314940) e [CI/publicação da main](https://github.com/gabrielcxzar/projeto-doceria-base/actions/runs/39977481361) aprovados: 105 testes em cada execução (58 responsivos, 12 de navegador, 12 de integração, 11 de domínio, 11 de regras e 1 PWA), tipos, build e auditoria.
- Deploy concluído em 2026-10-23 às 15:28:59 UTC. As duas URLs públicas Firebase servem o bundle `/assets/index-C24jDI94.js`, com os controles Ocultar/Mostrar menu lateral e a preferência local. Logo original confirmada por hash e login público sem erros de JavaScript. Interações autenticadas foram testadas com fixtures/emuladores, sem usar dados ou contas comerciais em produção.
