import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getCurrentUserProfile, logoutUser, updateCurrentUserProfile } from "./auth.js";

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

let currentUser = null;

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

async function loadUserProfile(user) {
    currentUser = user;
    const profile = await getCurrentUserProfile(user.uid);
    const profileData = {
        name: profile?.name || user.displayName || user.email?.split('@')[0] || "Usuario",
        email: user.email || profile?.email || "Sin email",
        plates: profile?.nplates || profile?.plates || ""
    };
    updateUI(profileData);
    if (profile?.role === "admin") {
        const adminLink = document.getElementById('adminNavLink');
        if (adminLink) { adminLink.classList.remove('hidden'); adminLink.style.display = 'inline'; }
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    await loadUserProfile(user);
});

// Guardar cambios del perfil
editProfileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Feedback visual en el botón
    const originalText = editProfileBtn.innerHTML;
    editProfileBtn.disabled = true;
    editProfileBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    try {
        if (!currentUser) throw new Error('Usuario no autenticado');

        await updateCurrentUserProfile(currentUser.uid, {
            name: editName.value,
            nplates: editPlates.value
        });

        updateUI({
            name: editName.value,
            email: editEmail.value,
            plates: editPlates.value
        });

        if (editProfileModal) editProfileModal.hide();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert(error?.message || "No se pudieron guardar los cambios.");
    } finally {
        editProfileBtn.disabled = false;
        editProfileBtn.innerHTML = originalText;
    }
});

// Cerrar sesión
logoutBtn?.addEventListener('click', async () => {
    await logoutUser();
    window.location.href = './login.html';
});