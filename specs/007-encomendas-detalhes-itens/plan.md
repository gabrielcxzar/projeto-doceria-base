# Plano Técnico: Apresentação vertical dos itens nas encomendas

## Mudanças planejadas

1. **`src/pages.tsx` (`Orders`):**
   - No bloco expandido (`isOpen && <tr className="detail-row">`), verificar `const hasStructured = Boolean((o.itens && o.itens.length > 0) || (o.acessorios && o.acessorios.length > 0));`.
   - Para encomendas estruturadas:
     - Cabeçalho discreto no `.inline-title` (`g.orders.length > 1 ? "Encomenda N · M itens" : "Itens da encomenda (M)"` — apenas contagem estrutural sem concatenar produtos) + `orderStatus(o)`.
     - Lista vertical `<ul className="order-detail-lines">` exibindo cada item de `o.itens` e cada acessório de `o.acessorios` em sua própria `<li>` com quantidade, nome/descrição e subtotal formatado (`money(it.subtotal)` / cobrado ou `Incluso`).
   - Para encomendas legadas sem estrutura: manter `<strong>{o.produtoDescricao}</strong>` + `orderStatus(o)`.
   - Preservar `Obs.: {o.observacoes}`, resumo financeiro (`Total`, `Recebido`, `A receber`) e `<Actions />`.
2. **`src/styles.css`:**
   - Adicionar estilos `.order-detail-lines`, `.order-detail-line` e `.order-detail-price` com quebra limpa de nomes longos (`min-width: 0; overflow-wrap: anywhere`) para desktop e celular (`320px`+).
3. **Testes (`tests/browser/preview.spec.ts`, `tests/browser/firebase.spec.ts`):**
   - Testar encomenda com 1 produto, encomenda com múltiplos produtos + acessórios (verificando itens em linhas separadas e ausência de concatenação redundante dentro dos detalhes), múltiplas encomendas agrupadas no mesmo cliente/data, totais e compatibilidade legada em desktop e mobile.
4. **Documentação (`docs/manual-de-uso.md`, `.ai/CHANGELOG_AI.md`, `specs/007-encomendas-detalhes-itens/*`).**
