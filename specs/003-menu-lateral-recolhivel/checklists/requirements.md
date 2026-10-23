# Checklist: Menu lateral recolhível

- [x] Objetivo, cenários, aceite e restrições Firebase explícitos.
- [x] Sem decisões comerciais pendentes ou mudança da marca.
- [x] Ocultar/reabrir expande o conteúdo e conserva foco/estado acessível.
- [x] Preferência persiste e falha de armazenamento não impede operação.
- [x] Navegação móvel e transições entre tamanhos preservadas.
- [x] Checks locais e revisão de diff concluídos.
- [ ] Publicação confirmada no endereço existente.

## Evidências

- `npm run check`: tipos e 11 testes de domínio aprovados.
- `npm run test:e2e`: 12 cenários aprovados, incluindo preferência, recarga, troca de módulo, transições desktop/celular, teclado e armazenamento bloqueado.
- Seis cenários direcionados da matriz aprovados: 390×844, 901×600, 1366×600, 1920×1080 e WebKit em celular/tablet. Confirmam lateral oculta inerte, margem zerada, logo visível, foco mantido e reabertura sem overflow.
- Logo original preservada: blob Git `0b344d7417c4f20b811eb09ba2401c080cc64aa3`. Nenhuma mudança de regras, dados, serviço Firebase, manifesto ou faturamento. `git diff --check` sem erros.
- CI completo e publicação: aguardando execução.
