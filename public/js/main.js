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
let anoFiltroSelecionado = new Date().getFullYear(); // Inicializa com ano atual
let mesFiltroSelecionado = new Date().getMonth(); // Inicializa com mês atual
let produtos = [];
let clientes = [];
let encomendas = [];
let despesas = [];
let cobrancas = [];
let atividades = [];
let configuracoes = {
    id: null,
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
}
// main.js (nova função)
function popularFiltrosDeData() {
    const filtroAnoSelect = document.getElementById('filtroAno');
    const filtroMesSelect = document.getElementById('filtroMes');
    
    if (!filtroAnoSelect || !filtroMesSelect) {
        console.warn('Elementos de filtro não encontrados!');
        return;
    }

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0-11

    // Popula os anos
    filtroAnoSelect.innerHTML = '';
    for (let ano = anoAtual + 1; ano >= anoAtual - 3; ano--) {
        const selected = ano === anoAtual ? 'selected' : '';
        filtroAnoSelect.innerHTML += `<option value="${ano}" ${selected}>${ano}</option>`;
    }

    // Popula os meses
    const nomesDosMeses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", 
                          "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    filtroMesSelect.innerHTML = '';
    nomesDosMeses.forEach((nome, index) => {
        const selected = index === mesAtual ? 'selected' : '';
        filtroMesSelect.innerHTML += `<option value="${index}" ${selected}>${nome}</option>`;
    });

    // CORREÇÃO CRÍTICA: Sincroniza as variáveis com os valores selecionados
    anoFiltroSelecionado = parseInt(filtroAnoSelect.value);
    mesFiltroSelecionado = parseInt(filtroMesSelect.value);

    console.log('Filtros inicializados - Ano:', anoFiltroSelecionado, 'Mês:', mesFiltroSelecionado);
}
function debugFiltros() {
    console.log('=== DEBUG DETALHADO DOS FILTROS ===');
    console.log('Filtros atuais:', {
        ano: anoFiltroSelecionado,
        mes: mesFiltroSelecionado,
        mesNome: ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"][mesFiltroSelecionado]
    });
    
    console.log('Total de dados carregados:', {
        vendas: vendas.length,
        encomendas: encomendas.length,
        despesas: despesas.length
    });
    
    // Analisa algumas vendas em detalhes
    console.log('\n--- ANÁLISE DAS VENDAS ---');
    vendas.slice(0, 5).forEach((venda, i) => {
        const dataExtraida = extrairDataDoItem(venda);
        const passaNoFiltro = dataExtraida && 
                             dataExtraida.ano === anoFiltroSelecionado && 
                             dataExtraida.mes === mesFiltroSelecionado;
        
        console.log(`Venda ${i+1}:`, {
            dataOriginal: venda.data,
            dataExtraida: dataExtraida,
            passaNoFiltro: passaNoFiltro,
            produto: venda.produto,
            valor: venda.valor
        });
    });
    
    // Testa o filtro atual
    const filtroAtual = criarFiltroData(anoFiltroSelecionado, mesFiltroSelecionado);
    const vendasFiltradas = vendas.filter(filtroAtual);
    
    console.log('\n--- RESULTADO DO FILTRO ---');
    console.log('Vendas que passaram no filtro:', vendasFiltradas.length);
    
    if (vendasFiltradas.length > 0) {
        console.log('Exemplos de vendas filtradas:');
        vendasFiltradas.slice(0, 3).forEach((v, i) => {
            console.log(`  ${i+1}. ${v.produto} - ${v.data} - ${formatarMoeda(v.valor)}`);
        });
    } else {
        console.log('❌ Nenhuma venda passou no filtro!');
        
        // Mostra vendas de outros meses para comparação
        const outrasVendas = vendas.filter(v => {
            const data = extrairDataDoItem(v);
            return data && data.ano === anoFiltroSelecionado; // Mesmo ano, qualquer mês
        });
        
        console.log(`Vendas do ano ${anoFiltroSelecionado} em outros meses:`, outrasVendas.length);
        outrasVendas.slice(0, 3).forEach((v, i) => {
            const data = extrairDataDoItem(v);
            const nomeMes = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"][data.mes];
            console.log(`  ${i+1}. ${v.produto} - ${nomeMes} - ${v.data}`);
        });
    }
    
    console.log('=== FIM DO DEBUG ===');
}


// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', async () => {
    mostrarLoading(true);
    popularFiltrosDeData();
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
    const produtosExistentes = await FirebaseService.carregar('produtos');
    if (produtosExistentes.length === 0) {
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
        
        if (configData && configData.length > 0) {
            configuracoes = { ...configuracoes, ...configData[0] };
        } else {
            // Se não existe, cria um documento de configuração padrão
            const newConfigId = await FirebaseService.salvar('configuracoes', { metaMensal: 0, ultimoBackup: null });
            if (newConfigId) {
                configuracoes.id = newConfigId;
            }
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

// main.js

// SUBSTITUA SUA FUNÇÃO ANTIGA POR ESTA VERSÃO COMPLETA E CORRIGIDA
function configurarEventListeners() {
    // Função auxiliar para evitar repetição
    const safeAddEventListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Elemento com id '${id}' não foi encontrado.`);
        }
    };

    // --- Formulários ---
    safeAddEventListener('vendaForm', 'submit', adicionarVenda);
    safeAddEventListener('produtoForm', 'submit', adicionarOuEditarProduto);
    safeAddEventListener('clienteForm', 'submit', adicionarOuEditarCliente);
    safeAddEventListener('despesaForm', 'submit', adicionarDespesa);
    safeAddEventListener('cobrancaForm', 'submit', (e) => {
        e.preventDefault();
        atualizarMensagemCobranca();
    });
    
    // --- Campos que afetam cálculos ---
    safeAddEventListener('produto', 'change', preencherValorProduto);
    safeAddEventListener('quantidade', 'input', atualizarTotalVenda);
    safeAddEventListener('produtoCustoMaterial', 'input', calcularPrecoVenda);
    safeAddEventListener('produtoCustoMaoObra', 'input', calcularPrecoVenda);
    safeAddEventListener('produtoMargem', 'input', calcularPrecoVenda);
    safeAddEventListener('produtoValor', 'input', calcularMargemLucro);

    // --- Checkbox de Precificação ---
    safeAddEventListener('definirPrecoManual', 'change', alternarModoPrecificacao);
    
    // --- Filtros e buscas ---
    safeAddEventListener('searchVendas', 'input', renderizarTabelaVendas);
    safeAddEventListener('searchDespesas', 'input', renderizarTabelaDespesas);
    safeAddEventListener('filtroDespesas', 'change', renderizarTabelaDespesas);
    safeAddEventListener('filtroVencimento', 'change', renderizarTabelaPendencias);
    
    // --- Cobrança ---
    safeAddEventListener('clienteCobranca', 'change', atualizarMensagemCobranca);
    safeAddEventListener('tipoCobranca', 'change', atualizarMensagemCobranca);
    // --- Listeners dos Filtros de Data (CORREÇÃO AQUI) ---
const filtroAno = document.getElementById('filtroAno');
    const filtroMes = document.getElementById('filtroMes');

    if (filtroAno) {
        filtroAno.addEventListener('change', (e) => {
            anoFiltroSelecionado = parseInt(e.target.value);
            console.log('Ano alterado para:', anoFiltroSelecionado);
            renderizarTudo();
        });
    }

    if (filtroMes) {
        filtroMes.addEventListener('change', (e) => {
            mesFiltroSelecionado = parseInt(e.target.value);
            console.log('Mês alterado para:', mesFiltroSelecionado, 
                       `(${["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"][mesFiltroSelecionado]})`);
            renderizarTudo();
        });
    }
}

// === LÓGICA DAS ABAS ===
function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
    
    // Renderizar gráficos específicos da aba
    setTimeout(() => {
        if (tabName === 'dashboard') {
            renderizarGrafico();
        } else if (tabName === 'financeiro') {
            renderizarGraficoFluxoCaixa();
        }
    }, 100);
}

// === RENDERIZAÇÃO GERAL ===
function renderizarTudo() {
    preencherSelects();
    renderizarTabelaVendas();
    renderizarTabelaClientes();
    renderizarTabelaProdutos();
    renderizarTabelaEncomendas();
    renderizarTabelaDespesas();
    renderizarTabelaPendencias();
    renderizarTimeline();
    atualizarDashboardPrincipal();
    renderizarGrafico();
    atualizarResumoFinanceiro(); 
}

function preencherSelects() {
    const clienteSelects = document.querySelectorAll('#pessoa, #clienteCobranca, #modalEncomendaCliente');
    const produtoSelect = document.getElementById('produto');

    const clientesOptions = clientes.sort((a,b) => a.nome.localeCompare(b.nome)).map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    const produtosOptions = produtos.sort((a,b) => a.nome.localeCompare(b.nome)).map(p => `<option value="${p.nome}">${p.nome}</option>`).join('');
    
    clienteSelects.forEach(select => {
        if (select) {
            const currentValue = select.value;
            select.innerHTML = `<option value="">Selecione...</option>${clientesOptions}`;
            if (currentValue && clientes.some(c => c.nome === currentValue)) {
                select.value = currentValue;
            }
        }
    });

    if (produtoSelect) {
        const currentValue = produtoSelect.value;
        produtoSelect.innerHTML = `<option value="">Selecione...</option>${produtosOptions}`;
        if (currentValue && produtos.some(p => p.nome === currentValue)) {
            produtoSelect.value = currentValue;
        }
    }
}


// === LÓGICA DE CLIENTES (CRM) ===
async function adicionarOuEditarCliente(e) {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('clienteNome').value.trim().toUpperCase(),
        contato: document.getElementById('clienteContato').value.trim(),
        email: document.getElementById('clienteEmail').value.trim().toLowerCase(),
        endereco: document.getElementById('clienteEndereco').value.trim(),
        observacoes: document.getElementById('clienteObservacoes').value.trim()
    };

    if (!dados.nome) {
        mostrarAlerta('Nome do cliente é obrigatório', 'danger');
        return;
    }

    mostrarLoading(true);
    if (editandoId) {
        const success = await FirebaseService.atualizar('clientes', editandoId, dados);
        if (success) mostrarAlerta('Cliente atualizado com sucesso!', 'success');
        document.querySelector('#clienteForm button').textContent = '➕ Salvar Cliente';
    } else {
    if (clientes.some(c => c.nome === dados.nome)) {
        mostrarAlerta('Cliente com este nome já cadastrado', 'danger');
        mostrarLoading(false);
        return;
    }
    const newId = await FirebaseService.salvar('clientes', { ...dados, totalGasto: 0, ultimaCompra: null });

    // <-- ADICIONE ESTA LINHA AQUI
    if (newId) await FirebaseService.salvar('atividades', { tipo: 'cliente', descricao: `Novo cliente cadastrado: ${dados.nome}` });

    if (newId) mostrarAlerta('Cliente cadastrado com sucesso!', 'success');
}
    
    editandoId = null;
    document.getElementById('clienteForm').reset();
    await carregarTodosDados();
    renderizarTudo();
    mostrarLoading(false);
}

function editarCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (cliente) {
        editandoId = id;
        document.getElementById('clienteNome').value = cliente.nome;
        document.getElementById('clienteContato').value = cliente.contato || '';
        document.getElementById('clienteEmail').value = cliente.email || '';
        document.getElementById('clienteEndereco').value = cliente.endereco || '';
        document.getElementById('clienteObservacoes').value = cliente.observacoes || '';
        document.querySelector('#clienteForm button').textContent = '💾 Salvar Alterações';
        document.querySelector('button[onclick*="cadastros"]').click();
        document.getElementById('clienteNome').focus();
        mostrarAlerta('Modo de edição ativado', 'info');
    }
}

function excluirCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    
    showConfirm(`Tem certeza que deseja excluir ${cliente.nome}? A exclusão não pode ser desfeita.`, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            const success = await FirebaseService.excluir('clientes', id);
            if (success) {
                mostrarAlerta('Cliente excluído com sucesso', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}

async function atualizarDadosCliente(nomeCliente, valorCompra) {
    const cliente = clientes.find(c => c.nome === nomeCliente);
    if (cliente) {
        const novosDados = {
            ultimaCompra: new Date().toISOString().split('T')[0],
            totalGasto: (cliente.totalGasto || 0) + valorCompra
        };
        await FirebaseService.atualizar('clientes', cliente.id, novosDados);
    }
}


function renderizarTabelaClientes() {
    const tbody = document.getElementById('clientesTableBody');
    tbody.innerHTML = clientes.map(c => {
        const ultimaCompra = c.ultimaCompra ? formatarData(c.ultimaCompra) : 'Nunca';
        const totalGasto = c.totalGasto || 0;
        
        return `
            <tr>
                <td><strong>${c.nome}</strong></td>
                <td>${c.contato || 'N/A'}</td>
                <td>${ultimaCompra}</td>
                <td><strong>${formatarMoeda(totalGasto)}</strong></td>
                <td class="actions">
                    <button class="btn btn-primary btn-sm" onclick="editarCliente('${c.id}')" title="Editar">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="excluirCliente('${c.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}


// === LÓGICA DE PRODUTOS ===
function calcularPrecoVenda() {
    // Esta verificação é para a nova funcionalidade que vamos implementar depois.
    // Por enquanto, ela garante que o cálculo automático sempre funcione.
    if (document.getElementById('definirPrecoManual') && document.getElementById('definirPrecoManual').checked) {
        return; // Se o modo manual estiver ativo, não faz nada
    }

    const custoMaterial = parseFloat(document.getElementById('produtoCustoMaterial').value) || 0;
    const custoMaoObra = parseFloat(document.getElementById('produtoCustoMaoObra').value) || 0;
    const margem = parseFloat(document.getElementById('produtoMargem').value) || 0;

    const custoTotal = custoMaterial + custoMaoObra;

    // A fórmula correta:
    const precoVenda = custoTotal * (1 + margem / 100);

    // Atualiza o campo do preço final, formatando com 2 casas decimais.
    document.getElementById('produtoValor').value = precoVenda.toFixed(2);
}

async function adicionarOuEditarProduto(e) {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('produtoNome').value.trim().toUpperCase(),
        categoria: document.getElementById('produtoCategoria').value,
        custoMaterial: parseFloat(document.getElementById('produtoCustoMaterial').value) || 0,
        custoMaoObra: parseFloat(document.getElementById('produtoCustoMaoObra').value) || 0,
        margem: parseFloat(document.getElementById('produtoMargem').value) || 100,
        valor: parseFloat(document.getElementById('produtoValor').value) || 0,
        tempoPreparo: parseInt(document.getElementById('produtoTempoPreparo').value) || 0
    };

    if (!dados.nome || dados.valor <= 0) {
        mostrarAlerta('Nome do produto e preço final são obrigatórios.', 'danger');
        return;
    }

    mostrarLoading(true);
    if (editandoId) {
        const success = await FirebaseService.atualizar('produtos', editandoId, dados);
        if (success) mostrarAlerta('Produto atualizado com sucesso!', 'success');
        document.querySelector('#produtoForm button').textContent = '➕ Salvar Produto';
    } else {
        if (produtos.some(p => p.nome === dados.nome)) {
            mostrarAlerta('Produto com este nome já cadastrado.', 'danger');
            mostrarLoading(false);
            return;
        }
        const newId = await FirebaseService.salvar('produtos', dados);
        if (newId) mostrarAlerta('Produto cadastrado com sucesso!', 'success');
    }

    editandoId = null;
    document.getElementById('produtoForm').reset();
    document.getElementById('produtoMargem').value = 100;
    await carregarTodosDados();
    renderizarTudo();
    mostrarLoading(false);
}

function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (produto) {
        editandoId = id;
        document.getElementById('produtoNome').value = produto.nome;
        document.getElementById('produtoCategoria').value = produto.categoria;
        document.getElementById('produtoCustoMaterial').value = produto.custoMaterial;
        document.getElementById('produtoCustoMaoObra').value = produto.custoMaoObra;
        document.getElementById('produtoMargem').value = produto.margem;
        document.getElementById('produtoTempoPreparo').value = produto.tempoPreparo;
        calcularPrecoVenda(); // Recalcula e preenche o preço final
        document.querySelector('#produtoForm button').textContent = '💾 Salvar Alterações';
        document.querySelector('button[onclick*="cadastros"]').click();
        document.getElementById('produtoNome').focus();
        mostrarAlerta('Modo de edição ativado', 'info');
    }
}

function excluirProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    
    showConfirm(`Tem certeza que deseja excluir o produto ${produto.nome}?`, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            const success = await FirebaseService.excluir('produtos', id);
            if (success) {
                mostrarAlerta('Produto excluído com sucesso!', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}

function renderizarTabelaProdutos() {
    const tbody = document.getElementById('produtosTableBody');
    tbody.innerHTML = produtos.map(p => {
        const custoTotal = (p.custoMaterial || 0) + (p.custoMaoObra || 0);
        const margemReal = custoTotal > 0 ? ((p.valor - custoTotal) / custoTotal * 100) : 0;
        
        return `
            <tr>
                <td><strong>${p.nome}</strong></td>
                <td>${p.categoria}</td>
                <td>${formatarMoeda(custoTotal)}</td>
                <td><strong>${formatarMoeda(p.valor)}</strong></td>
                <td>
                    <span class="badge ${margemReal >= 100 ? 'badge-success' : margemReal >= 50 ? 'badge-warning' : 'badge-danger'}">
                        ${margemReal.toFixed(1)}%
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-primary btn-sm" onclick="editarProduto('${p.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="excluirProduto('${p.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}


// === LÓGICA DE VENDAS ===
function preencherValorProduto() {
    const produtoNome = document.getElementById('produto').value;
    const produto = produtos.find(p => p.nome === produtoNome);
    document.getElementById('valor').value = produto ? produto.valor.toFixed(2) : '';
    atualizarTotalVenda(); // Adiciona a chamada para atualizar o total
}

async function adicionarVenda(e) {
    e.preventDefault();
    const venda = {
        data: document.getElementById('data').value,
        pessoa: document.getElementById('pessoa').value,
        produto: document.getElementById('produto').value,
        quantidade: parseInt(document.getElementById('quantidade').value),
        valor: parseFloat(document.getElementById('valor').value),
        pagamento: document.getElementById('pagamento').value,
        status: document.getElementById('status').value
    };

    // --- VALIDAÇÃO MELHORADA ---
    if (!venda.pessoa) {
        return mostrarAlerta('Selecione um cliente para a venda.', 'warning');
    }
    if (!venda.produto) {
        return mostrarAlerta('Selecione um produto para a venda.', 'warning');
    }
    if (isNaN(venda.valor) || venda.valor <= 0) {
        return mostrarAlerta('O valor do produto é inválido. Verifique o cadastro do produto.', 'danger');
    }
    // --- FIM DA VALIDAÇÃO ---

    mostrarLoading(true);
    const newId = await FirebaseService.salvar('vendas', venda);
    if (newId) {
        await atualizarDadosCliente(venda.pessoa, venda.valor * venda.quantidade);
        await FirebaseService.salvar('atividades', { tipo: 'venda', descricao: `Venda registrada: ${venda.quantidade}x ${venda.produto} para ${venda.pessoa}` });
        
        mostrarAlerta('Venda registrada com sucesso!', 'success');
        document.getElementById('vendaForm').reset();
        document.getElementById('data').valueAsDate = new Date();
        await carregarTodosDados();
        renderizarTudo();
    }
    mostrarLoading(false);
}

// ADICIONE ESTA FUNÇÃO COMPLETA NO SEU CÓDIGO
function atualizarResumoFinanceiro() {
    // 1. Calcular Receita Bruta (Total de todas as vendas, independente do status)
    const receitaBruta = vendas.reduce((acc, v) => acc + (v.valor * v.quantidade), 0);

    // 2. Calcular Custo de Produção (Custo dos produtos que foram vendidos)
    const custoProducao = vendas.reduce((acc, venda) => {
        const produtoVendido = produtos.find(p => p.nome === venda.produto);
        if (produtoVendido) {
            const custoTotalProduto = (produtoVendido.custoMaterial || 0) + (produtoVendido.custoMaoObra || 0);
            return acc + (custoTotalProduto * venda.quantidade);
        }
        return acc;
    }, 0);

    // 3. Calcular Despesas Operacionais (Total de todas as despesas cadastradas)
    const despesasOperacionais = despesas.reduce((acc, d) => acc + d.valor, 0);

    // 4. Calcular Lucro Bruto e Margem de Lucro
    const lucroBruto = receitaBruta - custoProducao - despesasOperacionais;
    const margemLucro = receitaBruta > 0 ? (lucroBruto / receitaBruta * 100) : 0;

    // 5. Atualizar o HTML com os valores calculados
    document.getElementById('receitaBruta').textContent = formatarMoeda(receitaBruta);
    document.getElementById('custoProducao').textContent = formatarMoeda(custoProducao);
    document.getElementById('despesasOperacionais').textContent = formatarMoeda(despesasOperacionais);
    document.getElementById('margemLucro').textContent = `${margemLucro.toFixed(1)}%`;
}

function excluirVenda(id) {
    showConfirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.', async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            // Primeiro, precisamos pegar os dados da venda ANTES de excluir
            const vendaParaExcluir = vendas.find(v => v.id === id);

            if (vendaParaExcluir) {
                // Agora excluímos a venda
                const success = await FirebaseService.excluir('vendas', id);

                // Se a exclusão no banco de dados funcionou...
                if (success) {
                    // ...procuramos o cliente pelo nome que estava na venda
                    const cliente = clientes.find(c => c.nome === vendaParaExcluir.pessoa);

                    if (cliente) {
                        // Calculamos o valor total da venda que foi excluída
                        const valorVenda = vendaParaExcluir.valor * vendaParaExcluir.quantidade;
                        // Subtraímos esse valor do totalGasto do cliente
                        const novoTotalGasto = (cliente.totalGasto || 0) - valorVenda;

                        // Atualizamos o cliente no banco de dados com o novo total
                        await FirebaseService.atualizar('clientes', cliente.id, { totalGasto: novoTotalGasto });
                    }
                    mostrarAlerta('Venda excluída com sucesso!', 'success');
                }
            } else {
                mostrarAlerta('Erro: Venda não encontrada para exclusão.', 'danger');
            }

            // Recarregamos todos os dados para a tela refletir a mudança
            await carregarTodosDados();
            renderizarTudo();
            mostrarLoading(false);
        }
    });
}
function calcularMargemLucro() {
    const precoFinal = parseFloat(document.getElementById('produtoValor').value) || 0;
    const custoMaterial = parseFloat(document.getElementById('produtoCustoMaterial').value) || 0;
    const custoMaoObra = parseFloat(document.getElementById('produtoCustoMaoObra').value) || 0;
    const custoTotal = custoMaterial + custoMaoObra;

    if (custoTotal > 0 && precoFinal > custoTotal) {
        const margem = ((precoFinal / custoTotal) - 1) * 100;
        document.getElementById('produtoMargem').value = margem.toFixed(2);
    } else {
        document.getElementById('produtoMargem').value = 0;
    }
}
function alternarModoPrecificacao() {
    const modoManual = document.getElementById('definirPrecoManual').checked;
    const campoMargem = document.getElementById('produtoMargem');
    const campoValor = document.getElementById('produtoValor');

    if (modoManual) {
        campoValor.readOnly = false;
        campoValor.style.background = '#fff3e0'; // Cor de alerta/atenção
        campoMargem.readOnly = true;
        campoMargem.style.background = '#f8f9fa'; // Cor de desabilitado
    } else {
        campoValor.readOnly = true;
        campoValor.style.background = '#e8f5e8'; // Cor de sucesso/automático
        campoMargem.readOnly = false;
        campoMargem.style.background = '#fff'; // Cor padrão
        calcularPrecoVenda(); // Recalcula o preço com base na margem
    }
}
function atualizarTotalVenda() {
    const quantidade = parseInt(document.getElementById('quantidade').value) || 0;
    const valorUnitario = parseFloat(document.getElementById('valor').value) || 0;
    const total = quantidade * valorUnitario;
    document.getElementById('vendaTotalDisplay').textContent = formatarMoeda(total);
}

function renderizarTabelaPendencias() {
    const tbody = document.getElementById('pendenciasTableBody');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera a hora para comparações de data

    // Usa a função que pega TODAS as pendências
    const pendenciasGerais = [];

    // Pega pendências de Vendas (todas em aberto)
    vendas.filter(v => v.status === 'P').forEach(v => {
        pendenciasGerais.push({
            nome: v.pessoa,
            valor: v.valor * v.quantidade,
            dataVencimento: new Date(v.data)
        });
    });

    // Pega pendências de Encomendas (todas em aberto)
    encomendas
        .filter(e => e.status !== 'Finalizado' && (e.valorTotal - (e.valorEntrada || 0)) > 0)
        .forEach(e => {
            pendenciasGerais.push({
                nome: e.clienteNome,
                valor: e.valorTotal - (e.valorEntrada || 0),
                dataVencimento: new Date(e.dataEntrega) // Usa data de entrega como vencimento
            });
        });

    // Renderiza a tabela
    tbody.innerHTML = pendenciasGerais.map(item => {
        const dataVencimento = new Date(item.dataVencimento);
        dataVencimento.setHours(0,0,0,0);
        const diasEmAtraso = Math.floor((hoje - dataVencimento) / (1000 * 60 * 60 * 24));
        
        let statusAtraso = '';
        if (diasEmAtraso > 0) {
            statusAtraso = `<span class="badge badge-danger">${diasEmAtraso} dias atrasado</span>`;
        } else {
            statusAtraso = `<span class="badge badge-info">Vence em ${-diasEmAtraso} dias</span>`;
        }
        if (diasEmAtraso === 0) {
            statusAtraso = `<span class="badge badge-warning">Vence Hoje</span>`;
        }

        return `
            <tr>
                <td><strong>${item.nome}</strong></td>
                <td><strong style="color: var(--danger-color);">${formatarMoeda(item.valor)}</strong></td>
                <td>${statusAtraso}</td>
                <td>-</td>
                <td>-</td>
                <td class="actions">
                    <button class="btn btn-success btn-sm" onclick="marcarPendenciasComoPagas('${item.nome}')" title="Marcar como Pago">✅ Paga</button>
                </td>
            </tr>
        `;
    }).join('');
}


async function editarStatusVenda(id) {
    const venda = vendas.find(v => v.id === id);
    if (!venda) return;
    
    const novoStatus = prompt(`Status atual: ${venda.status}\n\nDigite o novo status:\nP - Pendente\nA - Pago\nE - Entregue`, venda.status);
    
    if (novoStatus && ['P', 'A', 'E'].includes(novoStatus.toUpperCase())) {
        mostrarLoading(true);
        await FirebaseService.atualizar('vendas', id, { status: novoStatus.toUpperCase() });
        mostrarAlerta('Status da venda atualizado!', 'success');
        await carregarTodosDados();
        renderizarTudo();
        mostrarLoading(false);
    }
}
function renderizarTabelaEncomendas() {
    const tbody = document.getElementById('encomendasTableBody');
    if (!tbody) return;

    const encomendasOrdenadas = [...encomendas].sort((a, b) => new Date(a.dataEntrega || 0) - new Date(b.dataEntrega || 0));

    tbody.innerHTML = encomendasOrdenadas.map(enc => {
        const valorTotal = enc.valorTotal || 0;
        const valorEntrada = enc.valorEntrada || 0;
        const valorRestante = valorTotal - valorEntrada;
        const status = enc.status || 'Pendente';
        let statusClass = 'badge-secondary';
        if (status === 'Pendente') statusClass = 'badge-warning';
        if (status === 'Finalizado') statusClass = 'badge-success';
        if (status === 'Em Produção') statusClass = 'badge-info';

        const statusBadge = `<span class="badge ${statusClass}">${status}</span>`;

        return `
            <tr>
                <td>${formatarData(enc.dataEntrega)}</td>
                <td>${enc.clienteNome || ''}</td>
                <td>${enc.produtoDescricao || ''}</td>
                <td>${formatarMoeda(valorTotal)}</td>
                <td>${formatarMoeda(valorEntrada)}</td>
                <td><strong>${formatarMoeda(valorRestante)}</strong></td>
                <td>${statusBadge}</td>
                <td class="actions">
                    <button class="btn btn-primary btn-sm" onclick="editarEncomenda('${enc.id}')" title="Editar">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="excluirEncomenda('${enc.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}


// === LÓGICA DE DESPESAS ===
async function adicionarDespesa(e) {
    e.preventDefault();

    // Lê os valores dos campos do formulário
    const data = document.getElementById('despesaData').value;
    const tipo = document.getElementById('despesaTipo').value;
    const descricao = document.getElementById('despesaDescricao').value;
    // Converte a quantidade para número, se estiver vazio, considera como 1
    const quantidade = parseFloat(document.getElementById('despesaQuantidade').value) || 1;
    const valorUnitario = parseFloat(document.getElementById('despesaValor').value) || 0;

    // --- A LÓGICA DA CORREÇÃO ESTÁ AQUI ---
    // Multiplica a quantidade pelo valor unitário para obter o valor total da despesa
    const valorTotalDespesa = quantidade * valorUnitario;

    // Monta o objeto da despesa com o valor total calculado
    const despesa = {
        data: data,
        tipo: tipo,
        descricao: descricao,
        quantidade: quantidade, // Mantemos a quantidade para referência
        valor: valorTotalDespesa // O valor salvo agora é o total
    };

    if (!despesa.data || !despesa.tipo || !despesa.descricao || isNaN(despesa.valor)) {
        mostrarAlerta('Preencha todos os campos obrigatórios da despesa', 'danger');
        return;
    }

    mostrarLoading(true);
    const newId = await FirebaseService.salvar('despesas', despesa);
    if (newId) {
        await FirebaseService.salvar('atividades', { tipo: 'despesa', descricao: `Despesa: ${despesa.descricao} - ${formatarMoeda(despesa.valor)}`});
        mostrarAlerta('Despesa registrada com sucesso!', 'success');
        document.getElementById('despesaForm').reset();
        document.getElementById('despesaData').valueAsDate = new Date();
        await carregarTodosDados();
        renderizarTudo();
    }
    mostrarLoading(false);
}

function excluirDespesa(id) {
    showConfirm('Tem certeza que deseja excluir esta despesa?', async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            const success = await FirebaseService.excluir('despesas', id);
            if (success) {
                mostrarAlerta('Despesa excluída!', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}

function renderizarTabelaDespesas() {
    const tbody = document.getElementById('despesasTableBody');
    const search = document.getElementById('searchDespesas').value.toLowerCase();
    const filtroTipo = document.getElementById('filtroDespesas').value;

    let despesasFiltradas = despesas.filter(d => {
        const matchSearch = d.descricao.toLowerCase().includes(search);
        const matchTipo = !filtroTipo || d.tipo === filtroTipo;
        return matchSearch && matchTipo;
    });

    despesasFiltradas.sort((a, b) => new Date(b.data) - new Date(a.data));

    tbody.innerHTML = despesasFiltradas.map(d => `
        <tr>
            <td>${formatarData(d.data)}</td>
            <td><span class="badge badge-info">${d.tipo}</span></td>
            <td>${d.descricao}</td>
            <td>${d.quantidade || '-'}</td>
            <td><strong>${formatarMoeda(d.valor)}</strong></td>
            <td class="actions">
                <button class="btn btn-danger btn-sm" onclick="excluirDespesa('${d.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}


// === LÓGICA DE COBRANÇAS ===
async function gerarMensagemCobranca(e) {
    e.preventDefault();
    const clienteNome = document.getElementById('clienteCobranca').value;
    if (!clienteNome) {
        mostrarAlerta('Selecione um cliente para gerar a mensagem', 'warning');
        return;
    }
    await FirebaseService.salvar('cobrancas', {
        clienteNome: clienteNome,
        tipo: document.getElementById('tipoCobranca').value,
        data: new Date()
    });
    mostrarAlerta('Cobrança registrada! Copie a mensagem para enviar.', 'info');
    await carregarTodosDados(); // Recarrega para atualizar a lista de pendências
    renderizarTabelaPendencias();
}

function atualizarMensagemCobranca() {
    const clienteNome = document.getElementById('clienteCobranca').value;
    const tipo = document.getElementById('tipoCobranca').value;
    const msgTextarea = document.getElementById('mensagemCobranca');

    if (!clienteNome) {
        msgTextarea.value = '';
        return;
    }

    const pendencias = calcularPendenciasCliente(clienteNome);
    if (pendencias.valor <= 0) {
        msgTextarea.value = `O cliente ${clienteNome} não possui pendências.`;
        return;
    }

    const mensagens = {
        amigavel: `Olá ${clienteNome}! 😊 Tudo bem? Passando para lembrar sobre o valor de ${formatarMoeda(pendencias.valor)} que ficou pendente. Quando puder, me avisa como fica melhor pra você acertar. Obrigado!`,
        lembrete: `Oi, ${clienteNome}! Só um lembrete sobre nossa pendência de ${formatarMoeda(pendencias.valor)}. Podemos combinar o pagamento? Agradeço a atenção!`,
        urgente: `Olá, ${clienteNome}. Preciso de um retorno sobre o pagamento pendente de ${formatarMoeda(pendencias.valor)}. Por favor, entre em contato para regularizarmos a situação. Grato.`
    };

    msgTextarea.value = mensagens[tipo];
}

function calcularPendenciasCliente(clienteNome) {
    const valorVendas = vendas
        .filter(v => v.pessoa === clienteNome && v.status === 'P')
        .reduce((sum, v) => sum + (v.valor * v.quantidade), 0);
    
    // A lógica para pendências de encomendas pode ser adicionada aqui se necessário
    
    return { valor: valorVendas };
}


async function marcarTodosComoContatados() {
    showConfirm('Deseja registrar um contato de cobrança para TODOS os clientes com pendências?', async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);

            // 1. Encontra a lista de nomes de clientes únicos com vendas pendentes
            const clientesPendentes = new Set(
                vendas.filter(v => v.status === 'P').map(v => v.pessoa)
            );

            // 2. Se não houver clientes, exibe uma mensagem e para.
            if (clientesPendentes.size === 0) {
                mostrarAlerta('Nenhum cliente com pendências encontrado.', 'info');
                mostrarLoading(false);
                return;
            }

            const hoje = new Date();
            const promessasDeSalvamento = [];

            // 3. Cria uma promessa de salvamento para cada cliente pendente
            clientesPendentes.forEach(nomeCliente => {
                const novoContato = {
                    clienteNome: nomeCliente,
                    data: hoje,
                    tipo: 'Lembrete em massa' // Define um tipo para o contato
                };
                promessasDeSalvamento.push(FirebaseService.salvar('cobrancas', novoContato));
            });

            // 4. Espera todas as promessas serem concluídas
            await Promise.all(promessasDeSalvamento);

            mostrarAlerta(`${clientesPendentes.size} cliente(s) foram marcados como contatados!`, 'success');
            await carregarTodosDados();
            renderizarTudo();
            mostrarLoading(false);
        }
    });
}
async function marcarPendenciasComoPagas(clienteNome) {
    showConfirm(`Deseja marcar todas as pendências de ${clienteNome} como pagas? Isso quitará as vendas e finalizará as encomendas.`, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);

            // 1. Encontra e prepara a baixa das VENDAS pendentes (esta parte já estava correta)
            const pendenciasVendas = vendas.filter(v => v.pessoa === clienteNome && v.status === 'P');
            const updatesVendas = pendenciasVendas.map(venda => 
                FirebaseService.atualizar('vendas', venda.id, { status: 'A' })
            );

            // 2. Encontra e prepara a baixa das ENCOMENDAS pendentes (A CORREÇÃO ESTÁ AQUI)
            const pendenciasEncomendas = encomendas.filter(e => e.clienteNome === clienteNome && e.status !== 'Finalizado');
            const updatesEncomendas = pendenciasEncomendas.map(encomenda => 
                // Além de finalizar, agora também atualizamos o valor de entrada para o valor total.
                FirebaseService.atualizar('encomendas', encomenda.id, { 
                    status: 'Finalizado',
                    valorEntrada: encomenda.valorTotal // <-- ESTA É A LINHA DA CORREÇÃO
                })
            );

            // 3. Junta todas as atualizações e executa de uma vez
            const todasAsAtualizacoes = [...updatesVendas, ...updatesEncomendas];
            
            if (todasAsAtualizacoes.length === 0) {
                mostrarAlerta(`Nenhuma pendência encontrada para ${clienteNome}.`, 'info');
                mostrarLoading(false);
                return;
            }

            await Promise.all(todasAsAtualizacoes);
            
            // Mensagem de sucesso corrigida (usando crases)
            mostrarAlerta(`Pendências de ${clienteNome} marcadas como pagas!`, 'success');
            
            await carregarTodosDados();
            renderizarTudo();
            mostrarLoading(false);
        }
    });
}

// === DASHBOARDS E GRÁFICOS ===
// (As funções de cálculo e renderização de gráficos do seu código de exemplo podem ser coladas aqui, pois operam sobre as variáveis globais que já foram carregadas do Firebase)

// 3. FUNÇÃO DE DASHBOARD CORRIGIDA
function atualizarDashboardPrincipal() {
    console.log('=== ATUALIZANDO DASHBOARD ===');
    console.log('Filtros ativos:', { ano: anoFiltroSelecionado, mes: mesFiltroSelecionado });
    console.log('Total de vendas carregadas:', vendas.length);
    console.log('Total de encomendas carregadas:', encomendas.length);
    console.log('Total de despesas carregadas:', despesas.length);
    
    // Cria o filtro uma vez e reutiliza
    const filtro = criarFiltroData(anoFiltroSelecionado, mesFiltroSelecionado);
    
    // Aplica o filtro
    const vendasMes = vendas.filter(filtro);
    const encomendasMes = encomendas.filter(filtro);
    const despesasMes = despesas.filter(filtro);
    
    console.log('Após filtro:', {
        vendasMes: vendasMes.length,
        encomendasMes: encomendasMes.length,
        despesasMes: despesasMes.length
    });
    
    // Se não encontrou nada, exibe algumas vendas de exemplo para debug
    if (vendasMes.length === 0 && vendas.length > 0) {
        console.log('⚠️ NENHUMA VENDA FILTRADA - Exemplos das vendas disponíveis:');
        vendas.slice(0, 3).forEach((v, i) => {
            const dataExtraida = extrairDataDoItem(v);
            console.log(`Venda ${i+1}:`, {
                dataOriginal: v.data,
                dataExtraida: dataExtraida,
                produto: v.produto
            });
        });
    }
    
    // Cálculos financeiros
    const totalVendido = vendasMes.reduce((acc, v) => acc + (v.valor * v.quantidade), 0) + 
                        encomendasMes.reduce((acc, e) => acc + (e.valorTotal || 0), 0);
    
    const vendasPagasMes = vendasMes.filter(v => v.status === 'A' || v.status === 'E');
    const totalRecebidoMes = vendasPagasMes.reduce((acc, v) => acc + (v.valor * v.quantidade), 0) + 
                            encomendasMes.reduce((acc, e) => acc + (e.valorEntrada || 0), 0);
    
    const totalDespesas = despesasMes.reduce((acc, d) => acc + d.valor, 0);
    const lucroLiquido = totalRecebidoMes - totalDespesas;
    const margemLucro = totalRecebidoMes > 0 ? (lucroLiquido / totalRecebidoMes * 100) : 0;
    
    // Valores a receber
    const aReceberVendas = vendasMes.filter(v => v.status === 'P').reduce((acc, v) => acc + (v.valor * v.quantidade), 0);
    const aReceberEncomendas = encomendasMes.filter(e => e.status !== 'Finalizado').reduce((acc, e) => acc + ((e.valorTotal || 0) - (e.valorEntrada || 0)), 0);
    const totalAReceber = aReceberVendas + aReceberEncomendas;
    
    // Contagem de clientes com pendências
    const clientesComVendasPendentes = vendasMes.filter(v => v.status === 'P').map(v => v.pessoa);
    const clientesComEncomendasPendentes = encomendasMes.filter(e => e.status !== 'Finalizado' && ((e.valorTotal || 0) - (e.valorEntrada || 0)) > 0).map(e => e.clienteNome);
    const clientesComPendencia = new Set([...clientesComVendasPendentes, ...clientesComEncomendasPendentes]).size;
    
    // Atualiza a interface
    document.getElementById('dashTotalVendido').textContent = formatarMoeda(totalVendido);
    document.getElementById('vendidoChange').textContent = `${vendasMes.length + encomendasMes.length} pedidos no mês`;
    document.getElementById('dashTotalDespesas').textContent = formatarMoeda(totalDespesas);
    document.getElementById('despesasChange').textContent = `${despesasMes.length} lançamentos`;
    document.getElementById('dashLucroLiquido').textContent = formatarMoeda(lucroLiquido);
    document.getElementById('lucroChange').textContent = `Margem: ${margemLucro.toFixed(1)}%`;
    document.getElementById('dashAReceber').textContent = formatarMoeda(totalAReceber);
    document.getElementById('receberCount').textContent = `${clientesComPendencia} cliente(s) pendente(s)`;
    document.getElementById('dashValoresRecebidos').textContent = formatarMoeda(totalRecebidoMes);
    document.getElementById('recebidosChange').textContent = `${vendasPagasMes.length} vendas pagas + ${encomendasMes.length} entradas`;
    document.getElementById('totalPendente').textContent = formatarMoeda(totalAReceber);
    document.getElementById('clientesPendentes').textContent = clientesComPendencia;
    
    // Atualiza badge de cobranças (🔔) usando pendências GERAIS
    const cobrancasBadge = document.getElementById('cobrancas-badge');
    if (cobrancasBadge) {
        const pendenciasGerais = calcularPendenciasGerais();
        if (pendenciasGerais.clientesPendentes > 0) {
            cobrancasBadge.textContent = pendenciasGerais.clientesPendentes;
            cobrancasBadge.style.display = 'inline-flex';
        } else {
            cobrancasBadge.style.display = 'none';
        }
    }
    
    atualizarProgressoMeta();
    
    console.log('=== DASHBOARD ATUALIZADO ===');
}

function renderizarGrafico() { // Renomeada para o singular
    renderizarGraficoVendasMensais();
    renderizarGraficoEvolucaoVendas();
}
function calcularPendenciasGerais() {
    const aReceberVendas = vendas
        .filter(v => v.status === 'P')
        .reduce((acc, v) => acc + (v.valor * v.quantidade), 0);

    const aReceberEncomendas = encomendas
        .filter(e => e.status !== 'Finalizado')
        .reduce((acc, e) => acc + ((e.valorTotal || 0) - (e.valorEntrada || 0)), 0);

    const clientesPendentes = new Set([
        ...vendas.filter(v => v.status === 'P').map(v => v.pessoa),
        ...encomendas.filter(e => e.status !== 'Finalizado' && ((e.valorTotal || 0) - (e.valorEntrada || 0)) > 0).map(e => e.clienteNome)
    ]).size;

    return {
        totalAReceber: aReceberVendas + aReceberEncomendas,
        clientesPendentes
    };
}

function renderizarGraficoVendasMensais() {
    const ctx = document.getElementById('vendasMensaisChart');
    if (!ctx) return;
    
    const ctxContext = ctx.getContext('2d');
    if (charts.vendasMensais) {
        charts.vendasMensais.destroy();
    }

    console.log('Renderizando gráfico para:', { ano: anoFiltroSelecionado, mes: mesFiltroSelecionado });

    // Filtro usando a nova função
    const filtroGrafico = criarFiltroData(anoFiltroSelecionado, mesFiltroSelecionado);
    const vendasDoMesFiltrado = vendas.filter(filtroGrafico);
    
    console.log('Vendas filtradas para gráfico:', vendasDoMesFiltrado.length);

    // Calcula quantos dias tem o mês selecionado
    const fimMes = new Date(anoFiltroSelecionado, mesFiltroSelecionado + 1, 0);
    const diasNoMes = fimMes.getDate();
    const labels = Array.from({ length: diasNoMes }, (_, i) => String(i + 1).padStart(2, '0'));

    const data = labels.map(dia => {
        const diaNum = parseInt(dia);
        return vendasDoMesFiltrado
            .filter(venda => {
                const dataStr = venda.data;
                if (!dataStr) return false;
                const partesData = dataStr.split('-');
                const diaVenda = parseInt(partesData[2]);
                return diaVenda === diaNum;
            })
            .reduce((total, v) => total + (v.valor * v.quantidade), 0);
    });

    charts.vendasMensais = new Chart(ctxContext, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Vendas Diárias',
                data,
                borderColor: 'rgba(106, 27, 154, 1)',
                backgroundColor: 'rgba(106, 27, 154, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { 
                            return 'R$ ' + value.toLocaleString('pt-BR'); 
                        }
                    }
                }
            }
        }
    });
}
function extrairDataDoItem(item) {
    if (!item.data) return null;
    const data = new Date(item.data);
    return {
        ano: data.getFullYear(),
        mes: data.getMonth() // <-- sempre retorna 0-11
    };
}
function criarFiltroData(anoDesejado, mesDesejado) {
    return function(item) {
        const dataExtraida = extrairDataDoItem(item);
        
        if (!dataExtraida) {
            return false; // Ignora itens sem data válida
        }
        
        const resultado = dataExtraida.ano === anoDesejado && dataExtraida.mes === mesDesejado;
        
        // Debug apenas para os primeiros itens
        if (Math.random() < 0.1) { // 10% chance de debug
            console.log('Debug filtro:', {
                item: item.data || item.dataEntrega,
                extraido: dataExtraida,
                desejado: { ano: anoDesejado, mes: mesDesejado },
                resultado: resultado
            });
        }
        
        return resultado;
    };
}

function renderizarGraficoEvolucaoVendas() {
    const ctx = document.getElementById('evolucaoVendasChart');
    if (!ctx) return;
    if (charts.evolucaoVendas) {
        charts.evolucaoVendas.destroy();
    }
    
    const labels = [];
    const dados = [];
    
    // Pega os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
        const dia = new Date();
        dia.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data
        dia.setDate(dia.getDate() - i);
        
        labels.push(dia.toLocaleDateString('pt-BR', { weekday: 'short' }));
        
        // Filtra vendas para o dia específico
        const vendasDoDia = vendas.filter(venda => {
            const dataVenda = new Date(venda.data);
            dataVenda.setHours(0,0,0,0); // Zera a hora para comparar
            // Adiciona a correção de fuso horário
            const dataVendaCorrigida = new Date(dataVenda.getTime() + dataVenda.getTimezoneOffset() * 60000);
            return dataVendaCorrigida.getTime() === dia.getTime();
        });
        
        const totalDoDia = vendasDoDia.reduce((total, v) => total + (v.valor * v.quantidade), 0);
        dados.push(totalDoDia);
    }
    
    charts.evolucaoVendas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendas por Dia',
                data: dados,
                backgroundColor: '#ab47bc',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderizarGraficoFluxoCaixa() {
    const ctx = document.getElementById('fluxoCaixaChart');
    if (!ctx) return;
    if (charts.fluxoCaixa) {
        charts.fluxoCaixa.destroy();
    }
    
    const labels = [];
    const receitasData = [];
    const despesasData = [];
    
    // Agrupa dados dos últimos 6 meses
    for (let i = 5; i >= 0; i--) {
        const dataRef = new Date();
        dataRef.setMonth(dataRef.getMonth() - i);
        const mes = dataRef.getMonth();
        const ano = dataRef.getFullYear();
        
        labels.push(dataRef.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));

        // Filtra e soma receitas do mês
        const receitaMes = vendas
            .filter(v => {
                const dataVenda = new Date(v.data);
                return dataVenda.getMonth() === mes && dataVenda.getFullYear() === ano;
            })
            .reduce((total, v) => total + (v.valor * v.quantidade), 0);
        receitasData.push(receitaMes);

        // Filtra e soma despesas do mês
        const despesaMes = despesas
            .filter(d => {
                const dataDespesa = new Date(d.data);
                return dataDespesa.getMonth() === mes && dataDespesa.getFullYear() === ano;
            })
            .reduce((total, d) => total + d.valor, 0);
        despesasData.push(despesaMes);
    }
    
    charts.fluxoCaixa = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: receitasData,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Despesas',
                    data: despesasData,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    });
}

function renderizarTimeline() {
    const timelineDiv = document.getElementById('timelineAtividades');
    if (!timelineDiv) return;

    // Ordena usando .toDate() para garantir que a comparação funcione
    const atividadesRecentes = atividades.sort((a, b) => {
        const dateA = a.criadoEm && a.criadoEm.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm);
        const dateB = b.criadoEm && b.criadoEm.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm);
        return dateB - dateA;
    }).slice(0, 5);

    if (atividadesRecentes.length === 0) {
        timelineDiv.innerHTML = `<div class="timeline-item"><div class="timeline-content">Nenhuma atividade recente.</div></div>`;
        return;
    }
    
    timelineDiv.innerHTML = atividadesRecentes.map(a => {
        // Usa a nossa nova função formatarData
        const dataFormatada = formatarData(a.criadoEm); 
        const horaFormatada = a.criadoEm && a.criadoEm.toDate ? a.criadoEm.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

        return `
            <div class="timeline-item">
                <div class="timeline-content">
                    <strong>${a.descricao}</strong>
                    <div style="font-size: 0.85rem; color: #666;">${dataFormatada} ${horaFormatada}</div>
                </div>
            </div>`;
    }).join('');
}
// === MODAIS E AÇÕES RÁPIDAS ===

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.innerHTML = ''; // Limpa o conteúdo para a próxima vez
    }
}

function abrirModalVendaRapida() {
    const modal = document.getElementById('vendaRapidaModal');
    const clienteOptions = clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    const produtoOptions = produtos.map(p => `<option value="${p.nome}" data-valor="${p.valor}">${p.nome}</option>`).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>⚡ Venda Rápida</h3>
                <button class="close-btn" onclick="fecharModal('vendaRapidaModal')">&times;</button>
            </div>
            <form id="vendaRapidaFormModal">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="modalVendaProduto">Produto</label>
                    <select id="modalVendaProduto" required>${produtoOptions}</select>
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="modalVendaCliente">Cliente</label>
                    <select id="modalVendaCliente" required>${clienteOptions}</select>
                </div>
                <div class="form-grid">
                   <div class="form-group">
                        <label for="modalVendaQtd">Qtd</label>
                        <input type="number" id="modalVendaQtd" value="1" min="1" required>
                    </div>
                     <div class="form-group">
                        <label for="modalVendaPagamento">Pagamento</label>
                        <select id="modalVendaPagamento" required>
                            <option value="PIX">PIX</option><option value="Dinheiro">Dinheiro</option><option value="Cartão">Cartão</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 20px;">Registrar Venda</button>
            </form>
        </div>
    `;
    
    modal.style.display = 'flex';

    modal.querySelector('#vendaRapidaFormModal').addEventListener('submit', (e) => {
        e.preventDefault();
        const produtoNome = document.getElementById('modalVendaProduto').value;
        const produto = produtos.find(p => p.nome === produtoNome);
        if (!produto) {
            mostrarAlerta('Produto não encontrado!', 'danger');
            return;
        }
        
        const venda = {
            
            data: new Date().toISOString().split('T')[0],
            pessoa: document.getElementById('modalVendaCliente').value,
            produto: produtoNome,
            quantidade: parseInt(document.getElementById('modalVendaQtd').value),
            valor: produto.valor,
            pagamento: document.getElementById('modalVendaPagamento').value,
            status: 'A' // Venda rápida já é paga
        };

        // Simula o comportamento da função principal de adicionar venda
        FirebaseService.salvar('vendas', venda).then(() => {
            mostrarAlerta('Venda rápida registrada!', 'success');
            carregarTodosDados().then(() => renderizarTudo());
        });
        
        fecharModal('vendaRapidaModal');
    });
}

function abrirModalRelatorios() {
    const modal = document.getElementById('relatoriosModal');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📊 Gerador de Relatórios</h3>
                <button class="close-btn" onclick="fecharModal('relatoriosModal')">&times;</button>
            </div>
            <p>Selecione o período para gerar o relatório.</p>
            <div class="form-grid" style="margin-top: 20px;">
                <div class="form-group"><label for="relatorioInicio">Data Início</label><input type="date" id="relatorioInicio" required></div>
                <div class="form-group"><label for="relatorioFim">Data Fim</label><input type="date" id="relatorioFim" required></div>
            </div>
            <button class="btn btn-primary" onclick="gerarRelatorio()" style="margin-top: 20px;">Gerar Relatório</button>
            <div id="resultadoRelatorio" style="margin-top: 20px;"></div>
        </div>
    `;
    
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    modal.querySelector('#relatorioInicio').value = inicioMes;
    modal.querySelector('#relatorioFim').value = hoje.toISOString().split('T')[0];

    modal.style.display = 'flex';
}

function gerarRelatorio() {
    // 1. Coleta e prepara os filtros
    const inicio = new Date(document.getElementById('relatorioInicio').value);
    const fim = new Date(document.getElementById('relatorioFim').value);
    const clienteFiltro = document.getElementById('relatorioCliente').value;
    const pagamentoFiltro = document.getElementById('relatorioPagamento').value;

    const inicioUTC = new Date(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate());
    const fimUTC = new Date(fim.getUTCFullYear(), fim.getUTCMonth(), fim.getUTCDate());

    // 2. Filtra as vendas com base nos critérios
    const vendasPeriodo = vendas.filter(v => {
        if (!v.data || isNaN(new Date(v.data))) return false;
        const dataVenda = new Date(v.data);
        const dataVendaUTC = new Date(dataVenda.getUTCFullYear(), dataVenda.getUTCMonth(), dataVenda.getUTCDate());
        
        const dataValida = dataVendaUTC >= inicioUTC && dataVendaUTC <= fimUTC;
        const clienteValido = (clienteFiltro === 'todos' || v.pessoa === clienteFiltro);
        const pagamentoValido = (pagamentoFiltro === 'Todos' || v.pagamento === pagamentoFiltro);

        return dataValida && clienteValido && pagamentoValido;
    });

    if (vendasPeriodo.length === 0) {
        document.getElementById('resultadoRelatorio').innerHTML = '<div class="alert alert-info">Nenhuma venda encontrada com os filtros selecionados.</div>';
        return;
    }

    // 3. Agrupa os dados por cliente e depois por produto
    const relatorioAgrupado = {};
    const contagemProdutos = {};
    vendasPeriodo.forEach(venda => {
        if (!relatorioAgrupado[venda.pessoa]) {
            relatorioAgrupado[venda.pessoa] = { produtos: {}, subtotal: 0 };
        }
        const clienteAtual = relatorioAgrupado[venda.pessoa];
        if (!clienteAtual.produtos[venda.produto]) {
            clienteAtual.produtos[venda.produto] = { quantidade: 0, valorTotal: 0 };
        }
        clienteAtual.produtos[venda.produto].quantidade += venda.quantidade;
        clienteAtual.produtos[venda.produto].valorTotal += venda.valor * venda.quantidade;
        clienteAtual.subtotal += venda.valor * venda.quantidade;
        contagemProdutos[venda.produto] = (contagemProdutos[venda.produto] || 0) + venda.quantidade;
    });

    // 4. Calcula os totais e o resumo
    const totalItens = vendasPeriodo.reduce((acc, v) => acc + v.quantidade, 0);
    const valorTotalVendido = vendasPeriodo.reduce((acc, v) => acc + (v.valor * v.quantidade), 0);
    const clientesAtendidos = Object.keys(relatorioAgrupado).length;
    const ticketMedio = valorTotalVendido / clientesAtendidos;
    const produtoMaisVendido = Object.entries(contagemProdutos).sort((a, b) => b[1] - a[1])[0];

    // 5. Monta o HTML do relatório
    const hoje = new Date();
    const dataGeracao = `${hoje.toLocaleDateString()} ${hoje.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    let relatorioHTML = `
        <style>
            .relatorio-container { border: 1px solid #ddd; border-radius: 8px; padding: 25px; background: #fff; }
            .relatorio-header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
            .relatorio-header img { height: 80px; margin-bottom: 10px; }
            .relatorio-info { display: flex; justify-content: space-between; font-size: 0.85rem; color: #666; margin-top: 10px; }
            .relatorio-cliente { margin-top: 25px; }
            .relatorio-cliente h5 { font-size: 1.1rem; color: var(--primary-color); border-bottom: 1px solid #f0f0f0; padding-bottom: 5px; }
            .relatorio-tabela { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .relatorio-tabela th, .relatorio-tabela td { padding: 8px; text-align: left; }
            .relatorio-tabela thead { background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; }
            .relatorio-tabela tbody tr:nth-child(odd) { background-color: #fcfcfc; }
            .subtotal-cliente { text-align: right; font-weight: bold; margin-top: 10px; }
            .relatorio-resumo { border-top: 2px solid #eee; margin-top: 30px; padding-top: 15px; }
        </style>

        <div id="relatorio-imprimivel" class="relatorio-container">
            <div class="relatorio-header">
                <img src="images/logo.png" alt="Logo"> <h3>LÁ DIVINO SABOR - RELATÓRIO DE VENDAS</h3>
                <div class="relatorio-info">
                    <span><strong>Período:</strong> ${inicio.toLocaleDateString()} a ${fim.toLocaleDateString()}</span>
                    <span><strong>Gerado em:</strong> ${dataGeracao}</span>
                </div>
            </div>
    `;

    for (const nomeCliente in relatorioAgrupado) {
        const dadosCliente = relatorioAgrupado[nomeCliente];
        relatorioHTML += `
            <div class="relatorio-cliente">
                <h5>Cliente: ${nomeCliente}</h5>
                <table class="relatorio-tabela">
                    <thead><tr><th>Produto</th><th>Qtd</th><th>Valor Total</th></tr></thead>
                    <tbody>
        `;
        for (const nomeProduto in dadosCliente.produtos) {
            const dadosProduto = dadosCliente.produtos[nomeProduto];
            relatorioHTML += `
                <tr>
                    <td>${nomeProduto}</td>
                    <td>${dadosProduto.quantidade}</td>
                    <td>${formatarMoeda(dadosProduto.valorTotal)}</td>
                </tr>
            `;
        }
        relatorioHTML += `
                    </tbody>
                </table>
                <div class="subtotal-cliente">>> Subtotal: ${formatarMoeda(dadosCliente.subtotal)}</div>
            </div>
        `;
    }

    relatorioHTML += `
            <div class="relatorio-resumo">
                <h4>Resumo do Período:</h4>
                <p><strong>Total de Itens Vendidos:</strong> ${totalItens}</p>
                <p><strong>Valor Total Vendido:</strong> ${formatarMoeda(valorTotalVendido)}</p>
                <p><strong>Clientes Atendidos:</strong> ${clientesAtendidos}</p>
                <p><strong>Ticket Médio por Cliente:</strong> ${formatarMoeda(ticketMedio)}</p>
                <p><strong>Produto Mais Vendido:</strong> ${produtoMaisVendido[0]} (${produtoMaisVendido[1]} unid.)</p>
            </div>
        </div>
        <button class="btn btn-secondary" onclick="imprimirRelatorio()" style="margin-top: 20px;">🖨️ Imprimir Relatório</button>
    `;
    
    document.getElementById('resultadoRelatorio').innerHTML = relatorioHTML;
}

async function salvarMeta() {
    const metaInput = document.getElementById('metaMensal');
    const meta = parseFloat(metaInput.value);
    
    if (isNaN(meta) || meta < 0) {
        mostrarAlerta('Por favor, insira um valor de meta válido.', 'warning');
        return;
    }
    
    configuracoes.metaMensal = meta;
    
    // Salva a meta no Firebase
    if (configuracoes.id) {
        await FirebaseService.atualizar('configuracoes', configuracoes.id, { metaMensal: meta });
        mostrarAlerta('Meta salva com sucesso!', 'success');
        atualizarProgressoMeta(); // Atualiza a barra de progresso imediatamente
    } else {
        // Se não houver config, cria uma nova
        const newConfigId = await FirebaseService.salvar('configuracoes', { metaMensal: meta });
        if (newConfigId) {
            configuracoes.id = newConfigId;
            mostrarAlerta('Meta salva com sucesso!', 'success');
            atualizarProgressoMeta();
        }
    }
}

// Esta função atualiza a barra de progresso da meta
function atualizarProgressoMeta() {
    // Pega o total vendido que já foi calculado para o dashboard
    const totalVendidoTexto = document.getElementById('dashTotalVendido').textContent;
    // Converte o texto "R$ 1.234,56" para o número 1234.56
    const receitaAtual = parseFloat(totalVendidoTexto.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
    
    const meta = configuracoes.metaMensal || 0;
    document.getElementById('metaMensal').value = meta;

    if (meta <= 0) {
        document.getElementById('progressoMeta').style.width = '0%';
        document.getElementById('statusMeta').textContent = 'Defina uma meta para acompanhar';
        return;
    }
    
    const progresso = Math.min((receitaAtual / meta) * 100, 100);
    document.getElementById('progressoMeta').style.width = progresso + '%';
    
    const statusTexto = ` ${formatarMoeda(receitaAtual)} / ${formatarMoeda(meta)} (${progresso.toFixed(1)}%)`;
    document.getElementById('statusMeta').textContent = progresso >= 100 ? `🎉 Meta alcançada! ${statusTexto}` : statusTexto;
}

function copiarMensagem() {
    const mensagem = document.getElementById('mensagemCobranca');
    if (mensagem && mensagem.value) {
        navigator.clipboard.writeText(mensagem.value);
        mostrarAlerta('Mensagem copiada para a área de transferência!', 'success');
    }
}

function abrirWhatsApp() {
    const clienteNome = document.getElementById('clienteCobranca').value;
    const mensagem = document.getElementById('mensagemCobranca').value;
    
    if (!clienteNome || !mensagem) {
        mostrarAlerta('Selecione um cliente e gere a mensagem primeiro.', 'warning');
        return;
    }
    
    const cliente = clientes.find(c => c.nome === clienteNome);
    const telefone = cliente?.contato?.replace(/\D/g, '');
    
    if (!telefone) {
        mostrarAlerta('Cliente não possui um número de telefone cadastrado.', 'danger');
        return;
    }
    
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// === FUNÇÕES UTILITÁRIAS ===
// === LÓGICA DE ENCOMENDAS ===

// Esta função abre o formulário para criar ou editar uma encomenda
function abrirModalEncomenda(encomenda = null) {
    const modal = document.getElementById('encomendaModal');
    const isEdit = encomenda !== null;
    
    let clienteOptions = '<option value="">Selecione...</option>' + 
        clientes.map(c => `<option value="${c.nome}" ${isEdit && c.nome === encomenda?.clienteNome ? 'selected' : ''}>${c.nome}</option>`).join('');
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📅 ${isEdit ? 'Editar' : 'Nova'} Encomenda</h3>
                <button class="close-btn" onclick="fecharModal('encomendaModal')">&times;</button>
            </div>
            <form id="encomendaFormModal">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="modalEncomendaCliente">Cliente</label>
                        <select id="modalEncomendaCliente" required>${clienteOptions}</select>
                    </div>
                    <div class="form-group">
                        <label for="modalEncomendaDataEntrega">Data de Entrega</label>
                        <input type="date" id="modalEncomendaDataEntrega" value="${isEdit ? encomenda?.dataEntrega : ''}" required>
                    </div>
                    <div class="form-group full-width">
                        <label for="modalEncomendaProdutoDescricao">Descrição do Produto</label>
                        <textarea id="modalEncomendaProdutoDescricao" rows="3" required placeholder="Ex: Bolo de 2kg, massa branca, recheio de ninho com morango...">${isEdit ? encomenda?.produtoDescricao || '' : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="modalEncomendaValorTotal">Valor Total (R$)</label>
                        <input type="number" id="modalEncomendaValorTotal" step="0.01" min="0" value="${isEdit ? encomenda?.valorTotal || '' : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="modalEncomendaValorEntrada">Valor Entrada (R$)</label>
                        <input type="number" id="modalEncomendaValorEntrada" step="0.01" min="0" value="${isEdit ? encomenda?.valorEntrada || '' : ''}">
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 20px;">
                    ${isEdit ? '💾 Salvar Alterações' : '📅 Agendar Encomenda'}
                </button>
            </form>
        </div>
    `;
    
    modal.style.display = 'flex';

    // Adiciona o listener de evento para o formulário recém-criado
    modal.querySelector('#encomendaFormModal').addEventListener('submit', (e) => {
        adicionarOuEditarEncomenda(e, isEdit ? encomenda.id : null);
    });
}
// Função para editar uma encomenda
function editarEncomenda(id) {
    const encomenda = encomendas.find(e => e.id === id);
    if (encomenda) {
        // Reutiliza o modal de criação, passando os dados da encomenda para preencher o formulário
        abrirModalEncomenda(encomenda);
    } else {
        mostrarAlerta('Encomenda não encontrada.', 'danger');
    }
}
// Função para excluir uma encomenda
function excluirEncomenda(id) {
    showConfirm('Tem certeza que deseja excluir esta encomenda?', async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            const success = await FirebaseService.excluir('encomendas', id);
            if (success) {
                mostrarAlerta('Encomenda excluída com sucesso!', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}

// Esta função processa o formulário e salva a encomenda no Firebase
async function adicionarOuEditarEncomenda(event, encomendaId = null) {
    event.preventDefault();
    const form = event.target;
    const dados = {
        clienteNome: form.querySelector('#modalEncomendaCliente').value,
        produtoDescricao: form.querySelector('#modalEncomendaProdutoDescricao').value,
        dataEntrega: form.querySelector('#modalEncomendaDataEntrega').value,
        valorTotal: parseFloat(form.querySelector('#modalEncomendaValorTotal').value) || 0,
        valorEntrada: parseFloat(form.querySelector('#modalEncomendaValorEntrada').value) || 0,
        status: 'Pendente'
    };

    if (!dados.clienteNome || !dados.produtoDescricao || !dados.dataEntrega || dados.valorTotal <= 0) {
        mostrarAlerta('Preencha todos os campos obrigatórios da encomenda.', 'danger');
        return;
    }

    mostrarLoading(true);

    if (encomendaId) {
        // Lógica de ATUALIZAÇÃO
        await FirebaseService.atualizar('encomendas', encomendaId, dados);
        mostrarAlerta('Encomenda atualizada com sucesso!', 'success');
    } else {
        // Lógica para SALVAR uma nova encomenda
        const newId = await FirebaseService.salvar('encomendas', dados);
        if (newId) {
            // ADICIONADO: Atualiza o cadastro do cliente com o VALOR TOTAL da encomenda
            await atualizarDadosCliente(dados.clienteNome, dados.valorTotal);
            mostrarAlerta('Encomenda agendada com sucesso!', 'success');
        }
    }

    fecharModal('encomendaModal');
    await carregarTodosDados();
    renderizarTudo();
    mostrarLoading(false);
}
function formatarMoeda(valor) {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataInput) {
    if (!dataInput) return 'N/A';
    
    // Se for um objeto Timestamp do Firebase, converte para Date
    if (dataInput && typeof dataInput.toDate === 'function') {
        const data = dataInput.toDate();
        return data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
    
    // Se já for uma string ou um objeto Date, tenta formatar
    try {
        const data = new Date(dataInput);
        // Corrige o problema de fuso horário que pode exibir o dia anterior
        return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Data inválida';
    }
}

function getStatusBadge(status) {
    const map = { P: 'warning', A: 'success', E: 'info' };
    const text = { P: 'Pendente', A: 'Pago', E: 'Entregue' };
    return `<span class="badge badge-${map[status] || 'secondary'}">${text[status] || status}</span>`;
}

function mostrarAlerta(mensagem, tipo = 'info') {
    let alertContainer = document.querySelector('#alert-container');
    if(!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.style.cssText = 'position:fixed; top:20px; right:20px; z-index:2000;';
        document.body.appendChild(alertContainer);
    }
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.textContent = mensagem;
    alertContainer.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

function showConfirm(text, callback) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmModal-text').textContent = text;
    
    const okBtn = document.getElementById('confirmModal-ok');
    const cancelBtn = document.getElementById('confirmModal-cancel');

    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        callback(true);
    });
    
    newCancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        callback(false);
    });
    
    modal.style.display = 'flex';
}

// === BACKUP E OUTRAS AÇÕES ===
function exportarDados() {
    showConfirm('Deseja criar um backup de todos os dados em um arquivo Excel?', (confirmado) => {
        if (confirmado) {
            try {
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendas.map(({ id, ...rest }) => rest)), "Vendas");
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientes.map(({ id, ...rest }) => rest)), "Clientes");
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(produtos.map(({ id, ...rest }) => rest)), "Produtos");
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(despesas.map(({ id, ...rest }) => rest)), "Despesas");
                
                const dataAtual = new Date().toISOString().split('T')[0];
                XLSX.writeFile(wb, `Backup_LaDivinoSabor_${dataAtual}.xlsx`);
                
                mostrarAlerta('Backup gerado com sucesso!', 'success');
            } catch (error) {
                mostrarAlerta('Ocorreu um erro ao gerar o backup.', 'danger');
                console.error("Erro no backup:", error);
            }
        }
    });
}

function configurarBackupAutomatico() {
    // A lógica de backup pode ser mantida como um lembrete
    setInterval(() => {
        const ultimoBackup = configuracoes.ultimoBackup ? new Date(configuracoes.ultimoBackup) : null;
        if (!ultimoBackup || (new Date() - ultimoBackup) > (7 * 24 * 60 * 60 * 1000)) { // Lembrete semanal
            mostrarAlerta('Lembrete: Faça um backup dos seus dados!', 'warning');
        }
    }, 60 * 60 * 1000); // Verifica a cada hora
}
// === EXPOR FUNÇÕES PARA O HTML ===
window.openTab = openTab;

// Ações Rápidas e Modais
window.abrirModalVendaRapida = abrirModalVendaRapida;
window.abrirModalEncomenda = abrirModalEncomenda;
window.abrirModalRelatorios = abrirModalRelatorios;
window.exportarDados = exportarDados;
window.fecharModal = fecharModal;

// Dashboard
window.salvarMeta = salvarMeta;
window.gerarRelatorio = gerarRelatorio;

// Tabelas de Cadastros
window.editarCliente = editarCliente;
window.excluirCliente = excluirCliente;
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
window.editarEncomenda = editarEncomenda;     // Adicionado
window.excluirEncomenda = excluirEncomenda;   // Adicionado

// Tabela de Vendas
window.editarStatusVenda = editarStatusVenda;
window.excluirVenda = excluirVenda;

// Tabela de Despesas
window.excluirDespesa = excluirDespesa;

// Aba de Cobranças
window.copiarMensagem = copiarMensagem;
window.abrirWhatsApp = abrirWhatsApp;
window.marcarPendenciasComoPagas = marcarPendenciasComoPagas;
window.marcarTodosComoContatados = marcarTodosComoContatados;
window.debugFiltros = debugFiltros;
window.extrairDataDoItem = extrairDataDoItem;
window.criarFiltroData = criarFiltroData;