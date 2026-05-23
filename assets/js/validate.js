import { db } from "./firebase-config.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');

async function validarToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        mostrarError("No se detectó un token válido");
        return;
    }

    try {
        const docRef = doc(db, "tokens_acceso", token);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().active === true) {
            // Solo validar y marcar como usado, SIN redireccionar
            await updateDoc(docRef, { 
                active: false, 
                usedAt: serverTimestamp(),
                validatedFrom: "mobile"
            });

            const userUid = docSnap.data().uid;
            if (userUid) {
                const userRef = doc(db, "users", userUid);
                await updateDoc(userRef, {
                    accesoValidadoAt: serverTimestamp()
                });
            } else {
                console.warn('Token válido sin UID asociado');
            }

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
    statusTitle.innerText = "¡Código Validado!";
    statusTitle.classList.add("text-green-600");
    statusMessage.innerText = "Tu código QR ha sido validado correctamente. Puedes cerrar esta página.";
    
    lucide.createIcons();
}

function mostrarError(mensaje) {
    statusIcon.innerHTML = '<i data-lucide="x-circle" class="text-red-500 w-16 h-16"></i>';
    statusTitle.innerText = "Error de Validación";
    statusTitle.classList.add("text-red-600");
    statusMessage.innerText = mensaje;
    lucide.createIcons();
}

validarToken();
