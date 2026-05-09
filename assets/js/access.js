import { db } from "./firebase-config.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const stateLoading = document.getElementById('stateLoading');
const stateSuccess = document.getElementById('stateSuccess');
const stateError   = document.getElementById('stateError');
const errorMsg     = document.getElementById('errorMsg');

const showState = (state) => {
    [stateLoading, stateSuccess, stateError].forEach(el => el.classList.add('hidden'));
    state.classList.remove('hidden');
};

const validate = async () => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');

    if (!token) {
        errorMsg.textContent = 'No se encontró ningún token en el enlace.';
        showState(stateError);
        return;
    }

    try {
        const tokenRef = doc(db, 'tokens_acceso', token);
        const snap = await getDoc(tokenRef);

        if (!snap.exists() || !snap.data().active) {
            errorMsg.textContent = 'El código QR no es válido o ya fue utilizado.';
            showState(stateError);
            return;
        }

        await updateDoc(tokenRef, { active: false, usedAt: serverTimestamp() });

        showState(stateSuccess);

        setTimeout(() => {
            const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
            window.location.href = `${base}parking.html`;
        }, 1800);

    } catch (error) {
        console.error('Error al validar token:', error);
        errorMsg.textContent = 'Ocurrió un error al validar el acceso. Intenta de nuevo.';
        showState(stateError);
    }
};

validate();
