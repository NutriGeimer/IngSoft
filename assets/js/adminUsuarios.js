import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  collection, getDocs, doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getCurrentUserProfile, logoutUser } from "./auth.js";
import { formatTimestamp } from "./historialAccesos.js";

let allUsers = [];
let currentAdminUid = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  const profile = await getCurrentUserProfile(user.uid);
  if (profile?.role !== "admin") { window.location.href = "dashboard.html"; return; }

  currentAdminUid = user.uid;
  const label = document.getElementById("userNameLabel");
  if (label) label.textContent = profile?.name || user.email;

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await logoutUser();
    window.location.href = "login.html";
  });

  await loadUsers();
});

async function loadUsers() {
  showLoading(true);
  try {
    const snap = await getDocs(collection(db, "users"));
    allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    allUsers.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
    applyFilters();
    updateStats();
  } catch (err) {
    console.error("Error cargando usuarios:", err);
  } finally {
    showLoading(false);
  }
}

function updateStats() {
  const active = allUsers.filter(u => !u.deleted).length;
  const deleted = allUsers.filter(u => u.deleted).length;
  document.getElementById("statTotal").textContent = allUsers.length;
  document.getElementById("statActive").textContent = active;
  document.getElementById("statDeleted").textContent = deleted;
}

function applyFilters() {
  const search = document.getElementById("filterSearch")?.value.toLowerCase() || "";
  const role = document.getElementById("filterRole")?.value || "todos";
  const showDeleted = document.getElementById("showDeleted")?.checked || false;

  let filtered = allUsers.filter(u => {
    if (!showDeleted && u.deleted) return false;
    if (role !== "todos" && u.role !== role) return false;
    if (search) {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      if (!name.includes(search) && !email.includes(search)) return false;
    }
    return true;
  });

  renderTable(filtered);
}

function renderTable(users) {
  const tbody = document.getElementById("usersTableBody");
  const empty = document.getElementById("emptyState");

  tbody.innerHTML = "";

  if (users.length === 0) {
    empty.classList.remove("hidden");
    tbody.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  tbody.classList.remove("hidden");

  users.forEach(user => {
    const isAdmin = user.role === "admin";
    const isDeleted = !!user.deleted;
    const isSelf = user.uid === currentAdminUid;

    const tr = document.createElement("tr");
    tr.className = `border-b border-slate-100 hover:bg-amber-50/40 transition-colors ${isDeleted ? "row-deleted" : ""}`;

    tr.innerHTML = `
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-sm">
            ${(user.name || user.email || "?")[0].toUpperCase()}
          </div>
          <span class="font-semibold text-slate-900">${user.name || "—"}</span>
          ${isSelf ? '<span class="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">Tú</span>' : ""}
        </div>
      </td>
      <td class="px-6 py-4 text-slate-600">${user.email || "—"}</td>
      <td class="px-6 py-4 text-slate-600">${user.nplates || "—"}</td>
      <td class="px-6 py-4">
        ${isAdmin
          ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">Admin</span>'
          : '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">Usuario</span>'
        }
      </td>
      <td class="px-6 py-4 text-slate-500 text-sm">${formatTimestamp(user.createdAt)}</td>
      <td class="px-6 py-4">
        ${isDeleted
          ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-700">Eliminado</span>'
          : '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-green-100 text-green-700">Activo</span>'
        }
      </td>
      <td class="px-6 py-4">
        ${isSelf
          ? '<span class="text-xs text-slate-300 italic">—</span>'
          : isDeleted
            ? `<button data-uid="${user.uid}" class="btn-restore text-xs font-semibold text-green-700 hover:text-green-900 border border-green-300 rounded-full px-3 py-1 transition hover:bg-green-50">Restaurar</button>`
            : `<button data-uid="${user.uid}" class="btn-delete text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 rounded-full px-3 py-1 transition hover:bg-red-50">Eliminar</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", () => softDelete(btn.dataset.uid));
  });
  tbody.querySelectorAll(".btn-restore").forEach(btn => {
    btn.addEventListener("click", () => restoreUser(btn.dataset.uid));
  });
}

async function softDelete(uid) {
  if (!confirm("¿Eliminar este usuario? (Borrado lógico, puede restaurarse)")) return;
  try {
    await updateDoc(doc(db, "users", uid), { deleted: true, deletedAt: serverTimestamp() });
    const u = allUsers.find(u => u.id === uid);
    if (u) u.deleted = true;
    applyFilters();
    updateStats();
  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    alert("No se pudo eliminar el usuario.");
  }
}

async function restoreUser(uid) {
  try {
    await updateDoc(doc(db, "users", uid), { deleted: false, deletedAt: null });
    const u = allUsers.find(u => u.id === uid);
    if (u) u.deleted = false;
    applyFilters();
    updateStats();
  } catch (err) {
    console.error("Error al restaurar usuario:", err);
    alert("No se pudo restaurar el usuario.");
  }
}

function showLoading(show) {
  document.getElementById("loadingState")?.classList.toggle("hidden", !show);
  document.getElementById("usersTableBody")?.classList.toggle("hidden", show);
}

document.getElementById("filterSearch")?.addEventListener("input", applyFilters);
document.getElementById("filterRole")?.addEventListener("change", applyFilters);
document.getElementById("showDeleted")?.addEventListener("change", applyFilters);
document.getElementById("refreshBtn")?.addEventListener("click", () => location.reload());
