// === CONFIGURAÇÃO FIREBASE ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc, 
    query, 
    orderBy, 
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBtmmi8NLvJswGLzGNs-NdIYwqqizBDWaI",
    authDomain: "gestao-de-confeitaria.firebaseapp.com",
    projectId: "gestao-de-confeitaria",
    storageBucket: "gestao-de-confeitaria.firebasestorage.app",
    messagingSenderId: "361729178674",
    appId: "1:361729178674:web:ecb34f5f4b6f7c9355502b"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === ESTADO GLOBAL ===
let vendas = [];
let produtos = [];
let clientes = [];
let encomendas = [];
let despesas = [];
let cobrancas = [];
let atividades = [];
let configuracoes = {
    metaMensal: 0,
    ultimoBackup: null
};

let editandoId = null;
let charts = {};
let isLoading = false;

// === FUNÇÕES DE FIRESTORE ===
class FirebaseService {
    // Salvar dados no Firestore
    static async salvar(colecao, dados) {
        try {
            const docRef = await addDoc(collection(db, colecao), {
                ...dados,
                criadoEm: new Date(),
                atualizadoEm: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error(`Erro ao salvar em ${colecao}:`, error);
            mostrarAlerta(`Erro ao salvar dados: ${error.message}`, 'danger');
            return null;
        }
    }

    // Atualizar dados no Firestore
    static async atualizar(colecao, id, dados) {
        try {
            await updateDoc(doc(db, colecao, id), {
                ...dados,
                atualizadoEm: new Date()
            });
            return true;
        } catch (error) {
            console.error(`Erro ao atualizar ${colecao}:`, error);
            mostrarAlerta(`Erro ao atualizar dados: ${error.message}`, 'danger');
            return false;
        }
    }

    // Excluir dados do Firestore
    static async excluir(colecao, id) {
        try {
            await deleteDoc(doc(db, colecao, id));
            return true;
        } catch (error) {
            console.error(`Erro ao excluir de ${colecao}:`, error);
            mostrarAlerta(`Erro ao excluir dados: ${error.message}`, 'danger');
            return false;
        }
    }

    // Carregar todos os dados de uma coleção
    static async carregar(colecao) {
        try {
            const querySnapshot = await getDocs(collection(db, colecao));
            const dados = [];
            querySnapshot.forEach((doc) => {
                dados.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return dados;
        } catch (error) {
            console.error(`Erro ao carregar ${colecao}:`, error);
            mostrarAlerta(`Erro ao carregar dados: ${error.message}`, 'danger');
            return [];
        }
    }

    // Carregar um documento específico
    static async carregarPorId(colecao, id) {
        try {
            const docSnap = await getDoc(doc(db, colecao, id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error(`Erro ao carregar documento de ${colecao}:`, error);
            return null;
        }
    }

    // Escutar mudanças em tempo real
    static escutarMudancas(colecao, callback) {
        try {
            return onSnapshot(collection(db, colecao), (snapshot) => {
                const dados = [];
                snapshot.forEach((doc) => {
                    dados.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                callback(dados);
            });
        } catch (error) {
            console.error(`Erro ao escutar mudanças em ${colecao}:`, error);
            return null;
        }
    }
}

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', async () => {
    mostrarLoading(true);
    await inicializarSistema();
    configurarEventListeners();
    await carregarTodosDados();
    renderizarTudo();
    configurarBackupAutomatico();
    mostrarLoading(false);
});

async function inicializarSistema() {
    document.getElementById('data').valueAsDate = new Date();
    document.getElementById('despesaData').valueAsDate = new Date();
    
    // Verificar se há dados no Firestore, se não, adicionar exemplos
    const clientesExistentes = await FirebaseService.carregar('clientes');
    if (clientesExistentes.length === 0) {
        await adicionarDadosExemplo();
    }
}

async function adicionarDadosExemplo() {
    const exemplos = {
        clientes: [
            { nome: 'MARIA SILVA', contato: '(71) 99999-0001', email: '', endereco: '', observacoes: '', ultimaCompra: null, totalGasto: 0 },
            { nome: 'JOÃO SANTOS', contato: '(71) 99999-0002', email: '', endereco: '', observacoes: '', ultimaCompra: null, totalGasto: 0 }
        ],
        produtos: [
            { 
                nome: 'BOLO DE CHOCOLATE', 
                categoria: 'Bolos',
                custoMaterial: 15.00, 
                custoMaoObra: 5.00,
                margem: 100,
                valor: 40.00,
                tempoPreparo: 120
            },
            { 
                nome: 'BRIGADEIRO GOURMET', 
                categoria: 'Doces',
                custoMaterial: 2.50, 
                custoMaoObra: 1.00,
                margem: 150,
                valor: 8.75,
                tempoPreparo: 30
            }
        ]
    };
    
    try {
        for (const cliente of exemplos.clientes) {
            await FirebaseService.salvar('clientes', cliente);
        }
        
        for (const produto of exemplos.produtos) {
            await FirebaseService.salvar('produtos', produto);
        }
        
        mostrarAlerta('Dados de exemplo adicionados!', 'info');
    } catch (error) {
        console.error('Erro ao adicionar dados de exemplo:', error);
    }
}

async function carregarTodosDados() {
    try {
        const [
            clientesData, 
            produtosData, 
            vendasData, 
            encomendasData, 
            despesasData, 
            cobrancasData, 
            atividadesData, 
            configData
        ] = await Promise.all([
            FirebaseService.carregar('clientes'),
            FirebaseService.carregar('produtos'),
            FirebaseService.carregar('vendas'),
            FirebaseService.carregar('encomendas'),
            FirebaseService.carregar('despesas'),
            FirebaseService.carregar('cobrancas'),
            FirebaseService.carregar('atividades'),
            FirebaseService.carregar('configuracoes')
        ]);

        clientes = clientesData || [];
        produtos = produtosData || [];
        vendas = vendasData || [];
        encomendas = encomendasData || [];
        despesas = despesasData || [];
        cobrancas = cobrancasData || [];
        atividades = atividadesData || [];
        
        // Configurações - pegar o primeiro documento ou criar padrão
        if (configData && configData.length > 0) {
            configuracoes = { ...configuracoes, ...configData[0] };
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        mostrarAlerta('Erro ao carregar dados do servidor', 'danger');
    }
}

function mostrarLoading(show) {
    isLoading = show;
    const body = document.body;
    if (show) {
        body.classList.add('loading');
    } else {
        body.classList.remove('loading');
    }
}

function configurarEventListeners() {
    // Formulários
    document.getElementById('vendaForm').addEventListener('submit', adicionarVenda);
    document.getElementById('produtoForm').addEventListener('submit', adicionarOuEditarProduto);
    document.getElementById('clienteForm').addEventListener('submit', adicionarOuEditarCliente);
    document.getElementById('despesaForm').addEventListener('submit', adicionarDespesa);
    document.getElementById('cobrancaForm').addEventListener('submit', gerarMensagemCobranca);
    
    // Campos que afetam cálculos
    document.getElementById('produto').addEventListener('change', preencherValorProduto);
    document.getElementById('produtoCustoMaterial').addEventListener('input', calcularPrecoVenda);
    document.getElementById('produtoCustoMaoObra').addEventListener('input', calcularPrecoVenda);
    document.getElementById('produtoMargem').addEventListener('input', calcularPrecoVenda);
    
    // Filtros e buscas
    document.getElementById('searchVendas').addEventListener('input', renderizarTabelaVendas);
    document.getElementById('searchDespesas').addEventListener('input', renderizarTabelaDespesas);
    document.getElementById('filtroDespesas').addEventListener('change', renderizarTabelaDespesas);
    document.getElementById('filtroVencimento').addEventListener('change', renderizarTabelaPendencias);
    
    // Cobrança
    document.getElementById('clienteCobranca').addEventListener('change', atualizarMensagemCobranca);
    document.getElementById('tipoCobranca').addEventListener('change', atualizarMensagemCobranca);
}

// === LÓGICA DAS ABAS ===
function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));