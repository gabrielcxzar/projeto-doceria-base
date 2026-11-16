import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error(
    "Estes testes só podem executar com o emulador local. Use npm run test:rules.",
  );
let env: RulesTestEnvironment;
const sale = {
  data: "2026-10-23",
  pessoa: "CLIENTE TESTE",
  produto: "BOLO TESTE",
  quantidade: 3,
  valor: 8.5,
  pagamento: "PIX",
  status: "P",
};
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-doceria",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "usuarios/admin"), {
      nome: "Admin de teste",
      role: "admin",
    });
    await setDoc(doc(context.firestore(), "usuarios/viewer"), {
      nome: "Consulta de teste",
      role: "viewer",
    });
    await setDoc(doc(context.firestore(), "vendas/legada"), {
      ...sale,
      campoLegado: "preservar",
    });
    await setDoc(doc(context.firestore(), "atividades/historico"), {
      descricao: "Histórico legado",
      tipo: "venda",
    });
  });
}, 30000);
afterAll(async () => {
  await env?.cleanup();
});
describe("perfis e dados comerciais", () => {
  it("nega leitura sem autenticação e sem perfil, permite admin/viewer", async () => {
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), "vendas/legada")),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext("sem-perfil").firestore(),
          "vendas/legada",
        ),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(env.authenticatedContext("viewer").firestore(), "vendas/legada"),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(env.authenticatedContext("admin").firestore(), "vendas/legada"),
      ),
    );
  });
  it("permite consultar o próprio perfil ausente para informar o erro de acesso", async () => {
    const snap = await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext("sem-perfil").firestore(),
          "usuarios/sem-perfil",
        ),
      ),
    );
    expect(snap.exists()).toBe(false);
  });
  it("nega escrita SDK direta e elevação de privilégio do viewer", async () => {
    const db = env.authenticatedContext("viewer").firestore();
    await assertFails(setDoc(doc(db, "vendas/nao-permitida"), sale));
    await assertFails(updateDoc(doc(db, "usuarios/viewer"), { role: "admin" }));
  });
  it("aceita venda válida e preserva campos legados ao atualizar", async () => {
    const db = env.authenticatedContext("admin").firestore();
    await assertSucceeds(setDoc(doc(db, "vendas/nova"), sale));
    await assertSucceeds(updateDoc(doc(db, "vendas/legada"), { status: "A" }));
    expect((await getDoc(doc(db, "vendas/legada"))).data()?.campoLegado).toBe(
      "preservar",
    );
  });
  it("rejeita quantidade fracionária, preço negativo e enum desconhecido", async () => {
    const db = env.authenticatedContext("admin").firestore();
    for (const change of [
      { quantidade: 1.5 },
      { valor: -1 },
      { status: "qualquer" },
    ])
      await assertFails(
        setDoc(doc(db, "vendas/invalida"), { ...sale, ...change }),
      );
  });
  it("rejeita entrada superior ao total e permite finalizar independente da quitação", async () => {
    const db = env.authenticatedContext("admin").firestore();
    const order = {
      clienteNome: "CLIENTE TESTE",
      produtoDescricao: "Bolo",
      dataEntrega: "2026-10-24",
      valorTotal: 100,
      valorEntrada: 30,
      status: "Pendente",
    };
    await assertSucceeds(setDoc(doc(db, "encomendas/valida"), order));
    await assertFails(
      setDoc(doc(db, "encomendas/invalida"), { ...order, valorEntrada: 101 }),
    );
    await assertFails(
      updateDoc(doc(db, "encomendas/valida"), { status: "Cancelado" }),
    );
    await assertSucceeds(
      updateDoc(doc(db, "encomendas/valida"), { status: "Finalizado" }),
    );
  });
  it("gravação atômica inválida não deixa alteração parcial", async () => {
    const db = env.authenticatedContext("admin").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "vendas/lote-valido"), sale);
    batch.set(doc(db, "vendas/lote-invalido"), { ...sale, valor: -1 });
    await assertFails(batch.commit());
    expect((await getDoc(doc(db, "vendas/lote-valido"))).exists()).toBe(false);
  });
  it("mantém histórico antigo legível e impede adulterar atividades", async () => {
    const db = env.authenticatedContext("admin").firestore();
    await assertSucceeds(getDoc(doc(db, "atividades/historico")));
    await assertFails(
      updateDoc(doc(db, "atividades/historico"), { descricao: "Mudança" }),
    );
    await assertSucceeds(
      setDoc(doc(db, "atividades/nova"), {
        descricao: "Cadastro de teste",
        usuarioNome: "Admin de teste",
      }),
    );
  });
  it("não libera coleções desconhecidas nem subcoleções", async () => {
    const db = env.authenticatedContext("admin").firestore();
    await assertFails(setDoc(doc(db, "desconhecida/teste"), { valor: 1 }));
    await assertFails(
      setDoc(doc(db, "clientes/teste/privado/teste"), { valor: 1 }),
    );
  });
  it("arquiva cadastros e impede exclusão que romperia referências", async () => {
    const db = env.authenticatedContext("admin").firestore();
    await assertSucceeds(
      setDoc(doc(db, "clientes/arquivo"), {
        nome: "CLIENTE TESTE",
        contato: "",
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, "clientes/arquivo"), { arquivado: true }),
    );
    await assertFails(deleteDoc(doc(db, "clientes/arquivo")));
  });
  it("permite lote com 25 lançamentos e atividade dentro do orçamento das regras", async () => {
    const db = env.authenticatedContext("admin").firestore();
    const batch = writeBatch(db);
    for (let i = 0; i < 25; i++) batch.set(doc(db, `vendas/lote-${i}`), sale);
    batch.set(doc(db, "atividades/lote"), {
      descricao: "Lote de teste",
      usuarioNome: "Admin de teste",
    });
    await assertSucceeds(batch.commit());
  });
  it("valida recebimentos parciais/auditáveis e valorPago em vendas", async () => {
    const adminDb = env.authenticatedContext("admin").firestore();
    const viewerDb = env.authenticatedContext("viewer").firestore();

    await assertSucceeds(
      setDoc(doc(adminDb, "vendas/parcial"), {
        ...sale,
        quantidade: 2,
        valor: 50,
        valorPago: 40,
      }),
    );
    await assertFails(
      setDoc(doc(adminDb, "vendas/estouro"), {
        ...sale,
        quantidade: 2,
        valor: 50,
        valorPago: 105,
      }),
    );

    const receipt = {
      data: "2026-10-24",
      valor: 40,
      origemTipo: "venda",
      origemId: "parcial",
      clienteNome: "CLIENTE TESTE",
      descricao: "2 × BOLO TESTE",
      pagamento: "PIX",
      tipoBaixa: "parcial",
    };
    await assertSucceeds(setDoc(doc(adminDb, "recebimentos/r1"), receipt));
    await assertFails(setDoc(doc(viewerDb, "recebimentos/rv"), receipt));
    await assertFails(
      setDoc(doc(adminDb, "recebimentos/rinv"), { ...receipt, valor: 0 }),
    );
    await assertFails(
      updateDoc(doc(adminDb, "recebimentos/r1"), { valor: 50 }),
    );
    await assertFails(deleteDoc(doc(viewerDb, "recebimentos/r1")));
    await assertSucceeds(deleteDoc(doc(adminDb, "recebimentos/r1")));
  });
  it("valida movimentações e saldos quantitativos de estoque", async () => {
    const adminDb = env.authenticatedContext("admin").firestore();
    const viewerDb = env.authenticatedContext("viewer").firestore();

    await assertSucceeds(
      setDoc(doc(adminDb, "ingredientes/ing-est"), {
        nome: "Açúcar",
        unidadeCompra: "kg",
        precoCompra: 5,
        tamanhoCompra: 1000,
        unidadePadrao: "g",
        custoUnitarioPadrao: 0.005,
        estoqueAtual: 2000,
        estoqueMinimo: 500,
        estoqueIniciado: true,
      }),
    );
    await assertFails(
      setDoc(doc(adminDb, "ingredientes/ing-neg"), {
        nome: "Negativo",
        unidadeCompra: "kg",
        precoCompra: 5,
        tamanhoCompra: 1000,
        unidadePadrao: "g",
        custoUnitarioPadrao: 0.005,
        estoqueAtual: -1,
      }),
    );

    const mov = {
      data: "2026-10-24",
      itemTipo: "ingrediente",
      itemId: "ing-est",
      itemNome: "Açúcar",
      tipo: "entrada",
      direcao: "entrada",
      quantidade: 2,
      unidade: "kg",
      quantidadePadrao: 2000,
      deltaPadrao: 2000,
      unidadePadrao: "g",
      saldoAnterior: 0,
      saldoPosterior: 2000,
      motivo: "Nota fiscal #123",
      origemTipo: "nota_fiscal",
      origemId: "d1",
    };
    await assertSucceeds(
      setDoc(doc(adminDb, "movimentacoes_estoque/m1"), mov),
    );
    await assertFails(
      setDoc(doc(viewerDb, "movimentacoes_estoque/mv"), mov),
    );
    await assertFails(
      setDoc(doc(adminDb, "movimentacoes_estoque/mzero"), {
        ...mov,
        deltaPadrao: 0,
      }),
    );
    await assertFails(
      updateDoc(doc(adminDb, "movimentacoes_estoque/m1"), { deltaPadrao: 10 }),
    );
    await assertFails(deleteDoc(doc(viewerDb, "movimentacoes_estoque/m1")));
    await assertSucceeds(deleteDoc(doc(adminDb, "movimentacoes_estoque/m1")));
  });
  it("valida fornecedores e obrigatoriedade condicional de fornecedor em notas fiscais", async () => {
    const adminDb = env.authenticatedContext("admin").firestore();
    const viewerDb = env.authenticatedContext("viewer").firestore();

    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "despesas/nf-legada"), {
        data: "2026-10-01",
        tipo: "Material",
        descricao: "NF antiga sem id",
        quantidade: "1 item",
        valor: 50,
        isNotaFiscal: true,
        fornecedor: "Fornecedor Legado",
      });
    });

    await assertSucceeds(
      setDoc(doc(adminDb, "fornecedores/f1"), {
        nome: "Distribuidora Teste",
      }),
    );
    await assertFails(
      setDoc(doc(viewerDb, "fornecedores/fv"), { nome: "Bloqueado" }),
    );
    await assertSucceeds(getDoc(doc(viewerDb, "fornecedores/f1")));
    await assertFails(
      setDoc(doc(adminDb, "fornecedores/f-vazio"), { nome: "" }),
    );
    await assertSucceeds(
      updateDoc(doc(adminDb, "fornecedores/f1"), { arquivado: true }),
    );
    await assertFails(deleteDoc(doc(adminDb, "fornecedores/f1")));

    // Despesa simples funciona sem fornecedor.
    await assertSucceeds(
      setDoc(doc(adminDb, "despesas/d-simples"), {
        data: "2026-11-16",
        tipo: "Material",
        descricao: "Frete avulso",
        quantidade: "1",
        valor: 25,
      }),
    );

    // Nova nota fiscal exige fornecedorId e fornecedorNome.
    await assertFails(
      setDoc(doc(adminDb, "despesas/nf-sem-forn"), {
        data: "2026-11-16",
        tipo: "Material",
        descricao: "NF incompleta",
        quantidade: "1 item",
        valor: 100,
        isNotaFiscal: true,
      }),
    );
    await assertSucceeds(
      setDoc(doc(adminDb, "despesas/nf-ok"), {
        data: "2026-11-16",
        tipo: "Material",
        descricao: "NF 10 · Distribuidora Teste",
        quantidade: "2 itens",
        valor: 100,
        isNotaFiscal: true,
        fornecedorId: "f1",
        fornecedorNome: "Distribuidora Teste",
      }),
    );

    // Nota histórica sem vínculo continua editável e também pode receber vínculo manual.
    await assertSucceeds(
      updateDoc(doc(adminDb, "despesas/nf-legada"), {
        observacoes: "Conferida",
      }),
    );
    await assertSucceeds(
      updateDoc(doc(adminDb, "despesas/nf-legada"), {
        fornecedorId: "f1",
        fornecedorNome: "Distribuidora Teste",
      }),
    );
  });
});
