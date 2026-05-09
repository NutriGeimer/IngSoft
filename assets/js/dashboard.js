import { db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const openModal      = document.getElementById('openModal');
const closeModal     = document.getElementById('closeModal');
const modalOverlay   = document.getElementById('modalOverlay');
const spotStep       = document.getElementById('spotStep');
const qrStep         = document.getElementById('qrStep');
const spotInput      = document.getElementById('spotInput');
const spotError      = document.getElementById('spotError');
const generateQrBtn  = document.getElementById('generateQrBtn');
const changeSpotBtn  = document.getElementById('changeSpotBtn');
const assignedLabel  = document.getElementById('assignedSpotLabel');
const qrContainer    = document.getElementById('qrcode');

const showSpotStep = () => {
    qrContainer.innerHTML = '';
    spotInput.value = '';
    spotError.classList.add('hidden');
    spotStep.classList.remove('hidden');
    qrStep.classList.add('hidden');
};

const showModal = () => {
    showSpotStep();
    modalOverlay.classList.remove('hidden');
};

const hideModal = () => {
    modalOverlay.classList.add('hidden');
};

const generateQR = async () => {
    const spot = parseInt(spotInput.value, 10);

    if (!spot || spot < 1 || spot > 50) {
        spotError.classList.remove('hidden');
        return;
    }
    spotError.classList.add('hidden');

    qrContainer.innerHTML = '';
    spotStep.classList.add('hidden');
    qrStep.classList.remove('hidden');
    assignedLabel.textContent = `Cajón asignado: #${spot}`;

    const token = Math.random().toString(36).substring(2, 15);
    const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const url = `${base}access.html?token=${token}`;

    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    try {
        await setDoc(doc(db, "tokens_acceso", token), {
            active: true,
            spot: spot,
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

        if (isLocalhost) {
            const warn = document.createElement('p');
            warn.className = 'text-amber-600 text-xs text-center mt-3 px-2';
            warn.textContent = '⚠️ Estás en localhost — el celular no puede acceder. Abre la app desde la IP de tu compu (ej. http://192.168.x.x:5500).';
            qrContainer.after(warn);
        }
    } catch (error) {
        console.error("Error al guardar en Firebase:", error);
        qrContainer.innerHTML = '<p class="text-red-500 text-sm text-center">Error al generar código</p>';
    }
};

openModal.addEventListener('click', showModal);
closeModal.addEventListener('click', hideModal);
generateQrBtn.addEventListener('click', generateQR);
changeSpotBtn.addEventListener('click', showSpotStep);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideModal();
});
