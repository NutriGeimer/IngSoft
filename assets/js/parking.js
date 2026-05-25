import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { collection, doc, getDocs, query, where, orderBy, updateDoc, serverTimestamp, writeBatch, onSnapshot, setDoc, getFirestore, getDoc  } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getCurrentUserProfile, logoutUser, applyAdminRole, checkAdminCache } from "./auth.js";
import { logAccess } from "./historialAccesos.js";

const userNameLabel = document.getElementById('userNameLabel');
const logoutBtn = document.getElementById('logoutBtn');

const TOTAL_SPOTS = 50;
const SPOTS_COLLECTION = "parkingSpots";

const parkingMap = document.getElementById('parkingMap');
const currentUserInfo = document.getElementById('currentUserInfo');
const selectedSpotInfo = document.getElementById('selectedSpotInfo');
const occupyButton = document.getElementById('occupyButton');
const resetButton = document.getElementById('resetButton');
const clearSelectionButton = document.getElementById('clearSelectionButton');
const totalFree = document.getElementById('totalFree');
const totalOccupied = document.getElementById('totalOccupied');

// Variables para QR de salida
const leaveButton = document.getElementById('leaveButton');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const modalQrSalida = document.getElementById('modalQrSalida');
const qrContainer = document.getElementById("qrcode");

let spots = [];
let selectedSpotId = null;
let firebaseUser = null;
let userName = "Usuario";

checkAdminCache();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  firebaseUser = user;
  const profile = await getCurrentUserProfile(user.uid);
  userName = profile?.name || user.email || "Usuario";
  if (userNameLabel) userNameLabel.textContent = userName;
  applyAdminRole(profile?.role);
  await initSpotListener();
});

logoutBtn?.addEventListener('click', async () => {
  await logoutUser();
  window.location.href = 'login.html';
});

async function initSpotListener() {
  const spotsQuery = query(collection(db, SPOTS_COLLECTION), orderBy('id'));
  const snapshot = await getDocs(spotsQuery);

  if (snapshot.size < TOTAL_SPOTS) {
    await initializeSpots(snapshot);
  }

  onSnapshot(spotsQuery, (snapshot) => {
    spots = snapshot.docs.map((doc) => ({
      id: doc.data().id,
      occupiedBy: doc.data().occupiedBy || null,
      occupiedByUid: doc.data().occupiedByUid || null,
      reservedByAdmin: doc.data().reservedByAdmin || false,
      reservationLabel: doc.data().reservationLabel || null,
    }));
    renderMap();
  });
}

async function initializeSpots(snapshot) {
  const existingIds = new Set(snapshot.docs.map((doc) => doc.id));
  const batch = writeBatch(db);

  for (let index = 1; index <= TOTAL_SPOTS; index += 1) {
    const spotId = String(index);
    if (!existingIds.has(spotId)) {
      const spotRef = doc(db, SPOTS_COLLECTION, spotId);
      batch.set(spotRef, {
        id: index,
        occupiedBy: null,
        occupiedByUid: null,
        reservedByAdmin: false,
        updatedAt: serverTimestamp(),
      });
    }
  }
  await batch.commit();
}

function getCurrentUserSpot() {
  return spots.find((spot) => spot.occupiedByUid === firebaseUser?.uid) || null;
}

function renderMap() {
  parkingMap.innerHTML = '';

  spots.forEach((spot) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot';

    let statusLabel;
    if (spot.reservedByAdmin) {
      slot.classList.add('slot-reserved');
      slot.disabled = true;
      statusLabel = spot.reservationLabel || 'Reservado';
    } else if (spot.occupiedBy) {
      slot.classList.add(spot.occupiedByUid === firebaseUser?.uid ? 'slot-mine' : 'slot-occupied');
      statusLabel = spot.occupiedByUid === firebaseUser?.uid ? 'Ocupado por ti' : 'Ocupado';
    } else {
      slot.classList.add('slot-free');
      statusLabel = 'Libre';
    }

    if (spot.id === selectedSpotId && !spot.reservedByAdmin) slot.classList.add('slot-selected');
    slot.dataset.spotId = spot.id;
    slot.setAttribute('aria-pressed', spot.id === selectedSpotId ? 'true' : 'false');
    slot.innerHTML = `
      <span class="slot-number">Cajón ${spot.id}</span>
      <span class="slot-status">${statusLabel}</span>
    `;

    if (!spot.reservedByAdmin) slot.addEventListener('click', () => handleSpotClick(spot.id));
    parkingMap.appendChild(slot);
  });

  updateSummary();
}

function updateSummary() {
  const occupiedCount = spots.filter((spot) => spot.occupiedBy !== null || spot.reservedByAdmin).length;
  const freeCount = TOTAL_SPOTS - occupiedCount;
  const currentUserSpot = getCurrentUserSpot();

  totalFree.textContent = freeCount;
  totalOccupied.textContent = occupiedCount;

  const fill = document.getElementById('occupancyFill');
  if (fill) {
    const percent = (occupiedCount / TOTAL_SPOTS) * 100;
    fill.style.width = Math.round(percent) + '%';
    if (percent > 80) fill.style.background = '#dc3545';
    else if (percent > 50) fill.style.background = '#f59e0b';
    else fill.style.background = '#198754';
  }

  currentUserInfo.textContent = `Usuario en sesión: ${userName}`;

  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId) || null;

  if (!selectedSpot) {
    selectedSpotInfo.textContent = currentUserSpot
      ? `Tienes el cajón ${currentUserSpot.id} ocupado`
      : 'Ningún cajón seleccionado';
    occupyButton.disabled = !!currentUserSpot;
    leaveButton.disabled = !currentUserSpot;
    return;
  }

  if (selectedSpot.occupiedByUid === firebaseUser?.uid) {
    selectedSpotInfo.textContent = `Cajón seleccionado: ${selectedSpot.id} — actualmente ocupado por ti`;
    occupyButton.disabled = true;
    leaveButton.disabled = false;
    return;
  }

  if (selectedSpot.occupiedBy !== null) {
    selectedSpotInfo.textContent = `Cajón seleccionado: ${selectedSpot.id} — actualmente ocupado`;
    occupyButton.disabled = true;
    leaveButton.disabled = !currentUserSpot;
    return;
  }

  selectedSpotInfo.textContent = `Cajón seleccionado: ${selectedSpot.id} — libre`;
  occupyButton.disabled = !!currentUserSpot;
  leaveButton.disabled = !currentUserSpot;
}

function handleSpotClick(id) {
  selectedSpotId = id;
  renderMap();
}

async function occupySelectedSpot() {
  if (selectedSpotId === null) return;

  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId);
  const currentUserSpot = getCurrentUserSpot();

  if (!selectedSpot || selectedSpot.occupiedBy !== null || selectedSpot.reservedByAdmin) return;
  if (currentUserSpot) {
    alert(`Ya tienes el cajón ${currentUserSpot.id} ocupado. Libéralo antes de ocupar otro`);
    return;
  }

  selectedSpot.occupiedBy = userName;
  selectedSpot.occupiedByUid = firebaseUser?.uid || null;

  await updateDoc(doc(db, SPOTS_COLLECTION, String(selectedSpotId)), {
    occupiedBy: selectedSpot.occupiedBy,
    occupiedByUid: selectedSpot.occupiedByUid,
    updatedAt: serverTimestamp(),
  });
  renderMap();

  await logAccess({
    uid: firebaseUser?.uid || "anonimo",
    userName: userName,
    spotId: selectedSpotId,
    action: "entrada",
  });
}

// Liberar cajón + registrar salida en Firestore
async function leaveSelectedSpot() {
  const currentUserSpot = getCurrentUserSpot();
  if (!currentUserSpot) return;

  const spotId = currentUserSpot.id;
  currentUserSpot.occupiedBy = null;
  currentUserSpot.occupiedByUid = null;

  if (selectedSpotId === spotId) selectedSpotId = null;

  await updateDoc(doc(db, SPOTS_COLLECTION, String(spotId)), {
    occupiedBy: null,
    occupiedByUid: null,
    updatedAt: serverTimestamp(),
  });
  renderMap();

  await logAccess({
    uid: firebaseUser?.uid || "anonimo",
    userName: userName,
    spotId: spotId,
    action: "salida",
  });
}

// Generar QR de salida
const handleLeaveButton = async () => {
  if (!firebaseUser) {
    alert("Esperando autenticación...");
    return;
  }

  const currentUserSpot = getCurrentUserSpot();
  if (!currentUserSpot) {
    alert("No tienes un cajón ocupado para generar la salida.");
    return;
  }

  qrContainer.innerHTML = "";
  modalQrSalida.classList.remove('hidden');

  // Generar token único
  const token = Math.random().toString(36).substring(2, 15);
  const url = `${window.location.origin}/salida.html?token=${token}`;

  try {
    if (typeof QRCode === 'undefined') {
      throw new Error('La librería de QR no está cargada');
    }

    const tokenRef = doc(db, "tokens_salida", token);
    await setDoc(tokenRef, {
      active: true,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      spotId: currentUserSpot.id,
      createdAt: serverTimestamp(),
      url: url,
    });

    // Escuchar si el token fue procesado por salida.js para redirigir al usuario
    const unsubscribeToken = onSnapshot(tokenRef, (tokenSnap) => {
      if (tokenSnap.exists() && tokenSnap.data().active === false) {
        qrContainer.innerHTML = '<p class="text-green-600 text-sm text-center">Salida completada. Redirigiendo a dashboard...</p>';
        unsubscribeToken();
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 900);
      }
    });

    // Generar QR
    new QRCode(qrContainer, {
      text: url,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });

    console.log("QR generado para:", firebaseUser.email);

  } catch (error) {
    console.error("Error al generar QR de salida:", error);
    qrContainer.innerHTML = `<p class="text-red-500 text-sm text-center">Error al generar código: ${error.message}</p>`;
  }
};

async function resetSpots() {
  if (!confirm('¿Deseas reiniciar todos los estados y dejar los lugares libres? (No afecta cajones reservados por Admin)')) return;
  const batch = writeBatch(db);
  spots.forEach((spot) => {
    if (spot.reservedByAdmin) return;
    const spotRef = doc(db, SPOTS_COLLECTION, String(spot.id));
    batch.update(spotRef, {
      occupiedBy: null,
      occupiedByUid: null,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  renderMap();
}

function clearSelection() {
  selectedSpotId = null;
  renderMap();
}

async function getRecentAccessToken(uid) {
  const tokenQuery = query(
    collection(db, "tokens_acceso"),
    where("uid", "==", uid),
    where("active", "==", false)
  );

  const snapshot = await getDocs(tokenQuery);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  return snapshot.docs.find((docSnap) => {
    const usedAt = docSnap.data().usedAt;
    return usedAt && usedAt.toDate && usedAt.toDate() >= tenMinutesAgo;
  }) || null;
}

const revisionQr = async() =>{
  const usuario = auth.currentUser;

  if (!usuario) {
    alert("Debes iniciar sesión primero.");
    window.location.href = "login.html";
    return;
  }

  try {
    //buscar el perfil del usuario en la base de datos
    const userRef = doc(db, "users", usuario.uid);
    const userSnap = await getDoc(userRef);

    let validAccess = false;
    let accessTimestamp = null;

    if (userSnap.exists()) {
      const datosUsuario = userSnap.data();
      
      if (datosUsuario.accesoValidadoAt) {
        accessTimestamp = datosUsuario.accesoValidadoAt;
      }
    }

    if (accessTimestamp) {
      const ahora = new Date();
      const horaEntrada = accessTimestamp.toDate ? accessTimestamp.toDate() : new Date(accessTimestamp);
      const minutosTranscurridos = (ahora - horaEntrada) / (1000 * 60);
      validAccess = minutosTranscurridos <= 10;
    }

    if (!validAccess) {
      const tokenDoc = await getRecentAccessToken(usuario.uid);
      if (tokenDoc) {
        validAccess = true;
      }
    }

    if (validAccess) {
      await occupySelectedSpot();
      if (userSnap.exists()) {
        await updateDoc(userRef, { accesoValidadoAt: null });
      }
    } else {
      alert("Acceso denegado: Primero debes escanear tu código QR de acceso en la entrada.");
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    console.error("Error al procesar la reserva:", error);
    alert("Ocurrió un error al validar el acceso. Intenta de nuevo.");
  }
}

const hideModal = () => modalQrSalida.classList.add('hidden');

leaveButton?.addEventListener('click', handleLeaveButton);
closeModal?.addEventListener('click', hideModal);
cancelBtn?.addEventListener('click', hideModal);
occupyButton.addEventListener('click', revisionQr);
resetButton.addEventListener('click', resetSpots);
clearSelectionButton.addEventListener('click', clearSelection);