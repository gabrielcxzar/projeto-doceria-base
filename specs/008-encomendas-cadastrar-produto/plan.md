# Plano Técnico: Cadastro de produto durante o lançamento de encomendas

## Mudanças planejadas

1. **`src/editors.tsx` (`Editor`):**
   - Adicionar callback opcional `onSaved?: (id: string, data: Record<string, unknown>) => void` em `Editor`.
   - Para criação de novo registro (`!record`), assegurar `mainId = mainId || crypto.randomUUID()` e `createOnly = true` (ou ao menos para `kind === "product"` sempre gerar `mainId` e `createOnly: true` antes de chamar `save(...)`), permitindo passar `(mainId, payload)` com garantia de ID real no Firestore e no modo demo após `await save(...)`.
   - No `Editor` quando `kind === "order"`:
     - Estado `const [showNewProduct, setShowNewProduct] = useState(false);`
     - Botão `type="button"` **Cadastrar produto** na seção **Produtos da encomenda** exibido somente se `profile.role === "admin"`.
     - Renderizar `<Editor key="nested-product" kind="product" onClose={() => setShowNewProduct(false)} onSaved={(savedId, savedPayload) => { setOrderProdId(savedId); setOrderProdPrice(String(savedPayload.valor ?? "")); }} />` como **irmão** fora de `<Modal>` da encomenda para isolar eventos sintéticos React (`onSubmit`, `onCancel`, `onClick`) e garantir gerenciamento correto de foco/top-layer entre `<dialog>`s nativos.
2. **`src/styles.css`:**
   - Garantir alinhamento vertical limpo de `.ingredient-builder > .detail-box-head` no computador e celular.
3. **Testes (`tests/browser/preview.spec.ts` e `tests/browser/firebase.spec.ts`):**
   - Cobrir os 8 cenários solicitados: Nova Encomenda, Editar Encomenda, seleção automática pelo ID real, cancelamento preservando rascunho, falha simulada de gravação preservando formulários, preservação de itens e acessórios já incluídos, bloqueio de produto duplicado e ocultação para `viewer`, em desktop e mobile.
4. **Documentação (`docs/manual-de-uso.md`, `.ai/CHANGELOG_AI.md`, `specs/008-encomendas-cadastrar-produto/*`).**
