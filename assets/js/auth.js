 import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
    } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
   import {
    doc,
    setDoc,
    getDoc,
    updateDoc, //agregado para actualizr el perfil
    serverTimestamp
    } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
    import{auth,db} from "./firebase-config.js"
 
 
 
export function showAlert(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
}
 
export function hideAlert(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add("hidden");
  el.textContent = "";
}
 
export function setButtonLoading(button, isLoading, text, loadingText = "Procesando...") {
  if (!button) return;
  button.disabled = isLoading;
  button.innerHTML = isLoading
    ? `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${loadingText}`
    : text;
}
 
export async function registerUser({ name, email, password, nplates }) {
  if (!nplates || nplates.trim() === ""){
    throw new Error("El numero de placa es obligatorio.");
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    email,
    nplates: nplates.trim(),
    role: "user",
    createdAt: serverTimestamp()
  });

  return user;
}
 
export async function loginUser({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}
 
export async function getCurrentUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
 
  if (!snap.exists()) return null;
 
  return snap.data();
}
 
export async function updateCurrentUserProfile(uid,data){
  const user = doc(db,'users',uid)
  await updateDoc(user,{
    ...data,
    updatedAt: serverTimestamp()
  })
}
 
export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function redirectToLoginIfNotAuthenticated(redirectPath = "login.html") {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = redirectPath;
    }
  });
}

export function redirectToDashboardIfAuthenticated(redirectPath = "dashboard.html") {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = redirectPath;
    }
  });
}
 
export async function logoutUser() {
  sessionStorage.removeItem('bpAdmin');
  await signOut(auth);
}
 
function setAdminNavVisibility(isAdmin) {
  const adminDesktop = document.getElementById('adminNavLink');
  const adminMobile = document.getElementById('adminNavLinkMobile');

  if (adminDesktop) {
    if (isAdmin) {
      adminDesktop.classList.remove('hidden');
      adminDesktop.style.display = 'inline';
    } else {
      adminDesktop.classList.add('hidden');
      adminDesktop.style.display = '';
    }
  }

  if (adminMobile) {
    if (isAdmin) {
      adminMobile.classList.remove('hidden');
      adminMobile.classList.add('flex');
    } else {
      adminMobile.classList.add('hidden');
      adminMobile.classList.remove('flex');
    }
  }
}

export function applyAdminRole(role) {
  const isAdmin = role === "admin";
  if (isAdmin) {
    sessionStorage.setItem('bpAdmin', '1');
  } else {
    sessionStorage.removeItem('bpAdmin');
  }
  setAdminNavVisibility(isAdmin);
}

export function checkAdminCache() {
  setAdminNavVisibility(sessionStorage.getItem('bpAdmin') === '1');
}

export function requireAdmin(redirectPath = "dashboard.html") {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    const profile = await getCurrentUserProfile(user.uid);
    if (profile?.role !== "admin") window.location.href = redirectPath;
  });
}

export function getFirebaseErrorMessage(error) {
  const code = error?.code || "";
 
  switch (code) {
    case "auth/email-already-in-use":
      return "Este correo ya está registrado.";
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/user-not-found":
      return "No existe una cuenta con este correo.";
    case "auth/wrong-password":
      return "La contraseña es incorrecta.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Intenta más tarde.";
    default:
      return error?.message || "Ocurrió un error inesperado.";
  }
}