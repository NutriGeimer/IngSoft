import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  collection, doc, getDocs, query, orderBy,
  updateDoc, writeBatch, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getCurrentUserProfile, logoutUser } from "./auth.js";

const TOTAL_SPOTS = 50;
const SPOTS_COLLECTION = "parkingSpots";

let spots = [];
let selectedSpots = new Set();

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  const profile = await getCurrentUserProfile(user.uid);
  if (profile?.role !== "admin") { window.location.href = "dashboard.html"; return; }

  const label = document.getElementById("userNameLabel");
  if (label) label.textContent = profile?.name || user.email;

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await logoutUser();
    window.location.href = "login.html";
  });

  initMap();
});

function initMap() {
  const spotsQuery = query(collection(db, SPOTS_COLLECTION), orderBy("id"));

  onSnapshot(spotsQuery, (snap) => {
    spots = snap.docs.map(d => ({
      id: d.data().id,
      occupiedBy: d.data().occupiedBy || null,
      occupiedByUid: d.data().occupiedByUid || null,
      reservedByAdmin: d.data().reservedByAdmin || false,
      reservationLabel: d.data().reservationLabel || null,
    }));

    // Remove selected spots that are no longer free
    for (const id of selectedSpots) {
      const spot = spots.find(s => s.id === id);
      if (!spot || spot.occupiedBy || spot.reservedByAdmin) selectedSpots.delete(id);
    }

    renderMap();
    renderReservedList();
    updateSelectionUI();
    document.getElementById("mapLoading")?.classList.add("hidden");
    document.getElementById("adminParkingMap")?.classList.remove("hidden");
  });
}

function renderMap() {
  const map = document.getElementById("adminParkingMap");
  if (!map) return;
  map.innerHTML = "";

  spots.forEach(spot => {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "admin-slot";

    let statusLabel;
    if (spot.reservedByAdmin) {
      slot.classList.add("admin-slot-res", "slot-disabled");
      slot.disabled = true;
      statusLabel = spot.reservationLabel || "Reservado";
    } else if (spot.occupiedBy) {
      slot.classList.add("admin-slot-occ", "slot-disabled");
      slot.disabled = true;
      statusLabel = "Ocupado";
    } else if (selectedSpots.has(spot.id)) {
      slot.classList.add("admin-slot-sel");
      statusLabel = "Seleccionado";
    } else {
      slot.classList.add("admin-slot-free");
      statusLabel = "Libre";
    }

    slot.innerHTML = `
      <span class="admin-slot-number">Cajón ${spot.id}</span>
      <span class="admin-slot-status">${statusLabel}</span>
    `;

    if (!spot.reservedByAdmin && !spot.occupiedBy) {
      slot.addEventListener("click", () => toggleSpot(spot.id));
    }
    map.appendChild(slot);
  });
}

function toggleSpot(id) {
  if (selectedSpots.has(id)) {
    selectedSpots.delete(id);
  } else {
    selectedSpots.add(id);
  }
  renderMap();
  updateSelectionUI();
}

function updateSelectionUI() {
  const info = document.getElementById("selectedSpotsInfo");
  const list = document.getElementById("selectedSpotsList");
  const btn = document.getElementById("reserveBtn");

  list.innerHTML = "";

  if (selectedSpots.size === 0) {
    info.textContent = "Ninguno seleccionado";
    info.classList.remove("hidden");
    btn.disabled = true;
    return;
  }

  info.textContent = `${selectedSpots.size} cajón(es) seleccionado(s)`;
  btn.disabled = false;

  [...selectedSpots].sort((a, b) => a - b).forEach(id => {
    const chip = document.createElement("span");
    chip.className = "inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-bold cursor-pointer hover:bg-amber-200 transition";
    chip.innerHTML = `Cajón ${id} <span class="text-amber-500 font-black">×</span>`;
    chip.addEventListener("click", () => { selectedSpots.delete(id); renderMap(); updateSelectionUI(); });
    list.appendChild(chip);
  });
}

function renderReservedList() {
  const list = document.getElementById("reservedList");
  const empty = document.getElementById("reservedListEmpty");
  const releaseAllBtn = document.getElementById("releaseAllBtn");
  const reserved = spots.filter(s => s.reservedByAdmin);

  list.innerHTML = "";

  if (reserved.length === 0) {
    empty.classList.remove("hidden");
    releaseAllBtn.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  releaseAllBtn.classList.remove("hidden");

  reserved.forEach(spot => {
    const li = document.createElement("li");
    li.className = "flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-3 py-2";
    li.innerHTML = `
      <div>
        <span class="font-bold text-amber-900 text-sm">Cajón ${spot.id}</span>
        ${spot.reservationLabel ? `<p class="text-xs text-amber-700">${spot.reservationLabel}</p>` : ""}
      </div>
      <button data-id="${spot.id}" class="btn-release text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 rounded-full px-2.5 py-1 transition hover:bg-red-50">
        Liberar
      </button>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll(".btn-release").forEach(btn => {
    btn.addEventListener("click", () => releaseSpot(Number(btn.dataset.id)));
  });
}

async function reserveSelected() {
  if (selectedSpots.size === 0) return;
  const label = document.getElementById("reservationLabel")?.value.trim() || "Reservado";
  const btn = document.getElementById("reserveBtn");

  btn.disabled = true;
  btn.textContent = "Reservando...";

  try {
    const batch = writeBatch(db);
    for (const id of selectedSpots) {
      const spot = spots.find(s => s.id === id);
      if (!spot || spot.occupiedBy || spot.reservedByAdmin) continue;
      const ref = doc(db, SPOTS_COLLECTION, String(id));
      batch.update(ref, {
        reservedByAdmin: true,
        reservationLabel: label,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    selectedSpots.clear();
    document.getElementById("reservationLabel").value = "";
  } catch (err) {
    console.error("Error al reservar cajones:", err);
    alert("No se pudo completar la reserva.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-sm" style=\'font-variation-settings:"FILL" 1\'>lock</span> Reservar seleccionados';
  }
}

async function releaseSpot(id) {
  try {
    await updateDoc(doc(db, SPOTS_COLLECTION, String(id)), {
      reservedByAdmin: false,
      reservationLabel: null,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error al liberar cajón:", err);
    alert("No se pudo liberar el cajón.");
  }
}

async function releaseAll() {
  const reserved = spots.filter(s => s.reservedByAdmin);
  if (reserved.length === 0) return;
  if (!confirm(`¿Liberar los ${reserved.length} cajón(es) reservados por admin?`)) return;

  try {
    const batch = writeBatch(db);
    reserved.forEach(spot => {
      batch.update(doc(db, SPOTS_COLLECTION, String(spot.id)), {
        reservedByAdmin: false,
        reservationLabel: null,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (err) {
    console.error("Error al liberar todos:", err);
    alert("No se pudo liberar todos los cajones.");
  }
}

document.getElementById("reserveBtn")?.addEventListener("click", reserveSelected);
document.getElementById("releaseAllBtn")?.addEventListener("click", releaseAll);
