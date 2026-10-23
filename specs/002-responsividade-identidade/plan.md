# Implementation Plan: Responsividade e identidade

**Branch:** `fix/responsividade-identidade` | **Data:** 2026-10-23 | **Spec:** [spec.md](spec.md)

## Objetivo e escopo

Corrigir o layout completo, acesso ao menu e uso em telas pequenas/baixas; restaurar a imagem e favicon originais. Preservar cores combinadas, módulos e lógica de dados.

## Evidências iniciais

- `.sidebar` é fixa entre topo e base, mas não define overflow vertical e permite compressão dos itens flex.
- A logo original existe e seu blob Git é idêntico ao arquivo pré-reformulação; a interface usa somente o nome em texto.
- `index.html` aponta para o desenho substituto `icon.svg`; o manifesto também usa ícones substitutos.
- Existem blocos de media queries fora de ordem; o ajuste compacto de venda é sobrescrito pelo grid genérico posterior.
- O teste antigo verifica a largura somente ao fim da navegação, não em cada área, formulário, altura ou orientação.

## Implementação

1. Tornar a barra lateral rolável em toda a altura disponível e impedir compressão/corte dos seus grupos.
2. Completar o drawer móvel: fechamento interno, Escape, foco contido, bloqueio de fundo e restauração ao fechar/redimensionar.
3. Introduzir uma referência única à imagem original, exibi-la integralmente no login/menu/cabeçalho e restaurar favicon/ícone PWA para esse asset inalterado.
4. Corrigir layouts de filtros, métricas, listas, títulos, formulários e diálogos em breakpoints coerentes. Manter tabelas/gráficos largos dentro de regiões de rolagem próprias.
5. Substituir os ícones inventados e retirar a geração que desenhava uma marca diferente.
6. Testar navegação, diálogos e marcas nas dimensões da matriz; validar fluxos reais nos emuladores e PWA compilada.

## Matriz de validação

Larguras/alturas CSS de referência: 320×568, 360×640, 390×844, 430×932, 568×320, 844×390, 768×1024, 820×1180, 900×600, 901×600, 1024×768, 1280×720, 1366×600, 1440×900 e 1920×1080. Incluir área reduzida de 390×300 e 640×360 para simular pouco espaço disponível.

Todas as sete áreas, cinco tipos de cadastro, formulários de venda/encomenda/despesa/cadastros/meta, cobranças, confirmação, exportação, login e tema escuro entram na revisão. Verificar conteúdo extenso e chegar à última coluna das tabelas.

## Restrições Firebase e constituição

Sem alteração de projeto, autenticação, regras, índices, coleções, cálculos ou faturamento. Fixtures locais e emuladores isolam gravações de teste. A correção de frontend será publicada pelo fluxo existente após os checks. Não redesenhar, recortar ou reencodar a logo para criar outra identidade.

## Critérios de conclusão

Matriz sem overflow global ou controles inacessíveis; menu rolável e operável por teclado; imagem original preservada por hash e referenciada em todas as entradas; PWA compilada funcional; checks e fluxos existentes aprovados; capturas intencionais somente com dados fictícios; diff sem segredos/artefatos locais.
