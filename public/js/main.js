const venda = {
        data: document.getElementById('data').value,
        pessoa: document.getElementById('pessoa').value,
        produto: document.getElementById('produto').value,
        quantidade: parseInt(document.getElementById('quantidade').value),
        valor: parseFloat(document.getElementById('valor').value),
        pagamento: document.getElementById('pagamento').value,
        status: document.getElementById('status').value
    };

    if (!isValidDateInput(venda.data)) {
        return mostrarAlerta('Data da venda inv?lida.', 'warning');
    }
    if (!venda.pessoa || !venda.produto || isNaN(venda.valor) || venda.valor <= 0 || isNaN(venda.quantidade) || venda.quantidade <= 0) {
        return mostrarAlerta('Cliente, produto, quantidade e valor s?o obrigat?rios.', 'warning');
    }

    // === CONFIGURAÇÃO FIREBASE ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";

// Importa as funções de Autenticação que vamos usar
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

// Importa TODAS as funções do Firestore que você já usava
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
const auth = getAuth(app);

// === ESTADO GLOBAL ===
let usuarioAtual = null;
let vendas = [];
let anoFiltroSelecionado = new Date().getFullYear(); // Inicializa com ano atual
let mesFiltroSelecionado = new Date().getMonth(); // Inicializa com mês atual
let produtos = [];
let clientes = [];
let encomendas = [];
let despesas = [];
let cobrancas = [];
let ingredientes = []; 
let atividades = [];
let configuracoes = {
    id: null,
    metaMensal: 0,
    ultimoBackup: null
};

const editState = {
    materialId: null,
    receitaId: null,
    clienteId: null,
    produtoId: null,
    ingredienteId: null
};
let receitaTemporaria = [];
let charts = {};
let isLoading = false;
let editandoReceitaProdutoId = null;
const pagination = {
    vendas: 1,
    clientes: 1,
    produtos: 1,
    despesas: 1
};
let receitas = [];
let materiais = [];
let composicaoReceitas = [];
let materiaisUtilizados = [];
const rowsPerPage = 10;

// === FUNÇÕES DE FIRESTORE ===
function formatarErroFirebase(error, fallback) {
    const msg = (error && (error.message || error.code)) ? String(error.message || error.code) : '';
    const isNetwork = /network|unavailable|offline|failed|timeout/i.test(msg);
    if (isNetwork) {
        return `${fallback} Verifique sua conexÃ£o com a internet e tente novamente.`;
    }
    return `${fallback} ${msg}`.trim();
}

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
            mostrarAlerta(formatarErroFirebase(error, 'Erro ao salvar dados.'), 'danger');
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
            mostrarAlerta(formatarErroFirebase(error, 'Erro ao atualizar dados.'), 'danger');
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
            mostrarAlerta(formatarErroFirebase(error, 'Erro ao excluir dados.'), 'danger');
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
            mostrarAlerta(formatarErroFirebase(error, 'Erro ao carregar dados.'), 'danger');
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

    // --- INÍCIO DA ALTERAÇÃO ---
    // Popula os meses
    const nomesDosMeses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", 
                          "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    
    // 1. Adicionamos a opção "TODOS" com um valor especial -1
    filtroMesSelect.innerHTML = '<option value="-1">TODOS OS MESES</option>';
    
    // 2. Adicionamos os outros meses, mantendo o mês atual selecionado por padrão
    nomesDosMeses.forEach((nome, index) => {
        const selected = index === mesAtual ? 'selected' : '';
        // Note o `+=` para adicionar ao invés de substituir
        filtroMesSelect.innerHTML += `<option value="${index}" ${selected}>${nome}</option>`; 
    });
    // --- FIM DA ALTERAÇÃO ---

    // Sincroniza as variáveis com os valores selecionados ao carregar
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
// === INICIALIZAÇÃO E CONTROLE DE ACESSO ===

// ESTE É O NOSSO "PORTEIRO"
// Ele roda assim que a página carrega para verificar o status de login
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 1. O usuário está logado. Vamos buscar as informações dele no Firestore.
        const userDoc = await FirebaseService.carregarPorId('usuarios', user.uid);

        if (userDoc && userDoc.role) {
            // 2. Encontramos o usuário e sua permissão (role).
            usuarioAtual = {
                uid: user.uid,
                email: user.email,
                role: userDoc.role,
                nome: userDoc.nome
            };
            console.log(`Usuário ${usuarioAtual.nome} (${usuarioAtual.role}) logado.`);

            // 3. Agora sim, podemos iniciar a aplicação.
            await iniciarAplicacao();
        } else {
            // Caso o usuário exista no Auth mas não no Firestore.
            alert('Erro: Usuário não possui permissões definidas. Contate o suporte.');
            fazerLogout();
        }
    } else {
        // 4. Usuário NÃO está logado. Redireciona para a tela de login.
        console.log("Nenhum usuário logado, redirecionando para login.html");
        window.location.href = 'login.html';
    }
});

function fazerLogout() {
    signOut(auth).catch((error) => console.error('Erro ao fazer logout:', error));
}

// Esta função agora contém todo o código de inicialização que estava no DOMContentLoaded
async function iniciarAplicacao() {
    // 1. Mostra a saudação e o log IMEDIATAMENTE.
    console.log(`Usuário ${usuarioAtual.nome} (${usuarioAtual.role}) logado.`);
    document.getElementById('userInfoDisplay').textContent = `Olá, ${usuarioAtual.nome}!`;

    mostrarLoading(true);
    
    popularFiltrosDeData();
    await inicializarSistema();
    configurarEventListeners();
    aplicarControlesDeAcesso();
    await carregarTodosDados();
    renderizarTudo();
    configurarBackupAutomatico();
    
    mostrarLoading(false);
}
function aplicarControlesDeAcesso() {
    // Se a função do usuário logado for 'viewer'...
    if (usuarioAtual.role === 'viewer') {
        
        // 1. Esconde todos os elementos que requerem permissão de admin
        const elementosAdmin = document.querySelectorAll('.requires-admin');
        elementosAdmin.forEach(el => {
            el.style.display = 'none';
        });

        // 2. Desabilita todos os campos de formulário para que não possam ser editados
        const formInputs = document.querySelectorAll('form input, form select, form textarea, form button[type="submit"]');
        formInputs.forEach(input => {
            input.disabled = true;
        });
    }
    // Se for 'admin', não fazemos nada, pois ele pode ver e usar tudo por padrão.
}


async function inicializarSistema() {
    document.getElementById('data').valueAsDate = new Date();
    document.getElementById('despesaData').valueAsDate = new Date();
    
    // --- CORREÇÃO APLICADA AQUI ---
    // Verificar se AMBAS as coleções principais estão vazias
    const produtosExistentes = await FirebaseService.carregar('produtos');
    const clientesExistentes = await FirebaseService.carregar('clientes');

    if (produtosExistentes.length === 0 && clientesExistentes.length === 0) {
        // Só adiciona os exemplos se não houver nem produtos, nem clientes.
        await adicionarDadosExemplo();
    }
    // --- FIM DA CORREÇÃO ---
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
        // A ordem das variáveis na lista de baixo...
        const [
            clientesData, 
            produtosData, 
            vendasData, 
            encomendasData, 
            despesasData, 
            cobrancasData, 
            atividadesData, 
            configData,
            ingredientesData,
            receitasData,
            materiaisData
        ] = await Promise.all([
            // ...deve ser exatamente a mesma ordem das chamadas aqui.
            FirebaseService.carregar('clientes'),
            FirebaseService.carregar('produtos'),
            FirebaseService.carregar('vendas'),
            FirebaseService.carregar('encomendas'),
            FirebaseService.carregar('despesas'),
            FirebaseService.carregar('cobrancas'),
            FirebaseService.carregar('atividades'), // <-- ESTA LINHA ESTAVA FALTANDO
            FirebaseService.carregar('configuracoes'),
            FirebaseService.carregar('ingredientes'),
            FirebaseService.carregar('receitas'),
            FirebaseService.carregar('materiais')
        ]);

        clientes = clientesData || [];
        produtos = produtosData || [];
        vendas = vendasData || [];
        encomendas = encomendasData || [];
        despesas = despesasData || [];
        cobrancas = cobrancasData || [];
        atividades = atividadesData || [];
        ingredientes = ingredientesData || [];
        receitas = receitasData || []; 
        materiais = materiaisData || [];
        
        if (configData && configData.length > 0) {
            configuracoes = { ...configuracoes, ...configData[0] };
        } else {
            const newConfigId = await FirebaseService.salvar('configuracoes', { metaMensal: 0, ultimoBackup: null });
            if (newConfigId) {
                configuracoes.id = newConfigId;
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        mostrarAlerta(formatarErroFirebase(error, 'Erro ao carregar dados.'), 'danger');
    }
}

// Adicione estas 4 novas funções em main.js

function renderizarTabelaMateriais() {
    const tbody = document.getElementById('materiaisTableBody');
    if (!tbody) return;

    const materiaisOrdenados = [...materiais].sort((a, b) => a.nome.localeCompare(b.nome));

    tbody.innerHTML = materiaisOrdenados.map(mat => `
        <tr>
            <td><strong>${escHtml(mat.nome)}</strong></td>
            <td>${formatarMoeda(mat.custo)}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm requires-admin" onclick="editarMaterial('${mat.id}')" title="Editar">✏️</button>
                <button class="btn btn-danger btn-sm requires-admin" onclick="excluirMaterial('${mat.id}')" title="Excluir">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function adicionarOuEditarMaterial(e) {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('materialNome').value.trim(),
        custo: parseFloat(document.getElementById('materialCusto').value) || 0,
    };

    if (!dados.nome || dados.custo <= 0) {
        return mostrarAlerta('Nome e Custo válido são obrigatórios.', 'warning');
    }

    mostrarLoading(true);

    if (editState.materialId) {
        await FirebaseService.atualizar('materiais', editState.materialId, dados);
        await FirebaseService.salvar('atividades', { tipo: 'edicao', descricao: `Material atualizado: ${dados.nome}`, usuarioNome: usuarioAtual.nome });
        mostrarAlerta('Material atualizado com sucesso!', 'success');
    } else {
        await FirebaseService.salvar('materiais', dados);
        mostrarAlerta('Material salvo com sucesso!', 'success');
    }
    
    editState.materialId = null;
    document.getElementById('materialForm').reset();
    document.querySelector('#materialForm button[type="submit"]').textContent = '➕ Salvar Material';
    
    await carregarTodosDados();
    renderizarTudo();
    mostrarLoading(false);
}


function editarMaterial(id) {
    const material = materiais.find(m => m.id === id);
    if (!material) return;

    // 1. NAVEGA PARA A TELA CORRETA PRIMEIRO
    const cadastrosTabButton = document.querySelector('.tab-button[onclick*="cadastros"]');
    if (cadastrosTabButton) cadastrosTabButton.click();
    
    const materiaisSubTabButton = document.querySelector('.sub-tab-button[data-target="panel-materiais"]');
    if (materiaisSubTabButton) materiaisSubTabButton.click();

    // 2. AGORA, DEPOIS DE NAVEGAR, DEFINE O ID DE EDIÇÃO
    editState.materialId = id;

    // 3. Preenche o formulário
    document.getElementById('materialNome').value = material.nome;
    document.getElementById('materialCusto').value = material.custo;
    document.querySelector('#materialForm button[type="submit"]').textContent = '💾 Salvar Alterações';
    document.getElementById('materialNome').focus();
}

function excluirMaterial(id) {
    const material = materiais.find(m => m.id === id);
    if (!material) return;

    // --- LÓGICA DE VERIFICAÇÃO CORRIGIDA ---
    // A verificação agora aponta para o campo correto 'materiaisUtilizados' dentro de cada produto.
    const produtosComMaterial = produtos.filter(p => 
        p.materiaisUtilizados && p.materiaisUtilizados.some(mat => mat.id === id)
    );

    if (produtosComMaterial.length > 0) {
        const nomesProdutos = produtosComMaterial.map(p => p.nome).join(', ');
        return mostrarAlerta(`O material "${material.nome}" não pode ser excluído. Ele está em uso no(s) seguinte(s) produto(s): ${nomesProdutos}.`, 'danger');
    }
    // --- FIM DA CORREÇÃO ---

    showConfirm(`Tem certeza que deseja excluir o material "${material.nome}"?`, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            await FirebaseService.excluir('materiais', id);
            mostrarAlerta('Material excluído com sucesso!', 'success');
            await carregarTodosDados();
            renderizarTudo();
            mostrarLoading(false);
        }
    });
}

// Adicione esta nova função em main.js
function imprimirReceitaExistente(id) {
    const receita = receitas.find(r => r.id === id);
    if (!receita) return mostrarAlerta('Receita não encontrada.', 'danger');

    let ingredientesHTML = '';
    if (receita.ingredientes) {
        // Itera sobre a lista de ingredientes da receita para criar as linhas da tabela
        receita.ingredientes.forEach(item => {
            const ingrediente = ingredientes.find(i => i.id === item.ingredienteId);
            if (ingrediente) {
                ingredientesHTML += `<tr><td>${ingrediente.nome}</td><td>${item.quantidade} ${item.unidadeUso}</td></tr>`;
            }
        });
    }

    // Template HTML e CSS para a página de impressão
    const conteudoParaImprimir = `
        <html>
        <head>
            <title>Ficha Técnica - ${receita.titulo}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                :root {
                    --chocolate-brown: #6B3E26;
                    --cream-beige: #F5E2C8;
                    --soft-black: #1C1C1C;
                }
                body {
                    font-family: 'Poppins', sans-serif;
                    margin: 0;
                    padding: 30px;
                    color: var(--soft-black);
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid var(--cream-beige);
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo {
                    height: 80px;
                    margin-bottom: 10px;
                }
                h1 {
                    font-size: 2.5rem;
                    color: var(--chocolate-brown);
                    margin: 0;
                    font-weight: 700;
                }
                .summary-container {
                    display: flex;
                    justify-content: space-around;
                    text-align: center;
                    background-color: #fafafa;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 30px;
                }
                .summary-item {
                    flex-basis: 33%;
                }
                .summary-item h3 {
                    margin: 0 0 5px 0;
                    font-size: 1rem;
                    color: #555;
                    font-weight: 400;
                }
                .summary-item p {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--chocolate-brown);
                }
                .ingredients-section h2 {
                    font-size: 1.8rem;
                    color: var(--chocolate-brown);
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 1rem;
                }
                th, td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid #e0e0e0;
                }
                thead tr {
                    background-color: #f9f9f9;
                    font-weight: 600;
                }
                tbody tr:nth-child(even) {
                    background-color: #fdfdfd;
                }
                footer {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    font-size: 0.8rem;
                    color: #888;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="images/logo.png" alt="Logo Lá Divino Sabor" class="logo">
                <h1>${receita.titulo}</h1>
            </div>

            <div class="summary-container">
                <div class="summary-item">
                    <h3>Rendimento</h3>
                    <p>${receita.rendimento} unidades</p>
                </div>
                <div class="summary-item">
                    <h3>Custo Total</h3>
                    <p>${formatarMoeda(receita.custoTotal)}</p>
                </div>
                <div class="summary-item">
                    <h3>Custo por Unidade</h3>
                    <p>${formatarMoeda(receita.custoPorUnidade)}</p>
                </div>
            </div>

            <div class="ingredients-section">
                <h2>Ingredientes</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Ingrediente</th>
                            <th>Quantidade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ingredientesHTML}
                    </tbody>
                </table>
            </div>
            
            <footer>
                Lá Divino Sabor - Controle Total | Gerado em: ${new Date().toLocaleDateString('pt-BR')}
            </footer>
        </body>
        </html>
    `;

    const janelaImprimir = window.open('', '', 'height=800,width=900');
    janelaImprimir.document.write(conteudoParaImprimir);
    janelaImprimir.document.close();
    setTimeout(() => { janelaImprimir.print(); }, 500); // Timeout para garantir que a fonte externa carregue
}
// Adicione esta nova função em qualquer lugar do main.js
function renderizarTabelaReceitas() {
    const tbody = document.getElementById('receitasTableBody');
    if (!tbody) return;

    const receitasOrdenadas = [...receitas].sort((a, b) => a.titulo.localeCompare(b.titulo));

    tbody.innerHTML = receitasOrdenadas.map(rec => `
        <tr>
            <td><strong>${escHtml(rec.titulo)}</strong></td>
            <td>${rec.rendimento} unid.</td>
            <td>${formatarMoeda(rec.custoTotal)}</td>
            <td>${formatarMoeda(rec.custoPorUnidade)} / unid.</td>
            <td class="actions">
                <button class="btn btn-secondary btn-sm" onclick="imprimirReceitaExistente('${rec.id}')" title="Imprimir Receita">🖨️</button>
                <button class="btn btn-primary btn-sm requires-admin" onclick="editarReceita('${rec.id}')" title="Editar">✏️</button>
                <button class="btn btn-danger btn-sm requires-admin" onclick="excluirReceita('${rec.id}')" title="Excluir">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Função para EXCLUIR uma receita
// Substitua esta função em main.js
function excluirReceita(id) {
    const receita = receitas.find(r => r.id === id);
    if (!receita) return;

    // --- LÓGICA DE VERIFICAÇÃO CORRIGIDA ---
    // A verificação agora aponta para o campo correto 'composicaoReceitas' dentro de cada produto.
    const produtosComReceita = produtos.filter(p => 
        p.composicaoReceitas && p.composicaoReceitas.some(rec => rec.id === id)
    );

    if (produtosComReceita.length > 0) {
        const nomesProdutos = produtosComReceita.map(p => p.nome).join(', ');
        return mostrarAlerta(`A receita "${receita.titulo}" não pode ser excluída. Ela está em uso no(s) seguinte(s) produto(s): ${nomesProdutos}.`, 'danger');
    }
    // --- FIM DA CORREÇÃO ---

    showConfirm(`Tem certeza que deseja excluir a receita "${receita.titulo}"?`, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            const success = await FirebaseService.excluir('receitas', id);
            if (success) {
                mostrarAlerta('Receita excluída com sucesso!', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}


function editarReceita(id) {
    const receita = receitas.find(r => r.id === id);
    if (!receita) return;

    // 1. NAVEGA PARA A TELA CORRETA PRIMEIRO
    const cadastrosTabButton = document.querySelector('.tab-button[onclick*="cadastros"]');
    if (cadastrosTabButton) cadastrosTabButton.click();

    const receitasSubTabButton = document.querySelector('.sub-tab-button[data-target="panel-receitas"]');
    if (receitasSubTabButton) receitasSubTabButton.click();
    
    // 2. AGORA, DEPOIS DE NAVEGAR, DEFINE O ID DE EDIÇÃO
    editState.receitaId = id;

    // 3. Preenche o formulário
    document.getElementById('receitaTitulo').value = receita.titulo;
    document.getElementById('receitaRendimento').value = receita.rendimento;
    
    const tbody = document.getElementById('receitaIngredientesTbody');
    tbody.innerHTML = '';
    if (receita.ingredientes) {
        receita.ingredientes.forEach(item => {
            const ingrediente = ingredientes.find(i => i.id === item.ingredienteId);
            if (ingrediente) {
                adicionarLinhaIngredienteNaTabela(ingrediente, item.quantidade, item.unidadeUso);
            }
        });
    }
    
    atualizarCustoTotalReceita();

    const btnSalvar = document.getElementById('btnSalvarReceita');
    const btnCancelar = document.getElementById('btnCancelarEdicaoReceita');
    btnCancelar.style.display = 'inline-flex';
    btnSalvar.textContent = '💾 Salvar Alterações';
    btnSalvar.style.gridColumn = '2 / span 2'; 
    
    document.getElementById('receitaTitulo').focus();
}

async function adicionarOuEditarReceita(e) {
    e.preventDefault();

    const titulo = document.getElementById('receitaTitulo').value;
    const rendimento = parseInt(document.getElementById('receitaRendimento').value);

    if (!titulo || isNaN(rendimento) || rendimento <= 0) {
        return mostrarAlerta('Título e Rendimento válido são obrigatórios.', 'warning');
    }

    const ingredientesDaReceita = [];
    let custoTotalReceita = 0;
    const rows = document.querySelectorAll('#receitaIngredientesTbody tr');
    
    if (rows.length === 0) {
        return mostrarAlerta('Adicione pelo menos um ingrediente à receita.', 'warning');
    }

    rows.forEach(row => {
        ingredientesDaReceita.push({
            ingredienteId: row.dataset.ingredienteId,
            quantidade: parseFloat(row.dataset.quantidade),
            unidadeUso: row.dataset.unidadeUso,
            custo: parseFloat(row.dataset.custo)
        });
        custoTotalReceita += parseFloat(row.dataset.custo);
    });

    const dadosReceita = {
        titulo: titulo,
        rendimento: rendimento,
        ingredientes: ingredientesDaReceita,
        custoTotal: custoTotalReceita,
        custoPorUnidade: custoTotalReceita / rendimento
    };

    mostrarLoading(true);

    if (editState.receitaId) { 
        await FirebaseService.atualizar('receitas', editState.receitaId, dadosReceita);
        await FirebaseService.salvar('atividades', { tipo: 'edicao', descricao: `Receita atualizada: ${dadosReceita.titulo}`, usuarioNome: usuarioAtual.nome });
        mostrarAlerta('Receita atualizada com sucesso!', 'success');
    } else {
        await FirebaseService.salvar('receitas', dadosReceita);
        mostrarAlerta('Receita salva com sucesso!', 'success');
    }
    
    editState.receitaId = null;
    document.getElementById('receitaForm').reset();
    document.getElementById('receitaIngredientesTbody').innerHTML = '';
    atualizarCustoTotalReceita();

    // Correção: Usando os IDs dos botões
    const btnSalvar = document.getElementById('btnSalvarReceita');
    const btnCancelar = document.getElementById('btnCancelarEdicaoReceita');

    btnCancelar.style.display = 'none';
    btnSalvar.textContent = '💾 Salvar Receita';
    btnSalvar.style.gridColumn = '3';

    await carregarTodosDados(); 
    renderizarTudo(); 
    mostrarLoading(false);
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
// Função para atualizar o custo do produto com base na receita selecionada
function atualizarCustoProdutoComReceita() {
    const receitaId = document.getElementById('produtoReceitaSelect').value;
    const custoInput = document.getElementById('produtoCustoMaterial');

    // Se uma receita foi selecionada...
    if (receitaId) {
        // Encontra a receita completa no nosso array de receitas
        const receitaSelecionada = receitas.find(r => r.id === receitaId);
        if (receitaSelecionada) {
            // Preenche o campo de custo com o valor calculado (custo/unidade)
            custoInput.value = receitaSelecionada.custoPorUnidade.toFixed(2);
            // Bloqueia o campo para evitar edição manual
            custoInput.readOnly = true;
            custoInput.style.background = '#f8f9fa'; // Adiciona um feedback visual
        }
    } 
    // Se a opção "Cadastrar sem receita" for selecionada...
    else {
        // Limpa o campo de custo
        custoInput.value = '';
        // Libera o campo para edição manual
        custoInput.readOnly = false;
        custoInput.style.background = '#fff';
        custoInput.placeholder = 'Digite o custo manual';
    }

    // Após alterar o custo, recalcula o preço final do produto
    calcularPrecoVenda();
}

function configurarEventListeners() {
    configurarThemeToggle();
    // Função auxiliar para evitar repetição
    const safeAddEventListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Elemento com id '${id}' não foi encontrado.`);
        }
    };
    const subTabButtons = document.querySelectorAll('.sub-tab-button');
    subTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove a classe 'active' de todos os botões e painéis
            subTabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.sub-panel').forEach(panel => panel.classList.remove('active'));

            // Adiciona a classe 'active' ao botão clicado e ao painel correspondente
            button.classList.add('active');
            const targetPanelId = button.getAttribute('data-target');
            document.getElementById(targetPanelId).classList.add('active');
        });
    });

    // --- Formulários ---
    safeAddEventListener('vendaForm', 'submit', adicionarVenda);
    safeAddEventListener('produtoForm', 'submit', adicionarOuEditarProduto);
    safeAddEventListener('clienteForm', 'submit', adicionarOuEditarCliente);
    safeAddEventListener('despesaForm', 'submit', adicionarDespesa);
    safeAddEventListener('ingredienteForm', 'submit', adicionarOuEditarIngrediente);
    safeAddEventListener('receitaForm', 'submit', adicionarOuEditarReceita);
    safeAddEventListener('materialForm', 'submit', adicionarOuEditarMaterial);
    safeAddEventListener('btnAddReceitaAoProduto', 'click', adicionarReceitaAoProduto);
    safeAddEventListener('btnAddMaterialAoProduto', 'click', adicionarMaterialAoProduto);
    safeAddEventListener('produtoCustoMaoObra', 'input', calcularPrecoVenda);
    safeAddEventListener('produtoCustosInvisiveis', 'input', calcularPrecoVenda);
    safeAddEventListener('produtoMargem', 'input', calcularPrecoVenda);
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
    safeAddEventListener('searchVendas', 'input', () => {
        setPage('vendas', 1);
        renderizarTabelaVendas();
    });
    safeAddEventListener('filtroVendasStatus', 'change', () => {
        setPage('vendas', 1);
        renderizarTabelaVendas();
    });
    safeAddEventListener('searchDespesas', 'input', () => {
        setPage('despesas', 1);
        renderizarTabelaDespesas();
    });
    safeAddEventListener('filtroDespesas', 'change', () => {
        setPage('despesas', 1);
        renderizarTabelaDespesas();
    });
    
    
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
    
    safeAddEventListener('btnAddIngredienteNaReceita', 'click', adicionarIngredienteNaReceita);
    safeAddEventListener('produtoReceitaSelect', 'change', atualizarCustoProdutoComReceita);
    safeAddEventListener('receitaIngredienteSelect', 'change', atualizarUnidadeReceita);
    safeAddEventListener('btnCancelarEdicaoReceita', 'click', cancelarEdicaoReceita);
}
// Substitua esta função em main.js
function cancelarEdicaoReceita() {
    editState.receitaId = null;
    document.getElementById('receitaForm').reset();
    document.getElementById('receitaIngredientesTbody').innerHTML = '';
    atualizarCustoTotalReceita();

    // Lógica dos botões ATUALIZADA para restaurar o estado inicial
    const btnSalvar = document.getElementById('btnSalvarReceita');
    const btnCancelar = document.getElementById('btnCancelarEdicaoReceita');

    btnCancelar.style.display = 'none'; // Esconde o botão Cancelar
    btnSalvar.textContent = '💾 Salvar Receita';
    btnSalvar.style.gridColumn = '1 / -1'; // Faz o botão Salvar ocupar as 2 colunas
}
function configurarThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Função para aplicar o tema salvo
    const aplicarTemaSalvo = () => {
        const temaSalvo = localStorage.getItem('theme');
        if (temaSalvo === 'dark') {
            body.classList.add('dark-mode');
            toggle.checked = true;
        } else {
            body.classList.remove('dark-mode');
            toggle.checked = false;
        }
    };

    // Aplica o tema salvo assim que a página carrega
    aplicarTemaSalvo();

    // Adiciona o listener para a troca de tema
    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });
}

// === LÓGICA DAS ABAS ===
function openTab(evt, tabName) {
    // Reseta para a primeira página sempre que uma nova aba é aberta.
    Object.keys(pagination).forEach((key) => {
        pagination[key] = 1;
    });

    // --- INÍCIO DA CORREÇÃO ---
    // Reseta a variável de edição e a aparência dos formulários.
    // Isso garante que o sistema saia de qualquer "modo de edição" pendente.
    editState.materialId = null;
    editState.receitaId = null;
    editState.clienteId = null;
    editState.produtoId = null;
    editState.ingredienteId = null;
    
    // Reseta o texto dos botões para o estado de "Adicionar"
    const clienteBtn = document.querySelector('#clienteForm button[type="submit"]');
    if (clienteBtn) clienteBtn.textContent = '➕ Salvar Cliente';

    const produtoBtn = document.querySelector('#produtoForm button[type="submit"]');
    if (produtoBtn) produtoBtn.textContent = '➕ Salvar Produto';

    const ingredienteBtn = document.querySelector('#ingredienteForm button[type="submit"]');
    if (ingredienteBtn) ingredienteBtn.textContent = '➕ Salvar Ingrediente';
    // --- FIM DA CORREÇÃO ---

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
function renderizarTabelaVendas() {
    const tbody = document.getElementById('vendasTableBody');
    const search = document.getElementById('searchVendas').value.toLowerCase();
    const statusFiltro = document.getElementById('filtroVendasStatus').value; 

    let vendasFiltradas = vendas.filter(v => {
        const matchSearch = v.pessoa?.toLowerCase().includes(search) || v.produto?.toLowerCase().includes(search);
        const matchStatus = statusFiltro === '' || v.status === statusFiltro;
        return matchSearch && matchStatus;
    });

    vendasFiltradas.sort((a, b) => new Date(b.data) - new Date(a.data));

    // --- INÍCIO DA CORREÇÃO ---
    // Adicionamos a lógica para "fatiar" o array com base na página atual.
    const currentPage = getPage('vendas');
    const startIndex = (getPage('produtos') - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const vendasPaginadas = vendasFiltradas.slice(startIndex, endIndex);
    // --- FIM DA CORREÇÃO ---

    // Agora, o .map() itera sobre o array já paginado, e não mais sobre a lista completa.
    tbody.innerHTML = vendasPaginadas.map(v => `
        <tr>
            <td>${formatarData(v.data)}</td>
            <td>${escHtml(v.pessoa)}</td>
            <td>${escHtml(v.produto)}</td>
            <td>${v.quantidade}</td>
            <td><strong>${formatarMoeda(v.valor * v.quantidade)}</strong></td>
            <td>${getStatusBadge(v.status)}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm requires-admin" onclick="editarStatusVenda('${v.id}')" title="Alterar Status">🔄</button>
                <button class="btn btn-danger btn-sm requires-admin" onclick="excluirVenda('${v.id}')" title="Excluir">🗑️</button>
            </td>
        </tr>
    `).join('');

    // A função que desenha os botões de página agora recebe a lista completa para calcular o total de páginas corretamente.
    renderizarControlesPaginacao(vendasFiltradas, 'paginacaoVendas', renderizarTabelaVendas, undefined, 'vendas');
}


// === RENDERIZAÇÃO GERAL ===
function renderizarTudo() {
    preencherSelects();
    renderizarTabelaVendas();
    renderizarTabelaClientes();
    renderizarTabelaProdutos();
    renderizarTabelaIngredientes();
    renderizarTabelaReceitas(); 
    renderizarTabelaMateriais();
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
    const receitaIngredienteSelect = document.getElementById('receitaIngredienteSelect');
    const produtoReceitaSelect = document.getElementById('produtoReceitaSelect');
    const produtoMaterialSelect = document.getElementById('produtoMaterialSelect'); // Adicionado

    const clientesOptions = clientes
        .sort((a,b) => a.nome.localeCompare(b.nome))
        .map(c => `<option value="${escHtml(c.nome)}">${escHtml(c.nome)}</option>`)
        .join('');
    const produtosOptions = produtos
        .sort((a,b) => a.nome.localeCompare(b.nome))
        .map(p => `<option value="${escHtml(p.nome)}">${escHtml(p.nome)}</option>`)
        .join('');
    
    if (receitaIngredienteSelect) {
        const ingredientesOptions = ingredientes
            .sort((a,b) => a.nome.localeCompare(b.nome))
            .map(ing => `<option value="${escHtml(ing.id)}">${escHtml(ing.nome)} (${formatarMoeda(ing.custoUnitarioPadrao)}/${escHtml(ing.unidadePadrao)})</option>`)
            .join('');
        receitaIngredienteSelect.innerHTML = `<option value="">Selecione...</option>${ingredientesOptions}`;
    }

    // --- INÍCIO DA CORREÇÃO ---
    // Lógica para popular a lista suspensa de receitas no formulário de produtos
    if (produtoReceitaSelect) {
        const receitasOptions = receitas
            .sort((a,b) => a.titulo.localeCompare(b.titulo))
            .map(rec => `<option value="${escHtml(rec.id)}">${escHtml(rec.titulo)}</option>`)
            .join('');
        produtoReceitaSelect.innerHTML = `<option value="">-- Cadastrar sem receita (custo manual) --</option>${receitasOptions}`;
    }
    if (produtoMaterialSelect) {
        const materiaisOptions = materiais
            .sort((a,b) => a.nome.localeCompare(b.nome))
            .map(mat => `<option value="${escHtml(mat.id)}">${escHtml(mat.nome)}</option>`)
            .join('');
        produtoMaterialSelect.innerHTML = `<option value="">-- Selecione um material --</option>${materiaisOptions}`;
    }

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

// Adicione estas 4 novas funções em main.js

// FUNÇÃO 1: Renderiza as listas de receitas e materiais do produto
function renderizarComposicaoProduto() {
    const listaReceitasDiv = document.getElementById('listaReceitasProduto');
    const listaMateriaisDiv = document.getElementById('listaMateriaisProduto');

    // Renderiza a lista de receitas adicionadas
    listaReceitasDiv.innerHTML = composicaoReceitas.map((rec, index) => `
        <div class="list-item">
            <span>${escHtml(rec.titulo)}</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removerItemDaComposicao('receita', ${index})">🗑️</button>
        </div>
    `).join('');

    // Renderiza a lista de materiais adicionados
    listaMateriaisDiv.innerHTML = materiaisUtilizados.map((mat, index) => `
        <div class="list-item">
            <span>${escHtml(mat.nome)}</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removerItemDaComposicao('material', ${index})">🗑️</button>
        </div>
    `).join('');
}

// FUNÇÃO 2: Chamada ao clicar no botão "Adicionar" de Receitas
function adicionarReceitaAoProduto() {
    const receitaId = document.getElementById('produtoReceitaSelect').value;
    if (!receitaId) return;

    // Impede adicionar a mesma receita duas vezes
    if (composicaoReceitas.some(r => r.id === receitaId)) {
        return mostrarAlerta('Esta receita já foi adicionada.', 'warning');
    }

    const receita = receitas.find(r => r.id === receitaId);
    if (receita) {
        composicaoReceitas.push(receita);
        renderizarComposicaoProduto();
        calcularCustoTotalProduto();
    }
}

// FUNÇÃO 3: Chamada ao clicar no botão "Adicionar" de Materiais
function adicionarMaterialAoProduto() {
    const materialId = document.getElementById('produtoMaterialSelect').value;
    if (!materialId) return;

    if (materiaisUtilizados.some(m => m.id === materialId)) {
        return mostrarAlerta('Este material já foi adicionado.', 'warning');
    }

    const material = materiais.find(m => m.id === materialId);
    if (material) {
        materiaisUtilizados.push(material);
        renderizarComposicaoProduto();
        calcularCustoTotalProduto();
    }
}

// FUNÇÃO 4: Remove um item de qualquer uma das listas
function removerItemDaComposicao(tipo, index) {
    if (tipo === 'receita') {
        composicaoReceitas.splice(index, 1);
    } else if (tipo === 'material') {
        materiaisUtilizados.splice(index, 1);
    }
    renderizarComposicaoProduto();
    calcularCustoTotalProduto();
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
        return mostrarAlerta('Nome do cliente é obrigatório', 'danger');
    }

    mostrarLoading(true);

    if (editState.clienteId) {
        await FirebaseService.atualizar('clientes', editState.clienteId, dados);
        await FirebaseService.salvar('atividades', { tipo: 'edicao', descricao: `Cliente atualizado: ${dados.nome}`, usuarioNome: usuarioAtual.nome });
        mostrarAlerta('Cliente atualizado com sucesso!', 'success');
    } else {
        if (clientes.some(c => c.nome === dados.nome)) {
            mostrarLoading(false);
            return mostrarAlerta('Cliente com este nome já cadastrado', 'danger');
        }
        const newId = await FirebaseService.salvar('clientes', { ...dados, totalGasto: 0, ultimaCompra: null });
        if (newId) {
            await FirebaseService.salvar('atividades', { tipo: 'criacao', descricao: `Novo cliente cadastrado: ${dados.nome}`, usuarioNome: usuarioAtual.nome });
            mostrarAlerta('Cliente cadastrado com sucesso!', 'success');
        }
    }
    
    editState.clienteId = null;
    document.getElementById('clienteForm').reset();
    document.querySelector('#clienteForm button').textContent = '➕ Salvar Cliente';
    
    await carregarTodosDados();
    renderizarTudo();
    mostrarLoading(false);
}

function editarCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (cliente) {
        // 1. NAVEGA PARA A TELA CORRETA PRIMEIRO
        const cadastrosTabButton = document.querySelector('.tab-button[onclick*="cadastros"]');
        if (cadastrosTabButton) cadastrosTabButton.click();

        const clientesSubTabButton = document.querySelector('.sub-tab-button[data-target="panel-clientes"]');
        if (clientesSubTabButton) clientesSubTabButton.click();
        
        // 2. AGORA, DEPOIS DE NAVEGAR, DEFINE O ID DE EDIÇÃO
        editState.clienteId = id;

        // 3. Preenche o formulário
        document.getElementById('clienteNome').value = cliente.nome;
        document.getElementById('clienteContato').value = cliente.contato || '';
        document.getElementById('clienteEmail').value = cliente.email || '';
        document.getElementById('clienteEndereco').value = cliente.endereco || '';
        document.getElementById('clienteObservacoes').value = cliente.observacoes || '';
        document.querySelector('#clienteForm button').textContent = '💾 Salvar Alterações';
        document.getElementById('clienteNome').focus();
    }
}

// Substitua esta função em main.js
function excluirCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    // --- VALIDAÇÃO ADICIONADA ---
    // Verifica se o cliente está vinculado a vendas ou encomendas
    const vendasDoCliente = vendas.filter(v => v.pessoa === cliente.nome);
    const encomendasDoCliente = encomendas.filter(e => e.clienteNome === cliente.nome);

    if (vendasDoCliente.length > 0 || encomendasDoCliente.length > 0) {
        let erroMsg = `O cliente "${cliente.nome}" não pode ser excluído, pois possui `;
        if (vendasDoCliente.length > 0) erroMsg += `${vendasDoCliente.length} venda(s) registrada(s)`;
        if (vendasDoCliente.length > 0 && encomendasDoCliente.length > 0) erroMsg += ` e `;
        if (encomendasDoCliente.length > 0) erroMsg += `${encomendasDoCliente.length} encomenda(s) registrada(s)`;
        erroMsg += `.`;
        return mostrarAlerta(erroMsg, 'danger');
    }
    // --- FIM DA VALIDAÇÃO ---

    showConfirm(`Tem certeza que deseja excluir ${cliente.nome}? A exclusão não pode ser desfeita.`, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            const success = await FirebaseService.excluir('clientes', id);
            if (success) {
                await FirebaseService.salvar('atividades', { tipo: 'exclusao', descricao: `Cliente excluído: ${cliente.nome}`,usuarioNome: usuarioAtual.nome });
                mostrarAlerta('Cliente excluído com sucesso', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}

async function atualizarDadosCliente(nomeCliente, valorCompra, subtrair = false) {
    const clienteIndex = clientes.findIndex(c => c.nome === nomeCliente);
    if (clienteIndex === -1) return; // Se não encontrar o cliente, não faz nada

    const cliente = clientes[clienteIndex];

    // Calcula o novo total gasto
    const novoTotalGasto = subtrair 
        ? (cliente.totalGasto || 0) - valorCompra
        : (cliente.totalGasto || 0) + valorCompra;

    // Prepara os dados para atualizar no Firestore
    const novosDados = {
        totalGasto: novoTotalGasto
    };

    // Apenas atualiza a 'ultimaCompra' se for uma adição (não uma subtração)
    if (!subtrair) {
        novosDados.ultimaCompra = new Date().toISOString().split('T')[0];
    }
    
    // 1. Atualiza o banco de dados
    const success = await FirebaseService.atualizar('clientes', cliente.id, novosDados);

    // 2. Se a atualização no banco deu certo, atualiza também os dados em memória
    if (success) {
        clientes[clienteIndex] = { ...cliente, ...novosDados };
    }
}


function renderizarTabelaClientes() {
    const tbody = document.getElementById('clientesTableBody');
    const clientesOrdenados = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome));

    // --- CORREÇÃO APLICADA ---
    const TabelaClientesRowsPerPage = 5; // Limite específico para esta tabela
    const startIndex = (getPage('clientes') - 1) * TabelaClientesRowsPerPage;
    const endIndex = startIndex + TabelaClientesRowsPerPage;
    const clientesPaginados = clientesOrdenados.slice(startIndex, endIndex);
    // --- FIM DA CORREÇÃO ---

    tbody.innerHTML = clientesPaginados.map(c => {
        const ultimaCompra = c.ultimaCompra ? formatarData(c.ultimaCompra) : 'Nunca';
        const totalGasto = c.totalGasto || 0;
        
        return `
            <tr>
                <td><strong>${escHtml(c.nome)}</strong></td>
                <td>${escHtml(c.contato || 'N/A')}</td>
                <td>${ultimaCompra}</td>
                <td><strong>${formatarMoeda(totalGasto)}</strong></td>
                <td class="actions">
                    <button class="btn btn-primary btn-sm requires-admin" onclick="editarCliente('${c.id}')" title="Editar">✏️</button>
                    <button class="btn btn-danger btn-sm requires-admin" onclick="excluirCliente('${c.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    // Agora passamos o limite de 5 para a função de paginação.
    renderizarControlesPaginacao(clientesOrdenados, 'paginacaoClientes', renderizarTabelaClientes, TabelaClientesRowsPerPage, 'clientes');
}


// === LÓGICA DE PRODUTOS ===
function calcularCustoTotalProduto() {
    // 1. Soma o custo unitário de todas as receitas na composição
    const custoTotalReceitas = composicaoReceitas.reduce((acc, rec) => acc + (rec.custoPorUnidade || 0), 0);
    
    // 2. Soma o custo de todos os materiais utilizados
    const custoTotalMateriais = materiaisUtilizados.reduce((acc, mat) => acc + (mat.custo || 0), 0);

    // 3. O Custo Base agora é APENAS a soma dos componentes
    const custoBase = custoTotalReceitas + custoTotalMateriais;

    // 4. Atualiza o campo "Custo Base" no formulário
    const custoInput = document.getElementById('produtoCustoMaterial');
    custoInput.value = custoBase.toFixed(2);

    // Permite edição manual apenas se não houver componentes
    custoInput.readOnly = (composicaoReceitas.length > 0 || materiaisUtilizados.length > 0);

    // 5. Chama a função de calcular o preço de venda para finalizar a cadeia de cálculo
    calcularPrecoVenda();
}
function calcularPrecoVenda() {
    const custoBase = parseFloat(document.getElementById('produtoCustoMaterial').value) || 0;
    const custoMaoObra = parseFloat(document.getElementById('produtoCustoMaoObra').value) || 0;
    const percentualCustosInvisiveis = parseFloat(document.getElementById('produtoCustosInvisiveis').value) || 0;
    const margem = parseFloat(document.getElementById('produtoMargem').value) || 0;

    // 1. Calcula o subtotal (custos diretos + mão de obra)
    const subtotalCustos = custoBase + custoMaoObra;

    // 2. Calcula o valor dos custos invisíveis com base no subtotal
    const valorCustosInvisiveis = subtotalCustos * (percentualCustosInvisiveis / 100);

    // 3. Calcula o custo total final antes da margem de lucro
    const custoTotalFinal = subtotalCustos + valorCustosInvisiveis;

    // 4. Aplica a margem de lucro para obter o preço de venda
    const precoVenda = custoTotalFinal * (1 + margem / 100);

    document.getElementById('produtoValor').value = precoVenda.toFixed(2);
}

async function adicionarOuEditarProduto(e) {
    e.preventDefault();

    // 1. Coleta os dados básicos do formulário
    const dadosProduto = {
        nome: document.getElementById('produtoNome').value.trim().toUpperCase(),
        categoria: document.getElementById('produtoCategoria').value,
        tempoPreparo: parseInt(document.getElementById('produtoTempoPreparo').value) || 0,
        custoMaoObra: parseFloat(document.getElementById('produtoCustoMaoObra').value) || 0,
        custosInvisiveis: parseFloat(document.getElementById('produtoCustosInvisiveis').value) || 0,
        margem: parseFloat(document.getElementById('produtoMargem').value) || 100,
        // Os custos e o preço final são pegos diretamente do que foi calculado na tela
        custoMaterial: parseFloat(document.getElementById('produtoCustoMaterial').value) || 0,
        valor: parseFloat(document.getElementById('produtoValor').value) || 0,
    };

    if (!dadosProduto.nome) {
        return mostrarAlerta('O nome do produto é obrigatório.', 'danger');
    }

    // 2. Coleta os dados das novas listas de composição
    // Mapeamos para salvar apenas a informação essencial (ID e nome/título)
    dadosProduto.composicaoReceitas = composicaoReceitas.map(r => ({ id: r.id, titulo: r.titulo }));
    dadosProduto.materiaisUtilizados = materiaisUtilizados.map(m => ({ id: m.id, nome: m.nome }));

    mostrarLoading(true);

    if (editState.produtoId) {
        // MODO EDIÇÃO: Atualiza o produto existente (Esta parte já está correta)
        await FirebaseService.atualizar('produtos', editState.produtoId, dadosProduto);
        await FirebaseService.salvar('atividades', { tipo: 'edicao', descricao: `Produto atualizado: ${dadosProduto.nome}`, usuarioNome: usuarioAtual.nome });
        mostrarAlerta('Produto atualizado com sucesso!', 'success');
    } else {
        // MODO ADIÇÃO: Salva um novo produto
        if (produtos.some(p => p.nome === dadosProduto.nome)) {
            mostrarLoading(false);
            return mostrarAlerta('Produto com este nome já cadastrado.', 'danger');
        }
        
        // --- MELHORIA APLICADA AQUI ---
        const newId = await FirebaseService.salvar('produtos', dadosProduto);
        if (newId) { // Garante que o produto foi salvo antes de registrar a atividade
            // Adiciona o log de criação ao histórico
            await FirebaseService.salvar('atividades', { tipo: 'criacao', descricao: `Novo produto cadastrado: ${dadosProduto.nome}`, usuarioNome: usuarioAtual.nome });
            mostrarAlerta('Produto cadastrado com sucesso!', 'success');
        }
        // --- FIM DA MELHORIA ---
    }

    // 3. Limpa tudo para o próximo cadastro
    editState.produtoId = null;
    composicaoReceitas = [];
    materiaisUtilizados = [];
    document.getElementById('produtoForm').reset(); // Limpa os campos do formulário
    renderizarComposicaoProduto(); // Limpa as listas visuais
    document.querySelector('#produtoForm button[type="submit"]').textContent = '➕ Salvar Produto';
    
    await carregarTodosDados();
    renderizarTudo();
    mostrarLoading(false);
}  

// Substitua esta função em main.js
function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    // 1. Navega para a tela correta
    const cadastrosTabButton = document.querySelector('.tab-button[onclick*="cadastros"]');
    if (cadastrosTabButton) cadastrosTabButton.click();
    const produtosSubTabButton = document.querySelector('.sub-tab-button[data-target="panel-produtos"]');
    if (produtosSubTabButton) produtosSubTabButton.click();

    // 2. Define o modo de edição
    editState.produtoId = id;

    // 3. Limpa os estados temporários e preenche o formulário básico
    composicaoReceitas = [];
    materiaisUtilizados = [];
    document.getElementById('produtoForm').reset();
    document.getElementById('produtoNome').value = produto.nome;
    document.getElementById('produtoCategoria').value = produto.categoria;
    document.getElementById('produtoTempoPreparo').value = produto.tempoPreparo || 0;
    document.getElementById('produtoCustoMaoObra').value = produto.custoMaoObra || 0;
    document.getElementById('produtoCustosInvisiveis').value = produto.custosInvisiveis || 0;
    document.getElementById('produtoMargem').value = produto.margem || 100;
    
    // 4. Carrega a composição de receitas e materiais do produto (se existirem)
    if (produto.composicaoReceitas) {
        // Recria a lista temporária a partir dos dados salvos
        composicaoReceitas = produto.composicaoReceitas.map(recSalva => {
            return receitas.find(r => r.id === recSalva.id);
        }).filter(r => r); // Filtra caso alguma receita tenha sido deletada
    }
    if (produto.materiaisUtilizados) {
        materiaisUtilizados = produto.materiaisUtilizados.map(matSalvo => {
            return materiais.find(m => m.id === matSalvo.id);
        }).filter(m => m); // Filtra caso algum material tenha sido deletado
    }

    // 5. Renderiza as listas e recalcula todos os custos
    renderizarComposicaoProduto();
    calcularCustoTotalProduto();
    
    // 6. Ajusta o botão e foca no campo principal
    document.querySelector('#produtoForm button[type="submit"]').textContent = '💾 Salvar Alterações';
    document.getElementById('produtoNome').focus();
}

function excluirProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    
    showConfirm(`Tem certeza que deseja excluir o produto ${produto.nome}?`, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            const success = await FirebaseService.excluir('produtos', id);
            if (success) {
                await FirebaseService.salvar('atividades', { tipo: 'exclusao', descricao: `Produto excluído: ${produto.nome}`, usuarioNome: usuarioAtual.nome });
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
    
    // Criamos uma cópia ordenada para garantir a consistência entre as páginas
    const produtosOrdenados = [...produtos].sort((a,b) => a.nome.localeCompare(b.nome));

    // --- LÓGICA DE PAGINAÇÃO APLICADA ---
    const startIndex = (getPage('despesas') - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const produtosPaginados = produtosOrdenados.slice(startIndex, endIndex);

    tbody.innerHTML = produtosPaginados.map(p => {
        const custoTotal = (p.custoMaterial || 0) + (p.custoMaoObra || 0);
        const margemReal = custoTotal > 0 ? ((p.valor - custoTotal) / custoTotal * 100) : 0;
        
        return `
            <tr>
                <td><strong>${escHtml(p.nome)}</strong></td>
                <td>${escHtml(p.categoria)}</td>
                <td>${formatarMoeda(custoTotal)}</td>
                <td><strong>${formatarMoeda(p.valor)}</strong></td>
                <td>
                    <span class="badge ${margemReal >= 100 ? 'badge-success' : margemReal >= 50 ? 'badge-warning' : 'badge-danger'}">
                        ${margemReal.toFixed(1)}%
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-primary btn-sm requires-admin" onclick="editarProduto('${p.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm requires-admin" onclick="excluirProduto('${p.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    // Adicionamos a chamada para criar os botões de paginação.
    renderizarControlesPaginacao(produtosOrdenados, 'paginacaoProdutos', renderizarTabelaProdutos, undefined, 'produtos');
}
// === LÓGICA DE INGREDIENTES ===

function renderizarTabelaIngredientes() {
    const tbody = document.getElementById('ingredientesTableBody');
    if (!tbody) return;

    // Ordena os ingredientes por nome
    const ingredientesOrdenados = [...ingredientes].sort((a, b) => a.nome.localeCompare(b.nome));

    tbody.innerHTML = ingredientesOrdenados.map(ing => `
        <tr>
            <td><strong>${escHtml(ing.nome)}</strong></td>
            <td>${escHtml(ing.unidadeCompra)} por ${formatarMoeda(ing.precoCompra)}</td>
            <td><strong>${formatarMoeda(ing.custoUnitarioPadrao)} / ${escHtml(ing.unidadePadrao)}</strong></td>
            <td class="actions">
                <button class="btn btn-primary btn-sm requires-admin" onclick="editarIngrediente('${ing.id}')" title="Editar">✏️</button>
                <button class="btn btn-danger btn-sm requires-admin" onclick="excluirIngrediente('${ing.id}')" title="Excluir">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function adicionarOuEditarIngrediente(e) {
    e.preventDefault();
    const form = document.getElementById('ingredienteForm');

    const precoCompra = parseFloat(document.getElementById('ingredientePrecoCompra').value) || 0;
    const tamanhoCompra = parseFloat(document.getElementById('ingredienteTamanhoCompra').value) || 0;

    if (tamanhoCompra <= 0) {
        return mostrarAlerta('A "Quantidade na Unidade Base" deve ser maior que zero.', 'danger');
    }

    const dados = {
        nome: document.getElementById('ingredienteNome').value.trim(),
        unidadeCompra: document.getElementById('ingredienteUnidadeCompra').value.trim(),
        precoCompra: precoCompra,
        tamanhoCompra: tamanhoCompra,
        unidadePadrao: document.getElementById('ingredienteUnidadePadrao').value,
        // O cálculo central do custo unitário
        custoUnitarioPadrao: precoCompra / tamanhoCompra
    };

    if (!dados.nome) {
        return mostrarAlerta('O nome do ingrediente é obrigatório.', 'danger');
    }

    mostrarLoading(true);

    if (editState.ingredienteId) {
        // MODO EDIÇÃO
        const success = await FirebaseService.atualizar('ingredientes', editState.ingredienteId, dados);
        if (success) {
            const index = ingredientes.findIndex(i => i.id === editState.ingredienteId);
            if (index > -1) {
                ingredientes[index] = { ...ingredientes[index], ...dados };
            }
            await FirebaseService.salvar('atividades', { tipo: 'edicao', descricao: `Ingrediente atualizado: ${dados.nome}`, usuarioNome: usuarioAtual.nome });
            mostrarAlerta('Ingrediente atualizado com sucesso!', 'success');
        }
    } else {
        // MODO ADIÇÃO
        const newId = await FirebaseService.salvar('ingredientes', dados);
        if (newId) {
            ingredientes.push({ ...dados, id: newId });
            mostrarAlerta('Ingrediente cadastrado com sucesso!', 'success');
        }
    }

    editState.ingredienteId = null;
    form.reset();
    document.querySelector('#ingredienteForm button').textContent = '➕ Salvar Ingrediente';
    renderizarTudo();
    mostrarLoading(false);
}

function editarIngrediente(id) {
    const ingrediente = ingredientes.find(i => i.id === id);
    if (ingrediente) {
        // 1. Navega para a aba principal "Cadastros"
        document.querySelector('.tab-button[onclick*="cadastros"]').click();
        
        // 2. Em seguida, ativa a sub-aba "Ingredientes"
        document.querySelector('.sub-tab-button[data-target="panel-ingredientes"]').click();

        // 3. Define o ID de edição APÓS a navegação
        editState.ingredienteId = id;

        // 4. Preenche o formulário
        document.getElementById('ingredienteNome').value = ingrediente.nome;
        document.getElementById('ingredienteUnidadeCompra').value = ingrediente.unidadeCompra;
        // ... (resto do preenchimento do formulário)

        document.querySelector('#ingredienteForm button').textContent = '💾 Salvar Alterações';
        document.getElementById('ingredienteNome').focus();
    }
}

function excluirIngrediente(id) {
    const ingrediente = ingredientes.find(i => i.id === id);
    if (!ingrediente) return;

    // --- VALIDAÇÃO ADICIONADA ---
    // Verifica se o ingrediente está em alguma receita
    const receitasComIngrediente = receitas.filter(r => r.ingredientes && r.ingredientes.some(i => i.ingredienteId === id));

    if (receitasComIngrediente.length > 0) {
        const nomesReceitas = receitasComIngrediente.map(r => r.titulo).join(', ');
        return mostrarAlerta(`O ingrediente "${ingrediente.nome}" não pode ser excluído. Ele está em uso na(s) seguinte(s) receita(s): ${nomesReceitas}.`, 'danger');
    }
    // --- FIM DA VALIDAÇÃO ---

    showConfirm(`Tem certeza que deseja excluir o ingrediente "${ingrediente.nome}"?`, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            const success = await FirebaseService.excluir('ingredientes', id);
            if (success) {
                mostrarAlerta('Ingrediente excluído com sucesso!', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}
// === LÓGICA DE RECEITAS ===






// Substitua esta função em main.js
function adicionarIngredienteNaReceita(e) {
    e.preventDefault();
    const ingredienteId = document.getElementById('receitaIngredienteSelect').value;
    const quantidade = parseFloat(document.getElementById('receitaIngredienteQtd').value);
    const unidadeUso = document.getElementById('receitaIngredienteUnidade').value;

    if (!ingredienteId || isNaN(quantidade) || quantidade <= 0) {
        return mostrarAlerta('Selecione um ingrediente e informe uma quantidade válida.', 'warning');
    }

    const ingrediente = ingredientes.find(i => i.id === ingredienteId);
    if (ingrediente.unidadePadrao !== unidadeUso) {
        return mostrarAlerta(`Unidade inválida! A unidade base para "${ingrediente.nome}" é "${ingrediente.unidadePadrao}".`, 'danger');
    }

    adicionarLinhaIngredienteNaTabela(ingrediente, quantidade, unidadeUso);
    atualizarCustoTotalReceita();
    
    // --- CORREÇÃO AQUI ---
    // Limpa os campos manualmente, pois .reset() não funciona em <div>
    document.getElementById('receitaIngredienteSelect').value = "";
    document.getElementById('receitaIngredienteQtd').value = "";
    document.getElementById('receitaIngredienteUnidade').value = "ml"; // Valor padrão
}

// Função auxiliar para criar as linhas da tabela no modal
function adicionarLinhaIngredienteNaTabela(ingrediente, quantidade, unidadeUso) {
    const tbody = document.getElementById('receitaIngredientesTbody');
    const custoItem = ingrediente.custoUnitarioPadrao * quantidade;

    const row = document.createElement('tr');
    // Armazena os dados nos atributos da linha para fácil recuperação ao salvar
    row.dataset.ingredienteId = ingrediente.id;
    row.dataset.quantidade = quantidade;
    row.dataset.unidadeUso = unidadeUso;
    row.dataset.custo = custoItem;

    row.innerHTML = `
        <td>${ingrediente.nome}</td>
        <td>${quantidade} ${unidadeUso}</td>
        <td>${formatarMoeda(custoItem)}</td>
        <td class="actions">
            <button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove(); atualizarCustoTotalReceita();">🗑️</button>
        </td>
    `;
    tbody.appendChild(row);
}

// Recalcula e exibe o custo total dos materiais no modal
function atualizarCustoTotalReceita() {
    const tbody = document.getElementById('receitaIngredientesTbody');
    const rows = tbody.querySelectorAll('tr');
    let custoTotal = 0;
    rows.forEach(row => {
        custoTotal += parseFloat(row.dataset.custo) || 0;
    });
    document.getElementById('receitaCustoTotal').textContent = formatarMoeda(custoTotal);
}


function atualizarUnidadeReceita() {
    const ingredienteId = document.getElementById('receitaIngredienteSelect').value;
    const unidadeSelect = document.getElementById('receitaIngredienteUnidade');
    
    // Se um ingrediente foi selecionado...
    if (ingredienteId) {
        const ingrediente = ingredientes.find(i => i.id === ingredienteId);
        if (ingrediente) {
            // Define o valor do campo para a unidade padrão do ingrediente...
            unidadeSelect.value = ingrediente.unidadePadrao;
            // E desabilita o campo para evitar seleção errada.
            unidadeSelect.disabled = true;
        }
    } else {
        // Se nenhum ingrediente estiver selecionado, reseta e habilita o campo.
        unidadeSelect.value = 'ml'; // Volta para o valor padrão
        unidadeSelect.disabled = false;
    }
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
    const vendaForm = document.getElementById('vendaForm');
    const venda = {
        data: document.getElementById('data').value,
        pessoa: document.getElementById('pessoa').value,
        produto: document.getElementById('produto').value,
        quantidade: parseInt(document.getElementById('quantidade').value),
        valor: parseFloat(document.getElementById('valor').value),
        pagamento: document.getElementById('pagamento').value,
        status: document.getElementById('status').value
    };

    if (!venda.pessoa || !venda.produto || isNaN(venda.valor) || venda.valor <= 0) {
        return mostrarAlerta('Cliente, produto e valor são obrigatórios.', 'warning');
    }

    mostrarLoading(true);
    const newId = await FirebaseService.salvar('vendas', venda);
    
    if (newId) {
        // --- INÍCIO DA CORREÇÃO ---
        // 1. Adiciona o ID retornado pelo Firestore ao objeto da venda
        const novaVendaCompleta = { ...venda, id: newId };
        
        // 2. Atualiza o array local de vendas, evitando uma nova leitura do banco.
        vendas.push(novaVendaCompleta);
        
        await atualizarDadosCliente(venda.pessoa, venda.valor * venda.quantidade);
        
        const novaAtividade = { 
            tipo: 'venda', 
            descricao: `Venda registrada: ${venda.quantidade}x ${venda.produto} para ${venda.pessoa}`, 
            usuarioNome: usuarioAtual.nome,
            criadoEm: new Date() // Adiciona data para ordenação imediata
        };
        // Salva a atividade e também a adiciona ao estado local.
        await FirebaseService.salvar('atividades', novaAtividade);
        atividades.push(novaAtividade);
        
        mostrarAlerta('Venda registrada com sucesso!', 'success');
        vendaForm.reset();
        document.getElementById('data').valueAsDate = new Date();
        
        // 3. Em vez de recarregar TUDO, apenas renderiza novamente a UI com os dados locais já atualizados.
        renderizarTudo();
        // --- FIM DA CORREÇÃO ---
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

async function excluirVenda(id) {
    const vendaIndex = vendas.findIndex(v => v.id === id);
    if (vendaIndex === -1) return mostrarAlerta('Venda não encontrada para exclusão.', 'danger');

    const vendaParaExcluir = vendas[vendaIndex];

    showConfirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.', async (confirmado) => {
        if (!confirmado) return;

        mostrarLoading(true);
        const success = await FirebaseService.excluir('vendas', id);

        if (success) {
            // 1. Remove a venda do estado local ANTES de qualquer recálculo
            vendas.splice(vendaIndex, 1);

            // 2. Atualiza o cliente correspondente
            const clienteIndex = clientes.findIndex(c => c.nome === vendaParaExcluir.pessoa);
            if (clienteIndex > -1) {
                const cliente = clientes[clienteIndex];
                const valorVenda = vendaParaExcluir.valor * vendaParaExcluir.quantidade;
                
                // Subtrai o valor gasto
                const novoTotalGasto = (cliente.totalGasto || 0) - valorVenda;

                // Recalcula a data da última compra com base nas vendas restantes
                const vendasRestantes = vendas.filter(v => v.pessoa === cliente.nome);
                let novaUltimaCompra = null;
                if (vendasRestantes.length > 0) {
                    vendasRestantes.sort((a, b) => new Date(b.data) - new Date(a.data));
                    novaUltimaCompra = vendasRestantes[0].data;
                }

                // Atualiza o cliente no DB com ambos os campos de uma vez
                const dadosAtualizados = { totalGasto: novoTotalGasto, ultimaCompra: novaUltimaCompra };
                await FirebaseService.atualizar('clientes', cliente.id, dadosAtualizados);
                
                // Atualiza o cliente também no estado local
                clientes[clienteIndex] = { ...cliente, ...dadosAtualizados };
            }

            // Adiciona a atividade de exclusão
            const novaAtividade = { tipo: 'exclusao', descricao: `Venda excluída: ${vendaParaExcluir.quantidade}x ${vendaParaExcluir.produto} de ${vendaParaExcluir.pessoa}`, usuarioNome: usuarioAtual.nome, criadoEm: new Date() };
            await FirebaseService.salvar('atividades', novaAtividade);
            atividades.push(novaAtividade);

            mostrarAlerta('Venda excluída com sucesso!', 'success');
        }

        // Renderiza a UI com os dados locais já atualizados
        renderizarTudo();
        mostrarLoading(false);
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
    hoje.setHours(0, 0, 0, 0);

    const pendenciasGerais = [];

    // 1. Coleta vendas pendentes com mais detalhes
    vendas.filter(v => v.status === 'P').forEach(v => {
        pendenciasGerais.push({
            id: v.id,
            tipo: 'venda', // Identifica a origem da dívida
            clienteNome: v.pessoa,
            descricao: v.produto,
            data: v.data,
            valorPendente: v.valor * v.quantidade,
        });
    });

    // 2. Coleta encomendas pendentes com mais detalhes
    encomendas
        .filter(e => e.status !== 'Finalizado' && (e.valorTotal - (e.valorEntrada || 0)) > 0)
        .forEach(e => {
            pendenciasGerais.push({
                id: e.id,
                tipo: 'encomenda', // Identifica a origem da dívida
                clienteNome: e.clienteNome,
                descricao: e.produtoDescricao,
                data: e.dataEntrega,
                valorPendente: e.valorTotal - (e.valorEntrada || 0),
            });
        });
    
    // Ordena as pendências pela data, da mais antiga para a mais nova
    pendenciasGerais.sort((a,b) => new Date(a.data) - new Date(b.data));

    // 3. Monta a nova tabela com as informações detalhadas
    tbody.innerHTML = pendenciasGerais.map(item => {
        const dataVenc = new Date(item.data);
        const diasEmAtraso = Math.floor((hoje.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24));

        let statusAtraso = '';
        if (diasEmAtraso > 0) {
            statusAtraso = `<span class="badge badge-danger">${diasEmAtraso} dias de atraso</span>`;
        } else if (diasEmAtraso === 0) {
            statusAtraso = `<span class="badge badge-warning">Vence Hoje</span>`;
        } else {
            statusAtraso = `<span class="badge badge-info">A vencer</span>`;
        }

        return `
            <tr>
                <td><strong>${escHtml(item.clienteNome)}</strong></td>
                <td>${escHtml(item.descricao)}</td>
                <td>${formatarData(item.data)}</td>
                <td><strong style="color: var(--danger-color);">${formatarMoeda(item.valorPendente)}</strong></td>
                <td>${statusAtraso}</td>
                <td class="actions">
                    <button class="btn btn-success btn-sm requires-admin" 
                            onclick="marcarPendenciaComoPaga('${item.tipo}', '${item.id}')" 
                            title="Marcar como Pago">
                        ✅ Paga
                    </button>
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
        const statusFinal = novoStatus.toUpperCase();
        await FirebaseService.atualizar('vendas', id, { status: statusFinal });
        
        await FirebaseService.salvar('atividades', { 
            tipo: 'edicao', 
            descricao: `Status da venda de ${venda.produto} alterado para '${statusFinal}'`, 
            usuarioNome: usuarioAtual.nome 
        });

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
                <td>${escHtml(enc.clienteNome || '')}</td>
                <td>${escHtml(enc.produtoDescricao || '')}</td>
                <td>${formatarMoeda(valorTotal)}</td>
                <td>${formatarMoeda(valorEntrada)}</td>
                <td><strong>${formatarMoeda(valorRestante)}</strong></td>
                <td>${statusBadge}</td>
                 <td class="actions">
                    <button class="btn btn-primary btn-sm requires-admin" onclick="editarEncomenda('${enc.id}')" title="Editar">✏️</button>
                    <button class="btn btn-danger btn-sm requires-admin" onclick="excluirEncomenda('${enc.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}


// === LÓGICA DE DESPESAS ===
async function adicionarDespesa(e) {
    e.preventDefault();
    const despesaForm = document.getElementById('despesaForm');
    // ... (coleta dos dados da despesa) ...

    const despesa = {
        data: document.getElementById('despesaData').value,
        tipo: document.getElementById('despesaTipo').value,
        descricao: document.getElementById('despesaDescricao').value,
        quantidade: document.getElementById('despesaQuantidade').value,
        valor: (parseFloat(document.getElementById('despesaValor').value) || 0) * (parseFloat(document.getElementById('despesaQuantidade').value) || 1)
    };

    if (!isValidDateInput(despesa.data)) {
        return mostrarAlerta('Data da despesa inv?lida.', 'danger');
    }
    if (!despesa.data || !despesa.tipo || !despesa.descricao || isNaN(despesa.valor) || despesa.valor <= 0) {
        return mostrarAlerta('Preencha todos os campos obrigatórios da despesa com valores válidos.', 'danger');
    }

    mostrarLoading(true);
    const newId = await FirebaseService.salvar('despesas', despesa);
    if (newId) {
        await FirebaseService.salvar('atividades', { 
            tipo: 'despesa', 
            descricao: `Despesa: ${despesa.descricao} - ${formatarMoeda(despesa.valor)}`, 
            usuarioNome: usuarioAtual.nome 
        });
        
        mostrarAlerta('Despesa registrada com sucesso!', 'success');
        despesaForm.reset();
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
                const despesaExcluida = despesas.find(d => d.id === id);
await FirebaseService.salvar('atividades', { tipo: 'exclusao', descricao: `Despesa de ${formatarMoeda(despesaExcluida.valor)} excluída.` });
                mostrarAlerta('Despesa excluída!', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}

function getPage(key) {
    return pagination[key] || 1;
}

function setPage(key, value) {
    pagination[key] = value;
}

function renderizarControlesPaginacao(items, containerId, renderFunction, customRowsPerPage, pageKey) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // --- CORREÇÃO APLICADA ---
    // Usa o limite customizado se ele for fornecido; senão, usa a constante global.
    const pageSize = customRowsPerPage || rowsPerPage;
    const totalPages = Math.ceil(items.length / pageSize);
    // --- FIM DA CORREÇÃO ---
    
    const currentPage = getPage(pageKey);
    container.innerHTML = '';

    if (totalPages <= 1) return;

    // Botão "Anterior"
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo;';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            setPage(pageKey, currentPage - 1);
            renderFunction();
        }
    };
    container.appendChild(prevButton);

    // Botões de Página
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.onclick = () => {
            setPage(pageKey, i);
            renderFunction();
        };
        container.appendChild(pageButton);
    }

    // Botão "Próxima"
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&raquo;';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            setPage(pageKey, currentPage + 1);
            renderFunction();
        }
    };
    container.appendChild(nextButton);
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

    // --- LÓGICA DE PAGINAÇÃO APLICADA ---
    const startIndex = (getPage('despesas') - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const despesasPaginadas = despesasFiltradas.slice(startIndex, endIndex);

    tbody.innerHTML = despesasPaginadas.map(d => `
        <tr>
            <td>${formatarData(d.data)}</td>
            <td><span class="badge badge-info">${escHtml(d.tipo)}</span></td>
            <td>${escHtml(d.descricao)}</td>
            <td>${escHtml(d.quantidade || '-')}</td>
            <td><strong>${formatarMoeda(d.valor)}</strong></td>
            <td class="actions">
                <button class="btn btn-danger btn-sm requires-admin" onclick="excluirDespesa('${d.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');

    // Chamada para renderizar os controles de paginação
    renderizarControlesPaginacao(despesasFiltradas, 'paginacaoDespesas', renderizarTabelaDespesas, undefined, 'despesas');
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
async function marcarPendenciaComoPaga(tipo, id) {
    let item, confirmText;

    if (tipo === 'venda') {
        item = vendas.find(v => v.id === id);
    } else { // tipo === 'encomenda'
        item = encomendas.find(e => e.id === id);
    }

    if (!item) {
        return mostrarAlerta('Erro: Item pendente não encontrado.', 'danger');
    }

    if (tipo === 'venda') {
        confirmText = `Deseja marcar a venda do produto "${item.produto}" para ${item.pessoa} como paga?`;
    } else { // tipo === 'encomenda'
        confirmText = `Deseja finalizar a encomenda de "${item.produtoDescricao}" para ${item.clienteNome}?`;
    }

    showConfirm(confirmText, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            let success = false;
            if (tipo === 'venda') {
                success = await FirebaseService.atualizar('vendas', id, { status: 'A' });
            } else { // tipo === 'encomenda'
                success = await FirebaseService.atualizar('encomendas', id, { 
                    status: 'Finalizado',
                    valorEntrada: item.valorTotal 
                });
            }

            if (success) {
                mostrarAlerta('Pendência baixada com sucesso!', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}

// === DASHBOARDS E GRÁFICOS ===
// (As funções de cálculo e renderização de gráficos do seu código de exemplo podem ser coladas aqui, pois operam sobre as variáveis globais que já foram carregadas do Firebase)

// 3. FUNÇÃO DE DASHBOARD CORRIGIDA
function atualizarDashboardPrincipal() {
    console.log('=== ATUALIZANDO DASHBOARD ===');
    const filtro = criarFiltroData(anoFiltroSelecionado, mesFiltroSelecionado);

    const vendasMes = vendas.filter(filtro);
    const encomendasMes = encomendas.filter(filtro);
    const despesasMes = despesas.filter(filtro);

    // --- Cálculos financeiros DO MÊS ---
    const totalVendido = vendasMes.reduce((acc, v) => acc + (v.valor * v.quantidade), 0) + 
                       encomendasMes.reduce((acc, e) => acc + (e.valorTotal || 0), 0);
    
    const vendasPagasMes = vendasMes.filter(v => v.status === 'A' || v.status === 'E');
    const totalRecebidoMes = vendasPagasMes.reduce((acc, v) => acc + (v.valor * v.quantidade), 0) + 
                            encomendasMes.reduce((acc, e) => acc + (e.valorEntrada || 0), 0);

    const totalDespesas = despesasMes.reduce((acc, d) => acc + d.valor, 0);
    const lucroLiquido = totalRecebidoMes - totalDespesas;
    const margemLucro = totalRecebidoMes > 0 ? (lucroLiquido / totalRecebidoMes * 100) : 0;
    
    // --- Valores a receber (CÁLCULO CORRIGIDO PARA O MÊS) ---
    // CORREÇÃO: As linhas abaixo agora usam as listas já filtradas `vendasMes` e `encomendasMes`.
    const aReceberVendas = vendasMes.filter(v => v.status === 'P').reduce((acc, v) => acc + (v.valor * v.quantidade), 0);
    const aReceberEncomendas = encomendasMes.filter(e => e.status !== 'Finalizado').reduce((acc, e) => acc + ((e.valorTotal || 0) - (e.valorEntrada || 0)), 0);
    const totalAReceber = aReceberVendas + aReceberEncomendas;
    
    // O restante do cálculo que já era global permanece global
    const clientesComPendenciaGlobal = new Set([
        ...vendas.filter(v => v.status === 'P').map(v => v.pessoa),
        ...encomendas.filter(e => e.status !== 'Finalizado' && ((e.valorTotal || 0) - (e.valorEntrada || 0)) > 0).map(e => e.clienteNome)
    ]).size;

    // --- Atualiza a interface ---
    document.getElementById('dashTotalVendido').textContent = formatarMoeda(totalVendido);
    document.getElementById('vendidoChange').textContent = `${vendasMes.length + encomendasMes.length} pedidos no mês`;
    document.getElementById('dashTotalDespesas').textContent = formatarMoeda(totalDespesas);
    document.getElementById('despesasChange').textContent = `${despesasMes.length} lançamentos`;
    document.getElementById('dashLucroLiquido').textContent = formatarMoeda(lucroLiquido);
    document.getElementById('lucroChange').textContent = `Margem: ${margemLucro.toFixed(1)}%`;
    document.getElementById('dashAReceber').textContent = formatarMoeda(totalAReceber); // Agora mostra o valor do mês
    document.getElementById('receberCount').textContent = `${clientesComPendenciaGlobal} cliente(s) pendente(s) no total`; // Texto ajustado para clareza
    document.getElementById('dashValoresRecebidos').textContent = formatarMoeda(totalRecebidoMes);
    
    const numeroDeEntradas = encomendasMes.filter(e => (e.valorEntrada || 0) > 0).length;
    document.getElementById('recebidosChange').textContent = `${vendasPagasMes.length} vendas pagas + ${numeroDeEntradas} entradas`;

    // A lógica de pendências globais continua correta para o badge e resumo
    const pendenciasGerais = calcularPendenciasGerais();
    document.getElementById('totalPendente').textContent = formatarMoeda(pendenciasGerais.totalAReceber);
    document.getElementById('clientesPendentes').textContent = pendenciasGerais.clientesPendentes;
    
    const cobrancasBadge = document.getElementById('cobrancas-badge');
    if (cobrancasBadge) {
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

function abrirModalQuitarCliente() {
    // 1. Encontra todos os clientes que têm pelo menos uma pendência.
    const clientesComPendencia = [...new Set(
        vendas.filter(v => v.status === 'P').map(v => v.pessoa)
        .concat(
            encomendas.filter(e => e.status !== 'Finalizado' && (e.valorTotal - (e.valorEntrada || 0)) > 0)
                      .map(e => e.clienteNome)
        )
    )].sort();

    if (clientesComPendencia.length === 0) {
        return mostrarAlerta('Nenhum cliente com pendências encontrado.', 'info');
    }

    const clienteOptions = clientesComPendencia.map(nome => `<option value="${nome}">${nome}</option>`).join('');

    // 2. Cria e exibe um modal para o usuário escolher o cliente.
    const modal = document.getElementById('vendaRapidaModal'); // Reutilizando um modal
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>💰 Quitar Dívidas de Cliente</h3>
                <button class="close-btn" onclick="fecharModal('vendaRapidaModal')">&times;</button>
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="clienteParaQuitar">Selecione o cliente:</label>
                <select id="clienteParaQuitar">${clienteOptions}</select>
            </div>
            <button class="btn btn-success requires-admin" onclick="quitarTodasPendenciasCliente()" style="width: 100%; margin-top: 20px;">
                Confirmar Quitação
            </button>
        </div>
    `;
    modal.style.display = 'flex';
}

async function quitarTodasPendenciasCliente() {
    const clienteNome = document.getElementById('clienteParaQuitar')?.value;
    if (!clienteNome) return;

    // Esta lógica é a mesma da nossa função antiga de pagamento em massa.
    showConfirm(`Deseja marcar TODAS as pendências de ${clienteNome} como pagas?`, async (confirmado) => {
        if (confirmado) {
            mostrarLoading(true);
            const pendenciasVendas = vendas.filter(v => v.pessoa === clienteNome && v.status === 'P');
            const updatesVendas = pendenciasVendas.map(v => FirebaseService.atualizar('vendas', v.id, { status: 'A' }));

            const pendenciasEncomendas = encomendas.filter(e => e.clienteNome === clienteNome && e.status !== 'Finalizado');
            const updatesEncomendas = pendenciasEncomendas.map(e => FirebaseService.atualizar('encomendas', e.id, { status: 'Finalizado', valorEntrada: e.valorTotal }));

            await Promise.all([...updatesVendas, ...updatesEncomendas]);
            
            mostrarAlerta(`Todas as pendências de ${clienteNome} foram quitadas!`, 'success');
            
            fecharModal('vendaRapidaModal');
            await carregarTodosDados();
            renderizarTudo();
            mostrarLoading(false);
        }
    });
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
    // Procura em item.data (vendas) ou item.dataEntrega (encomendas)
    const dataInput = item.data || item.dataEntrega;
    if (!dataInput) return null;

    // Caso 1: string no formato AAAA-MM-DD
    if (typeof dataInput === 'string') {
        const partes = dataInput.split("-");
        if (partes.length !== 3) return null;

        const ano = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1; // ajusta para 0-11
        const dia = parseInt(partes[2], 10);
        if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null;
        return { ano, mes, dia };
    }

    // Caso 2: Timestamp do Firebase
    if (dataInput && typeof dataInput.toDate === 'function') {
        const data = dataInput.toDate();
        return { ano: data.getFullYear(), mes: data.getMonth(), dia: data.getDate() };
    }

    // Caso 3: objeto Date
    if (dataInput instanceof Date) {
        return { ano: dataInput.getFullYear(), mes: dataInput.getMonth(), dia: dataInput.getDate() };
    }

    return null;
}

function criarFiltroData(anoDesejado, mesDesejado) {
    return function(item) {
        const dataExtraida = extrairDataDoItem(item);
        
        if (!dataExtraida) {
            return false; // Ignora itens sem data válida
        }
        
        // --- INÍCIO DA ALTERAÇÃO ---
        const anoCorresponde = dataExtraida.ano === anoDesejado;

        // Se o mês selecionado for -1 (TODOS), retornamos verdadeiro se o ano corresponder.
        if (mesDesejado === -1) {
            return anoCorresponde;
        } 
        // Caso contrário, fazemos a verificação completa (ano e mês).
        else {
            const mesCorresponde = dataExtraida.mes === mesDesejado;
            return anoCorresponde && mesCorresponde;
        }
        // --- FIM DA ALTERAÇÃO ---
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
        dia.setDate(dia.getDate() - i);

        labels.push(dia.toLocaleDateString('pt-BR', { weekday: 'short' }));

        // --- INÍCIO DA CORREÇÃO ---

        const ano = dia.getFullYear();
        const mes = dia.getMonth();
        const diaDoMes = dia.getDate();

        // Filtra as vendas por data usando o parser centralizado
        const vendasDoDia = vendas.filter(venda => {
            const dataExtraida = extrairDataDoItem(venda);
            return dataExtraida &&
                dataExtraida.ano === ano &&
                dataExtraida.mes === mes &&
                dataExtraida.dia === diaDoMes;
        });

        // --- FIM DA CORREÇÃO ---

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

    const atividadesRecentes = atividades.sort((a, b) => {
        const dateA = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm);
        const dateB = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm);
        return dateB - dateA;
    }).slice(0, 5);

    if (atividadesRecentes.length === 0) {
        timelineDiv.innerHTML = `<div class="timeline-item"><div class="timeline-content">Nenhuma atividade recente.</div></div>`;
        return;
    }
    
    timelineDiv.innerHTML = atividadesRecentes.map(a => {
        const dataFormatada = formatarData(a.criadoEm); 
        const horaFormatada = a.criadoEm?.toDate ? a.criadoEm.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

        // --- ALTERAÇÃO AQUI ---
        // Adiciona o nome do usuário à exibição, com um fallback para registros antigos
        const infoUsuario = a.usuarioNome ? `por <strong>${escHtml(a.usuarioNome)}</strong>` : '';

        return `
            <div class="timeline-item">
                <div class="timeline-content">
                    <strong>${escHtml(a.descricao)}</strong>
                    <div style="font-size: 0.85rem; color: #666;">
                        ${infoUsuario} em ${dataFormatada} ${horaFormatada}
                    </div>
                </div>
            </div>`;
    }).join('');
}
// === MODAIS E AÇÕES RÁPIDAS ===

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // A linha que apagava o conteúdo foi REMOVIDA.
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
        FirebaseService.salvar('vendas', venda).then(async (newId) => {
    if (newId) {
        await FirebaseService.salvar('atividades', { 
            tipo: 'venda', 
            descricao: `Venda rápida: ${venda.produto} para ${venda.pessoa}`, 
            usuarioNome: usuarioAtual.nome 
        });
    }
    mostrarAlerta('Venda rápida registrada!', 'success');
    carregarTodosDados().then(() => renderizarTudo());
});
        
        fecharModal('vendaRapidaModal');
    });
}

// main.js

function abrirModalRelatorios() {
    const modal = document.getElementById('relatoriosModal');
    const clienteOptions = '<option value="todos">Todos os clientes</option>' + clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    const pagamentoOptions = ['Todos', 'PIX', 'Dinheiro', 'Cartão', 'Transferência'].map(p => `<option value="${p}">${p}</option>`).join('');

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>📊 Gerador de Relatórios Detalhados</h3>
                <button class="close-btn" onclick="fecharModal('relatoriosModal')">&times;</button>
            </div>
            <p>Selecione os filtros para gerar o relatório de Vendas.</p>
            <div class="form-grid" style="grid-template-columns: 1fr 1fr 1fr; margin-top: 20px;">
                <div class="form-group">
                    <label for="relatorioInicio">Data Início</label>
                    <input type="date" id="relatorioInicio" required>
                </div>
                <div class="form-group">
                    <label for="relatorioFim">Data Fim</label>
                    <input type="date" id="relatorioFim" required>
                </div>
                <div class="form-group">
                    <label for="relatorioCliente">Cliente Específico</label>
                    <select id="relatorioCliente">${clienteOptions}</select>
                </div>
                <div class="form-group">
                    <label for="relatorioPagamento">Forma de Pagamento</label>
                    <select id="relatorioPagamento">${pagamentoOptions}</select>
                </div>
            </div>
            <button class="btn btn-primary" onclick="gerarRelatorio()" style="margin-top: 20px;">Gerar Relatório</button>
            <div id="resultadoRelatorio" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;"></div>
        </div>
    `;
    
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    modal.querySelector('#relatorioInicio').value = inicioMes;
    modal.querySelector('#relatorioFim').value = hoje.toISOString().split('T')[0];

    modal.style.display = 'flex';
}

function gerarRelatorio() {
    // 1. Coleta e prepara os filtros (nenhuma mudança aqui)
    const inicio = new Date(document.getElementById('relatorioInicio').value);
    const fim = new Date(document.getElementById('relatorioFim').value);
    const clienteFiltro = document.getElementById('relatorioCliente').value;
    const pagamentoFiltro = document.getElementById('relatorioPagamento').value;

    const inicioUTC = new Date(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate());
    const fimUTC = new Date(fim.getUTCFullYear(), fim.getUTCMonth(), fim.getUTCDate());

    // 2. Filtra as vendas com base nos critérios (nenhuma mudança aqui)
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

    // 3. Agrupa os dados e calcula os totais (nenhuma mudança aqui)
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

    const totalItens = vendasPeriodo.reduce((acc, v) => acc + v.quantidade, 0);
    const valorTotalVendido = vendasPeriodo.reduce((acc, v) => acc + (v.valor * v.quantidade), 0);
    const clientesAtendidos = Object.keys(relatorioAgrupado).length;
    const ticketMedio = valorTotalVendido / clientesAtendidos;
    const produtoMaisVendido = Object.entries(contagemProdutos).sort((a, b) => b[1] - a[1])[0];
    const hoje = new Date();
    const dataGeracao = `${hoje.toLocaleDateString()} ${hoje.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    // 4. Monta o HTML do relatório com a CORREÇÃO
    let relatorioHTML = `
        <div id="relatorio-imprimivel" class="relatorio-container">
            <style>
                .relatorio-container { border: 1px solid #ddd; border-radius: 8px; padding: 25px; background: #fff; color: #333; }
                .relatorio-header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
                .relatorio-header img { height: 80px; margin-bottom: 10px; }
                .relatorio-info { display: flex; justify-content: space-between; font-size: 0.85rem; color: #666; margin-top: 10px; }
                .relatorio-cliente { margin-top: 25px; }
                .relatorio-cliente h5 { font-size: 1.1rem; color: #6a1b9a; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px; }
                .relatorio-tabela { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .relatorio-tabela th, .relatorio-tabela td { padding: 8px; text-align: left; }
                .relatorio-tabela thead { background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; }
                .relatorio-tabela tbody tr:nth-child(odd) { background-color: #fcfcfc; }
                .subtotal-cliente { text-align: right; font-weight: bold; margin-top: 10px; }
                .relatorio-resumo { border-top: 2px solid #eee; margin-top: 30px; padding-top: 15px; }
                body { color: #333 !important; } /* Garante cor do texto na impressão */
            </style>
            <div class="relatorio-header">
                <img src="images/logo.png" alt="Logo">
                <h3>LÁ DIVINO SABOR - RELATÓRIO DE VENDAS</h3>
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
function imprimirRelatorio() {
    const conteudo = document.getElementById('relatorio-imprimivel').innerHTML;
    const janelaImprimir = window.open('', '', 'height=600,width=800');
    janelaImprimir.document.write('<html><head><title>Relatório de Vendas</title>');
    // Para garantir que o estilo seja aplicado na impressão
    janelaImprimir.document.write('<link rel="stylesheet" href="css/style.css" type="text/css" media="print"/>');
    janelaImprimir.document.write('</head><body>');
    janelaImprimir.document.write(conteudo);
    janelaImprimir.document.write('</body></html>');
    janelaImprimir.document.close();
    setTimeout(() => { // Timeout para dar tempo de carregar o CSS
        janelaImprimir.print();
    }, 500);
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
        clientes.map(c => `<option value="${escHtml(c.nome)}" ${isEdit && c.nome === encomenda?.clienteNome ? 'selected' : ''}>${escHtml(c.nome)}</option>`).join('');
    
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
                const encomendaExcluida = encomendas.find(e => e.id === id);
                await FirebaseService.salvar('atividades', { tipo: 'exclusao', descricao: `Encomenda de ${encomendaExcluida.clienteNome} excluída.`, usuarioNome: usuarioAtual.nome });
                mostrarAlerta('Encomenda excluída com sucesso!', 'success');
                await carregarTodosDados();
                renderizarTudo();
            }
            mostrarLoading(false);
        }
    });
}

// Esta função processa o formulário e salva a encomenda no Firebase
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
        // Mantém o status existente se estiver editando, ou define um padrão se for novo
        status: encomendaId ? encomendas.find(e => e.id === encomendaId)?.status || 'Pendente' : 'Pendente'
    };

    if (!isValidDateInput(dados.dataEntrega)) {
        return mostrarAlerta('Data de entrega inv?lida.', 'danger');
    }
    if (!dados.clienteNome || !dados.produtoDescricao || !dados.dataEntrega || dados.valorTotal <= 0) {
        return mostrarAlerta('Preencha todos os campos obrigatórios da encomenda.', 'danger');
    }

    mostrarLoading(true);

    if (encomendaId) {
        // MODO EDIÇÃO
        const encomendaIndex = encomendas.findIndex(e => e.id === encomendaId);
        if (encomendaIndex === -1) {
            mostrarLoading(false);
            return mostrarAlerta('Erro: Encomenda não encontrada para editar.', 'danger');
        }
        const encomendaAntiga = encomendas[encomendaIndex];
        
        // Lógica crucial para corrigir o total gasto dos clientes
        if (encomendaAntiga.clienteNome !== dados.clienteNome || encomendaAntiga.valorTotal !== dados.valorTotal) {
            // Reverte o valor do cliente antigo
            await atualizarDadosCliente(encomendaAntiga.clienteNome, encomendaAntiga.valorTotal, true);
            // Adiciona o novo valor para o novo (ou mesmo) cliente
            await atualizarDadosCliente(dados.clienteNome, dados.valorTotal, false);
        }

        const success = await FirebaseService.atualizar('encomendas', encomendaId, dados);
        if (success) {
            encomendas[encomendaIndex] = { ...encomendaAntiga, ...dados }; // Atualiza estado local
            await FirebaseService.salvar('atividades', { 
                tipo: 'edicao', 
                descricao: `Encomenda editada: ${dados.produtoDescricao} para ${dados.clienteNome}`, 
                usuarioNome: usuarioAtual.nome 
            });
            mostrarAlerta('Encomenda atualizada com sucesso!', 'success');
        }
    } else {
    // MODO ADIÇÃO
    const newId = await FirebaseService.salvar('encomendas', dados);
    if (newId) {
        // Atualizar dados do cliente
        await atualizarDadosCliente(dados.clienteNome, dados.valorTotal);
        
        // Registrar atividade
        await FirebaseService.salvar('atividades', { 
            tipo: 'criacao', 
            descricao: `Nova encomenda: ${dados.produtoDescricao} para ${dados.clienteNome}`, 
            usuarioNome: usuarioAtual.nome 
        });
        
        // Mostrar sucesso
        mostrarAlerta('Encomenda criada com sucesso!', 'success');
    }
}
    fecharModal('encomendaModal');
    renderizarTudo(); // Renderiza com os dados locais já atualizados
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

function escHtml(value) {
    const str = String(value ?? '');
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

function isValidDateInput(value) {
    if (!value || typeof value !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
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

// --- GERAL E NAVEGAÇÃO ---
window.fecharModal = fecharModal;
window.fazerLogout = fazerLogout;
window.openTab = openTab;

// --- AÇÕES RÁPIDAS E MODAIS PRINCIPAIS ---
window.abrirModalEncomenda = abrirModalEncomenda;
window.abrirModalQuitarCliente = abrirModalQuitarCliente; 
window.abrirModalRelatorios = abrirModalRelatorios;
window.abrirModalVendaRapida = abrirModalVendaRapida;
window.exportarDados = exportarDados;

// --- DASHBOARD E RELATÓRIOS ---
window.gerarRelatorio = gerarRelatorio;
window.imprimirRelatorio = imprimirRelatorio;
window.salvarMeta = salvarMeta;

// --- LÓGICA DE CADASTROS (CRUD) ---
// Clientes
window.editarCliente = editarCliente;
window.excluirCliente = excluirCliente;
// Encomendas
window.editarEncomenda = editarEncomenda;
window.excluirEncomenda = excluirEncomenda;
// Ingredientes
window.editarIngrediente = editarIngrediente;
window.excluirIngrediente = excluirIngrediente;
// Materiais
window.editarMaterial = editarMaterial;
window.excluirMaterial = excluirMaterial;
// Produtos
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
// Receitas
window.editarReceita = editarReceita;
window.excluirReceita = excluirReceita;
window.imprimirReceitaExistente = imprimirReceitaExistente;

// --- FUNÇÕES AUXILIARES DE FORMULÁRIOS ---
window.adicionarIngredienteNaReceita = adicionarIngredienteNaReceita; 
window.atualizarCustoTotalReceita = atualizarCustoTotalReceita;
window.removerItemDaComposicao = removerItemDaComposicao;

// --- LÓGICA DE VENDAS E DESPESAS ---
window.editarStatusVenda = editarStatusVenda;
window.excluirDespesa = excluirDespesa;
window.excluirVenda = excluirVenda;

// --- LÓGICA DE COBRANÇAS ---
window.copiarMensagem = copiarMensagem;
window.marcarPendenciaComoPaga = marcarPendenciaComoPaga;
window.marcarTodosComoContatados = marcarTodosComoContatados;
window.abrirWhatsApp = abrirWhatsApp;
window.quitarTodasPendenciasCliente = quitarTodasPendenciasCliente;

// --- FUNÇÕES UTILITÁRIAS E DEBUG (Manter no final) ---
window.criarFiltroData = criarFiltroData;
window.debugFiltros = debugFiltros;
window.extrairDataDoItem = extrairDataDoItem;
