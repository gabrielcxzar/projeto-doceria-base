import type { Timestamp } from "firebase/firestore";

export const collections = [
  "usuarios",
  "clientes",
  "produtos",
  "vendas",
  "encomendas",
  "despesas",
  "cobrancas",
  "atividades",
  "configuracoes",
  "ingredientes",
  "receitas",
  "materiais",
  "recebimentos",
  "movimentacoes_estoque",
] as const;
export type CollectionName = (typeof collections)[number];
export type DateValue = Timestamp | Date | string | null;
export type BaseUnit = "g" | "ml" | "unidade";
export type StockUnit = "g" | "kg" | "ml" | "l" | "unidade";

export interface RecordBase {
  id: string;
  criadoEm?: DateValue;
  atualizadoEm?: DateValue;
  arquivado?: boolean;
}
export interface UserProfile extends RecordBase {
  nome: string;
  role: "admin" | "viewer";
}
export interface Customer extends RecordBase {
  nome: string;
  nomesAnteriores?: string[];
  contato: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  totalGasto?: number;
  ultimaCompra?: string | null;
}
export interface Ingredient extends RecordBase {
  nome: string;
  unidadeCompra: string;
  precoCompra: number;
  tamanhoCompra: number;
  unidadePadrao: string;
  custoUnitarioPadrao: number;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  estoqueIniciado?: boolean;
}
export interface RecipeItem {
  ingredienteId: string;
  quantidade: number;
  unidadeUso: string;
  custo: number;
}
export interface Recipe extends RecordBase {
  titulo: string;
  rendimento: number;
  ingredientes: RecipeItem[];
  custoTotal: number;
  custoPorUnidade: number;
}
export interface Material extends RecordBase {
  nome: string;
  custo: number;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  estoqueIniciado?: boolean;
}
export interface Product extends RecordBase {
  nome: string;
  nomesAnteriores?: string[];
  categoria: string;
  valor: number;
  custoMaterial: number;
  custoMaoObra: number;
  custosInvisiveis?: number;
  margem: number;
  tempoPreparo: number;
  composicaoReceitas?: { id: string; titulo: string }[];
  materiaisUtilizados?: { id: string; nome: string }[];
}
export interface Sale extends RecordBase {
  data: string;
  pessoa: string;
  clienteId?: string;
  produto: string;
  produtoId?: string;
  quantidade: number;
  valor: number;
  custoUnitario?: number;
  pagamento: string;
  status: "P" | "A" | "E";
  pedidoId?: string;
  valorPago?: number;
}
export interface OrderItem {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  valorUnitario: number;
  valorCadastro?: number;
  subtotal: number;
  custoUnitario?: number;
}
export interface OrderAccessory {
  materialId?: string;
  descricao: string;
  quantidade: number;
  unidade?: string;
  cobradoCliente: boolean;
  valorUnitario: number;
  subtotal: number;
}
export interface Order extends RecordBase {
  clienteNome: string;
  clienteId?: string;
  produtoDescricao: string;
  itens?: OrderItem[];
  acessorios?: OrderAccessory[];
  observacoes?: string;
  dataEntrega: string;
  valorTotal: number;
  valorEntrada: number;
  status: "Pendente" | "Em Produção" | "Finalizado";
}
export interface ExpenseInvoiceItem {
  id: string;
  itemTipo: "ingrediente" | "material" | "outro";
  itemId?: string;
  itemNome: string;
  quantidade: number;
  unidade: string;
  quantidadePadrao?: number;
  unidadePadrao?: BaseUnit;
  valorUnitario: number;
  subtotal: number;
  geraEstoque: boolean;
}
export interface ExpenseStockEntry {
  itemTipo: "ingrediente" | "material";
  itemId: string;
  itemNome: string;
  quantidade: number;
  unidade: string;
  quantidadePadrao: number;
  unidadePadrao: BaseUnit;
  movimentoId: string;
}
export interface Expense extends RecordBase {
  data: string;
  tipo: string;
  descricao: string;
  quantidade: string;
  valor: number;
  isNotaFiscal?: boolean;
  fornecedor?: string;
  numeroNota?: string;
  observacoes?: string;
  itensNota?: ExpenseInvoiceItem[];
  entradaEstoque?: ExpenseStockEntry;
}
export interface Activity extends RecordBase {
  tipo: string;
  descricao: string;
  usuarioNome?: string;
}
export interface Charge extends RecordBase {
  clienteNome: string;
  clienteId?: string;
  tipo: string;
  data: DateValue;
}
export interface Settings extends RecordBase {
  metaMensal: number;
  ultimoBackup: DateValue;
}
export interface PaymentReceipt extends RecordBase {
  data: string;
  valor: number;
  origemTipo: "venda" | "encomenda" | "pedido_venda";
  origemId: string;
  vendaIds?: string[];
  clienteId?: string;
  clienteNome: string;
  descricao: string;
  pagamento: string;
  tipoBaixa:
    | "parcial"
    | "integral"
    | "quitacao_cliente"
    | "entrada_encomenda"
    | "venda_avista";
  observacao?: string;
}
export interface StockMovement extends RecordBase {
  data: string;
  itemTipo: "ingrediente" | "material";
  itemId: string;
  itemNome: string;
  tipo: "saldo_inicial" | "entrada" | "saida" | "ajuste";
  direcao: "entrada" | "saida";
  quantidade: number;
  unidade: string;
  quantidadePadrao: number;
  deltaPadrao: number;
  unidadePadrao: BaseUnit;
  saldoAnterior?: number | null;
  saldoPosterior: number;
  motivo: string;
  observacao?: string;
  origemTipo?:
    | "nota_fiscal"
    | "despesa"
    | "inventario"
    | "manual"
    | "correcao_nota";
  origemId?: string;
  origemItemId?: string;
  custoUnitario?: number;
}
export interface DataStore {
  usuarios: UserProfile[];
  clientes: Customer[];
  produtos: Product[];
  vendas: Sale[];
  encomendas: Order[];
  despesas: Expense[];
  cobrancas: Charge[];
  atividades: Activity[];
  configuracoes: Settings[];
  ingredientes: Ingredient[];
  receitas: Recipe[];
  materiais: Material[];
  recebimentos: PaymentReceipt[];
  movimentacoes_estoque: StockMovement[];
}
export const emptyData = (): DataStore => ({
  usuarios: [],
  clientes: [],
  produtos: [],
  vendas: [],
  encomendas: [],
  despesas: [],
  cobrancas: [],
  atividades: [],
  configuracoes: [],
  ingredientes: [],
  receitas: [],
  materiais: [],
  recebimentos: [],
  movimentacoes_estoque: [],
});
export type Entity = DataStore[CollectionName][number];
export interface Mutation {
  collection: CollectionName;
  id?: string;
  createOnly?: boolean;
  data?: Record<string, unknown>;
  remove?: boolean;
  expectedUpdatedAt?: number;
}
