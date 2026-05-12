import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { collection, doc, getDocs, query, orderBy, setDoc, updateDoc, serverTimestamp, writeBatch, onSnapshot } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getCurrentUserProfile, logoutUser } from "./auth.js";
import { logAccess } from "./historialAccesos.js";
import { hideAlert, showAlert, setButtonLoading, registerUser, getFirebaseErrorMessage } from "./auth.js"


// Elementos del formulario y modal
const editProfileForm = document.getElementById('editProfileForm');
const editName = document.getElementById('editName');
const editEmail = document.getElementById('editEmail');
const editPlates = document.getElementById('editPlates');
const editProfileBtn = document.getElementById('editProfileBtn');

const editProfileModalElement = document.getElementById('editProfileModal');
let editProfileModal = null;

if (editProfileModalElement) {
    editProfileModal = bootstrap.Modal.getOrCreateInstance(editProfileModalElement);
}

// Elementos de visualización
const displayName = document.getElementById('displayName');
const displayEmail = document.getElementById('displayEmail');
const displayPlates = document.getElementById('displayPlates');
const userNameLabel = document.getElementById('userNameLabel'); // ID original de la navbar
const profileAvatar = document.getElementById('profileAvatar');
const logoutBtn = document.getElementById('logoutBtn');

// Datos simulados (puedes conectarlos a tu auth.js más adelante)
let userSession = {
    name: "Andres Manuel Lopez",
    email: "ejemplo@correo.com",
    plates: "GTF235F"
};

/**
 * Actualiza todos los elementos de la interfaz con los datos del usuario
 */
function updateUI(user) {
    // Tarjeta de perfil
    if (displayName) displayName.textContent = user.name;
    if (displayEmail) displayEmail.textContent = user.email;
    if (displayPlates) displayPlates.textContent = user.plates || "Sin registrar";
    
    // Navbar original
    if (userNameLabel) userNameLabel.textContent = user.name;
    
    // Avatar dinámico
    if (profileAvatar) {
        profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ffc107&color=000&size=100`;
    }

    // Llenar campos del modal
    if (editName) editName.value = user.name;
    if (editEmail) editEmail.value = user.email;
    if (editPlates) editPlates.value = user.plates || "";
}

// Inicializar vista al cargar
document.addEventListener('DOMContentLoaded', () => {
    updateUI(userSession);
});

// Guardar cambios del perfil
editProfileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Feedback visual en el botón
    const originalText = editProfileBtn.innerHTML;
    editProfileBtn.disabled = true;
    editProfileBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    try {
        // Simulación de guardado (reemplazar con Firebase/API)
        await new Promise(resolve => setTimeout(resolve, 600));

        // Actualizar objeto local
        userSession.name = editName.value;
        userSession.plates = editPlates.value;

        // Refrescar UI
        updateUI(userSession);

        // Cerrar modal
        if (editProfileModal) editProfileModal.hide();
        
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("No se pudieron guardar los cambios.");
    } finally {
        editProfileBtn.disabled = false;
        editProfileBtn.innerHTML = originalText;
    }
});

// Cerrar sesión
logoutBtn?.addEventListener('click', () => {
    // Aquí podrías llamar a signout de Firebase
    window.location.href = './login.html';
});