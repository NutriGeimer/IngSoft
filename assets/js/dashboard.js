import { db, auth } from "./firebase-config.js"; 
import {doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js"
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getCurrentUserProfile, logoutUser } from "./auth.js";

const openModal = document.getElementById('openModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const modalOverlay = document.getElementById('modalOverlay');
const qrContainer = document.getElementById("qrcode");
const userNameLabel = document.getElementById('userNameLabel');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  const profile = await getCurrentUserProfile(user.uid);
  const userName = profile?.name || user.email || "Usuario";
  if (userNameLabel) userNameLabel.textContent = userName;
});

logoutBtn?.addEventListener('click', async () => {
  await logoutUser();
  window.location.href = 'login.html';
});

// Función principal para abrir modal y generar QR

const handleOpenModal = async () => {

    qrContainer.innerHTML = ""; //borra cualquier QR que se haya generado antes
    modalOverlay.classList.remove('hidden'); // de todas las clases del contenedor modelOverlay remover el hidden

    //Generar token único
    const token = Math.random().toString(36).substring(2, 15);
    const url = `https://tuapp.com/acceso.html?token=${token}`;

    try { 
        //Guardamos el token c
        await setDoc(doc(db, "tokens_acceso", token), {
            active: true,
            createdAt: serverTimestamp(),
            url: url
        });

        //Generar el QR visualmente
        new QRCode(qrContainer, {
            text: url,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H 
        });

        console.log("QR generado y registrado en DB");
    } catch (error) { 
        console.error("Error al guardar en Firebase:", error);
        qrContainer.innerHTML = "Error al generar código";
    }
};

const hideModal = () => {
    modalOverlay.classList.add('hidden');
};

openModal.addEventListener('click', handleOpenModal); 
closeModal.addEventListener('click', hideModal);
if (cancelBtn) {
  cancelBtn.addEventListener('click', hideModal);
}

// Cerrar al hacer click fuera del contenido del modal
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideModal();
});