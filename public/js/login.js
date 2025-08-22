// js/login.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

// IMPORTANTE: Copie e cole aqui a sua variável `firebaseConfig` que está no main.js
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
const auth = getAuth(app);

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginError.style.display = 'none'; // Esconde a mensagem de erro

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Login foi um sucesso, o usuário será redirecionado pelo porteiro no index.html
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error("Erro de login:", error.code);
            loginError.textContent = 'E-mail ou senha inválidos.';
            loginError.style.display = 'block';
        });
});