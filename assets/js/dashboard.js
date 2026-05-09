import { db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const openModal    = document.getElementById('openModal');
const closeModal   = document.getElementById('closeModal');
const modalOverlay = document.getElementById('modalOverlay');
const qrContainer  = document.getElementById('qrcode');

const showModal = () => {
    qrContainer.innerHTML = '';
    modalOverlay.classList.remove('hidden');
    generateQR();
};

const hideModal = () => {
    modalOverlay.classList.add('hidden');
};

const generateQR = async () => {
    const token = Math.random().toString(36).substring(2, 15);
    const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const url = `${base}access.html?token=${token}`;

    try {
        await setDoc(doc(db, "tokens_acceso", token), {
            active: true,
            createdAt: serverTimestamp(),
            url: url
        });

        new QRCode(qrContainer, {
            text: url,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (error) {
        console.error("Error al guardar en Firebase:", error);
        qrContainer.innerHTML = '<p class="text-red-500 text-sm text-center">Error al generar código</p>';
    }
};

openModal.addEventListener('click', showModal);
closeModal.addEventListener('click', hideModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideModal();
});
