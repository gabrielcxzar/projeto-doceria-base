// Importa as funções de inicialização e autenticação
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence, browserLocalPersistence, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

// --- INÍCIO DA CORREÇÃO ---
// Bloco de configuração e inicialização do Firebase
// Este bloco estava faltando.
const firebaseConfig = {
    apiKey: "AIzaSyBtmmi8NLvJswGLzGNs-NdIYwqqizBDWaI",
    authDomain: "gestao-de-confeitaria.firebaseapp.com",
    projectId: "gestao-de-confeitaria",
    storageBucket: "gestao-de-confeitaria.firebasestorage.app",
    messagingSenderId: "361729178674",
    appId: "1:361729178674:web:ecb34f5f4b6f7c9355502b"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
// --- FIM DA CORREÇÃO ---

const auth = getAuth(app); // Agora getAuth() sabe qual app usar
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const manterConectado = document.getElementById('manterConectado').checked;

    const persistencia = manterConectado
        ? browserLocalPersistence
        : browserSessionPersistence;

    setPersistence(auth, persistencia)
        .then(() => {
            return signInWithEmailAndPassword(auth, email, senha);
        })
        .then((userCredential) => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error("Erro no login:", error.code, error.message);
            loginError.textContent = "E-mail ou senha incorretos. Tente novamente.";
            loginError.style.display = 'block';
        });
});