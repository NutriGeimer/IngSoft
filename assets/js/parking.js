const TOTAL_SPOTS = 50;
const STORAGE_KEY = 'parkingSpotsStatus';
const USER_SESSION_KEY = 'parkingCurrentUser';

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
let currentUser = getCurrentUser();

function getCurrentUser() {
  let user = sessionStorage.getItem(USER_SESSION_KEY);
  if (!user) {
    user = prompt('Ingresa tu nombre de usuario para esta sesión:', 'Usuario1') || `Usuario_${Math.floor(Math.random() * 1000)}`;
    sessionStorage.setItem(USER_SESSION_KEY, user);
  }
  return user;
}

function loadSpots() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === TOTAL_SPOTS) {
        spots = parsed.map((spot) => ({
          id: spot.id,
          occupiedBy: spot.occupiedBy || null,
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
  }));
  saveSpots();
}

function saveSpots() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
}

function getCurrentUserSpot() {
  return spots.find((spot) => spot.occupiedBy === currentUser) || null;
}

function renderMap() {
  parkingMap.innerHTML = '';

  spots.forEach((spot) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot';
    slot.classList.add(spot.occupiedBy ? 'slot-occupied' : 'slot-free');
    if (spot.id === selectedSpotId) {
      slot.classList.add('slot-selected');
    }
    if (spot.occupiedBy === currentUser) {
      slot.classList.add('slot-mine');
    }

    const statusLabel = spot.occupiedBy
      ? spot.occupiedBy === currentUser
        ? 'Ocupado por ti'
        : 'Ocupado'
      : 'Libre';

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

function occupySelectedSpot() {
  if (selectedSpotId === null) {
    return;
  }

  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId);
  const currentUserSpot = getCurrentUserSpot();

  if (!selectedSpot || selectedSpot.occupiedBy !== null) {
    return;
  }

  if (currentUserSpot) {
    alert(`Ya tienes el cajón ${currentUserSpot.id} ocupado. Libéralo antes de ocupar otro.`);
    return;
  }

  selectedSpot.occupiedBy = currentUser;
  saveSpots();
  renderMap();
}

function leaveSelectedSpot() {
  const currentUserSpot = getCurrentUserSpot();
  if (!currentUserSpot) {
    return;
  }

  currentUserSpot.occupiedBy = null;
  if (selectedSpotId === currentUserSpot.id) {
    selectedSpotId = null;
  }
  saveSpots();
  renderMap();
}

function resetSpots() {
  if (!confirm('¿Deseas reiniciar todos los estados y dejar los 50 lugares libres?')) {
    return;
  }

  spots = spots.map((spot) => ({ ...spot, occupiedBy: null }));
  selectedSpotId = null;
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

loadSpots();
renderMap();
