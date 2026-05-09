import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { collection, doc, getDocs, query, orderBy, setDoc, updateDoc, serverTimestamp, writeBatch, onSnapshot } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getCurrentUserProfile, logoutUser } from "./auth.js";
import { logAccess } from "./historialAccesos.js";

const TOTAL_SPOTS = 50;
const SPOTS_COLLECTION = "parkingSpots";

const parkingMap = document.getElementById('parkingMap');
const currentUserInfo = document.getElementById('currentUserInfo');
const selectedSpotInfo = document.getElementById('selectedSpotInfo');
const occupyButton = document.getElementById('occupyButton');
const resetButton = document.getElementById('resetButton');
const leaveButton = document.getElementById('leaveButton');
const clearSelectionButton = document.getElementById('clearSelectionButton');
const totalFree = document.getElementById('totalFree');
const totalOccupied = document.getElementById('totalOccupied');
const userNameLabel = document.getElementById('userNameLabel');
const logoutBtn = document.getElementById('logoutBtn');

let spots = [];
let selectedSpotId = null;
let firebaseUser = null; //Se llena cuando Firebase confirma la sesion
let userName = "Usuario";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  firebaseUser = user;
  const profile = await getCurrentUserProfile(user.uid);
  userName = profile?.name || user.email || "Usuario";
  if (userNameLabel) userNameLabel.textContent = userName;
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
        updatedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
}

function getCurrentUserSpot() {
  return spots.find((spot) => spot.occupiedByUid === firebaseUser?.uid) || null;
}

//render
function renderMap() {
  parkingMap.innerHTML = '';

  spots.forEach((spot) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot';
    slot.classList.add(spot.occupiedBy ? 'slot-occupied' : 'slot-free');
    if (spot.id === selectedSpotId) slot.classList.add('slot-selected');
    if (spot.occupiedByUid === firebaseUser?.uid) slot.classList.add('slot-mine');
    
    const statusLabel = spot.occupiedBy
      ? spot.occupiedByUid === firebaseUser?.uid ? 'Ocupado por ti' : 'Ocupado'
      : 'Libre';

    slot.dataset.spotId = spot.id;
    slot.setAttribute('aria-pressed', spot.id === selectedSpotId ? 'true' : 'false');
    slot.innerHTML = `
      <span class="slot-number">Cajón ${spot.id}</span>
      <span class="slot-status">${statusLabel}</span>
    `;

    slot.addEventListener('click', () => handleSpotClick(spot.id));
    parkingMap.appendChild(slot);
  });

  updateSummary();
}

function updateSummary() {
  const occupiedCount = spots.filter((spot) => spot.occupiedBy !== null).length;
  const freeCount = TOTAL_SPOTS - occupiedCount;
  const currentUserSpot = getCurrentUserSpot();

  totalFree.textContent = freeCount;
  totalOccupied.textContent = occupiedCount;

  const fill = document.getElementById('occupancyFill');

  if (fill) {
    const percent = (occupiedCount / TOTAL_SPOTS) * 100;

    fill.style.width = Math.round(percent) + '%';

    if (percent > 80) {
      fill.style.background = '#dc3545';
    } else if (percent > 50) {
      fill.style.background = '#f59e0b';
    } else {
      fill.style.background = '#198754';
    }
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

// ocupar cajon + registrar entrada
async function occupySelectedSpot() {
  if (selectedSpotId === null) return;

  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId);
  const currentUserSpot = getCurrentUserSpot();

  if (!selectedSpot || selectedSpot.occupiedBy !== null) return;
  if (currentUserSpot) {
    alert(`Ya tienes el cajon ${currentUserSpot.id} ocupado. Liberalo antes de ocupar otro`);
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

  // registrar entrada en Firestore
  await logAccess({
    uid: firebaseUser?.uid || "anonimo",
    userName: userName,
    spotId: selectedSpotId,
    action: "entrada",
  });
}
  //liberar cajon + registrar salida
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

    // registrar salida en Firestore
    await logAccess({
      uid: firebaseUser?.uid || "anonimo",
      userName: userName,
      spotId: spotId,
      action: "salida",
    });
  }

  async function resetSpots() {
  if (!confirm('¿Deseas reiniciar todos los estados y dejar los 50 lugares libres?')) return;
  const batch = writeBatch(db);
  spots.forEach((spot) => {
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

  occupyButton.addEventListener('click', occupySelectedSpot);
  resetButton.addEventListener('click', resetSpots);
  leaveButton.addEventListener('click', leaveSelectedSpot);
  clearSelectionButton.addEventListener('click', clearSelection);

// Auto-seleccionar cajón cuando se llega desde un QR
const urlParams = new URLSearchParams(window.location.search);
const qrSpot = parseInt(urlParams.get('spot'), 10);
if (qrSpot >= 1 && qrSpot <= TOTAL_SPOTS) {
  selectedSpotId = qrSpot;

  const banner     = document.getElementById('qrBanner');
  const bannerText = document.getElementById('qrBannerText');
  bannerText.textContent = `Tu cajón asignado: #${qrSpot}`;
  banner.classList.remove('hidden');

  setTimeout(() => {
    const target = parkingMap.querySelector(`[data-spot-id="${qrSpot}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 1800);
}
