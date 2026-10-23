# Documentação do projeto

Comece pelo [README principal](../README.md) para instalar e executar.

| Necessidade                                    | Documento                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| Utilizar o sistema no dia a dia                | [Manual de uso](manual-de-uso.md)                                   |
| Entender componentes, sessão, gravações e PWA  | [Arquitetura](ARCHITECTURE.md)                                      |
| Entender coleções, relações e cálculos         | [Modelo de dados](modelo-de-dados.md)                               |
| Executar testes, diagnosticar e publicar       | [Guia operacional](operacao.md)                                     |
| Criar uma especificação ou manter documentação | [Fluxo de desenvolvimento](desenvolvimento.md)                      |
| Entender escolhas já aceitas                   | [Decisões](DECISIONS.md)                                            |
| Iniciar trabalho como agente                   | [AGENTS.md](../AGENTS.md) e [contexto](../.ai/CONTEXT.md)           |
| Consultar a auditoria da adoção                | [Auditoria](../.meta/AUDIT.md)                                      |
| Revisar a primeira adoção SDD                  | [Especificação da adoção](../specs/001-adocao-documentacao/spec.md) |

## Histórico e design

- [Reformulação e recuperação do Firebase](reformulacao.md): decisões e validações da mudança já entregue.
- [Projeto do Stitch](https://stitch.withgoogle.com/projects/9508448770898154872), [painel gerado](design/stitch/painel-desktop.png) e [venda mobile gerada](design/stitch/registrar-venda-mobile.png).
- [Painel implementado](design/aplicacao/painel-desktop.png), [venda mobile implementada](design/aplicacao/venda-celular.png) e [login implementado](design/aplicacao/login-desktop.png), com dados fictícios.

Protótipos do Stitch não são contratos de funcionalidades: alertas de estoque e produção sugeridos nas imagens não foram implementados como módulos quantitativos.

## Regra de manutenção

Atualize o documento que possui a informação. Mantenha decisões no histórico de decisões, requisitos de uma mudança na sua feature e descrições do sistema atual na arquitetura/modelo/manual. A [constituição](../.specify/memory/constitution.md) concentra as restrições permanentes; as [convenções](../.ai/AI_CONVENTIONS.md) concentram destinos e governança documental.
