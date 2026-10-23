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
] as const;
export type CollectionName = (typeof collections)[number];
export type DateValue = Timestamp | Date | string | null;
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
}
export interface Order extends RecordBase {
  clienteNome: string;
  clienteId?: string;
  produtoDescricao: string;
  dataEntrega: string;
  valorTotal: number;
  valorEntrada: number;
  status: "Pendente" | "Em Produção" | "Finalizado";
}
export interface Expense extends RecordBase {
  data: string;
  tipo: string;
  descricao: string;
  quantidade: string;
  valor: number;
}
export interface Activity extends RecordBase {
  tipo: string;
  descricao: string;
  usuarioNome?: string;
}
export interface Charge extends RecordBase {
  clienteNome: string;
  tipo: string;
  data: DateValue;
}
export interface Settings extends RecordBase {
  metaMensal: number;
  ultimoBackup: DateValue;
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
});
export type Entity = DataStore[CollectionName][number];
export interface Mutation {
  collection: CollectionName;
  id?: string;
  data?: Record<string, unknown>;
  remove?: boolean;
  expectedUpdatedAt?: number;
}
