# Operação, validação e manutenção

## Ambientes

| Ambiente                                      | Backend e restrição                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`, acesso normal                  | Firebase real depois do login                                                       |
| `npm run dev`, `?demo=1` / `viewer` / `login` | Fixtures locais; sem gravações Firebase                                             |
| `npm run test:rules`                          | Apenas Firestore Emulator em `demo-doceria`                                         |
| `npm run test:integration`                    | Auth/Firestore emulados; Vite em 5174 e bloqueio de requisições externas nos testes |
| Prévia Hosting                                | Backend real depois do login; URL temporária não isola dados                        |
| Produção                                      | Projeto `gestao-de-confeitaria`; Hosting, Authentication e Firestore existentes     |

Pré-requisitos de ferramentas e inicialização estão no [README](../README.md). A aplicação não precisa da chave do Stitch ou de credenciais administrativas no navegador.

## Variáveis e credenciais

| Nome                                                     | Uso                                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `VITE_USE_EMULATORS`                                     | Flag de desenvolvimento; só funciona em host local e usa o projeto fictício |
| `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` | Fornecidas pelos emuladores aos testes; não apontar para produção           |
| `FIREBASE_TOKEN`                                         | Secret existente do GitHub Actions, restrito à etapa de publicação          |
| `STITCH_API_KEY`                                         | Variável local para produzir referências visuais; não é requisito do site   |
| `CI`                                                     | Controla o comportamento de reutilização de servidor nos testes             |

Não copie valores dessas variáveis para documentos ou scripts versionados. O objeto web público Firebase em `src/firebase.ts` identifica o aplicativo; a autorização continua nas regras.

## Matriz de verificações

| Alteração                  | Verificação proporcional                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Documentação e Spec Kit    | Links locais, artefatos preenchidos, scripts de pré-requisitos/integração, diff e segredos; `npm run check` como sanidade do baseline |
| Domínio/formulários        | `npm run check`, compilação e cenários de navegador afetados                                                                          |
| Serviço Firebase ou regras | Checks anteriores + `npm run test:rules` e `npm run test:integration`                                                                 |
| Cache/manifesto/assets PWA | `npm run build` e `npm run test:pwa`                                                                                                  |
| Publicação de código       | Pipeline definido no workflow; não pular checks por conveniência                                                                      |

```powershell
npm run check
npm run build
npm run test:e2e
npm run test:pwa
npm run test:rules
npm run test:integration
```

Execute os comandos de emuladores em sequência. As portas são 8080 e 9099; servidores Vite de teste usam 5173/5174 e a prévia compilada usa 4173. Se houver conflito, identifique o processo antes de encerrar; não mate um serviço desconhecido só pela porta.

## Publicação e reversão

O [workflow](../.github/workflows/deploy.yml) valida PRs. Push em `main` também publica aplicação e regras. Uma mudança somente documental não exige publicação Firebase por si só, mas o workflow atual é acionado por todo push em `main`.

Os comandos existentes de prévia/publicação estão no README. Revise primeiro `git diff`, a especificação e o resultado dos testes. Não executar `firebase init`, recriar projeto, alterar billing ou publicar índices desnecessários.

Para uma falha de frontend, use o histórico de versões do Hosting para uma reversão apropriada. Regras precisam de reversão separada pelo histórico do Firebase ou por uma versão conhecida e revisada de `firestore.rules`. Reverter arquivos não restaura dados. O JSON exportado não deve ser importado indiscriminadamente.

## Diagnóstico seguro

1. Verifique se a página e o bundle abrem e se há erro de JavaScript no navegador.
2. Confira conexão, sessão e perfil `usuarios/{uid}`; uma conta Auth sem perfil não recebe acesso aos dados.
3. Consulte o resultado do GitHub Actions antes de atribuir uma falha a Hosting ou banco.
4. Se o Firebase CLI retornar autenticação inválida, reautentique no terminal. Nunca publique tokens ou a saída completa de credenciais.
5. Reproduza gravações nos emuladores. Não crie vendas/despesas de teste na produção.
6. Se houver alteração de regras, compare com o contrato de dados e valide no emulador.

Registre somente evidências necessárias. Não exporte Auth com senhas/hashes ou coleções reais para o Git. Contagens históricas da reformulação não garantem o estado atual de produção.
