import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getCurrentUserProfile } from "./auth.js";
import { logAccess } from "./historialAccesos.js";

const TOTAL_SPOTS = 50;
const STORAGE_KEY = 'parkingSpotsStatus';

const parkingMap = document.getElementById('parkingMap');
const currentUserInfo = document.getElementById('currentUserInfo');
const selectedSpotInfo = document.getElementById('selectedSpotInfo');
const occupyButton = document.getElementById('occupyButton');
const resetButton = document.getElementById('resetButton');
const leaveButton = document.getElementById('leaveButton');
const clearSelectionButton = document.getElementById('clearSelectionButton');
const totalFree = document.getElementById('totalFree');
const totalOccupied = document.getElementById('totalOccupied');

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
  loadSpots();
  renderMap();
});


function loadSpots() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === TOTAL_SPOTS) {
        spots = parsed.map((spot) => ({
          id: spot.id,
          occupiedBy: spot.occupiedBy || null,
          occupiedByUid: spot.occupiedByUid || null,
        }));
        return;
      }
    } catch (error) {
      console.warn('Error parsing estado de estacionamiento:', error);
    }
  }

  spots = Array.from({ length: TOTAL_SPOTS }, (_, index) => ({
    id: index + 1,
    occupiedBy: null,
    occupiedByUid: null,
  }));
  saveSpots();
}

function saveSpots() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
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
      ? spot.occupiedBy === firebaseUser?.uid ? 'Ocupado por ti': 'Ocupado' : 'Libre';

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
  currentUserInfo.textContent = `Usuario en sesión: ${currentUser}`;

  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId) || null;

  if (!selectedSpot) {
    selectedSpotInfo.textContent = currentUserSpot
      ? `Tienes el cajón ${currentUserSpot.id} ocupado`
      : 'Ningún cajón seleccionado';
    occupyButton.disabled = !!currentUserSpot;
    leaveButton.disabled = !currentUserSpot;
    return;
  }

  if (selectedSpot.occupiedBy === currentUser) {
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

  saveSpots();
  renderMap();


  //resgitar entrada en Firestore
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
    saveSpots();
    renderMap();

    //registrar salida en Firestore
    await logAccess({
      uid: firebaseUser?.uid || "anonimo",
      userName: userName,
      spotId: spotId,
      action: "salida",
    });
  }

  function resetSpots() {
  if (!confirm('¿Deseas reiniciar todos los estados y dejar los 50 lugares libres?')) return;
  spots = spots.map((spot) => ({ ...spot, occupiedBy: null, occupiedByUid: null }));
  saveSpots();
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



