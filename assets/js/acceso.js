import { db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const statusIcon    = document.getElementById('status-icon');
const statusTitle   = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const barrierVisual = document.getElementById('barrier-visual');
const barrierArm    = document.getElementById('barrier-arm');

async function validarToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        mostrarError("No se detectó un token válido");
        return;
    }

    try {
        const docRef  = doc(db, "tokens_acceso", token);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().active === true) {
            await updateDoc(docRef, { active: false, usedAt: serverTimestamp() });
            mostrarExito();
        } else {
            mostrarError("Este código ya fue usado o no existe");
        }
    } catch (error) {
        console.error(error);
        mostrarError("Error de conexión con la colmena");
    }
}

function mostrarExito() {
    statusIcon.innerHTML = '<i data-lucide="check-circle" class="text-green-500 w-16 h-16"></i>';
    statusTitle.innerText = "¡Acceso Concedido!";
    statusTitle.classList.add("text-green-600");
    statusMessage.innerText = "Levantando plumilla. Bienvenido a BeeParking.";
    barrierVisual.classList.remove('hidden');

    setTimeout(() => {
        barrierArm.style.transform = "rotate(-45deg) translateY(-20px)";
        lucide.createIcons();
    }, 100);

    setTimeout(() => {
        const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        window.location.href = `${base}parking.html`;
    }, 3500);

    lucide.createIcons();
}

function mostrarError(mensaje) {
    statusIcon.innerHTML = '<i data-lucide="x-circle" class="text-red-500 w-16 h-16"></i>';
    statusTitle.innerText = "Acceso Denegado";
    statusTitle.classList.add("text-red-600");
    statusMessage.innerText = mensaje;
    lucide.createIcons();
}

validarToken();