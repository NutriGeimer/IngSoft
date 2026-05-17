import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  collection, 
  getDocs, 
  query, 
  orderBy
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getCurrentUserProfile, logoutUser } from "./auth.js";
import { formatTimestamp } from "./historialAccesos.js";

const ITEMS_PER_PAGE = 15;
let allRecords = [];
let currentPage = 1;
let filteredRecords = [];

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

  await loadAccesos();
});

async function loadAccesos() {
  showLoading(true);
  try {
    const q = query(collection(db, "accessHistory"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    allRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    currentPage = 1;
    applyFilters();
  } catch (err) {
    console.error("Error cargando accesos:", err);
  } finally {
    showLoading(false);
  }
}

function applyFilters() {
  const userSearch = document.getElementById("filterUser")?.value.toLowerCase() || "";
  const action = document.getElementById("filterAction")?.value || "todos";
  const date = document.getElementById("filterDate")?.value || "";

  filteredRecords = allRecords.filter(r => {
    if (action !== "todos" && r.action !== action) return false;
    if (date) {
      if (!r.timestamp) return false;
      const d = r.timestamp.toDate().toISOString().split("T")[0];
      if (d !== date) return false;
    }
    if (userSearch) {
      const name = (r.userName || "").toLowerCase();
      if (!name.includes(userSearch)) return false;
    }
    return true;
  });

  updateStats(filteredRecords);
  currentPage = 1;
  renderTable();
}

function updateStats(records) {
  const entries = records.filter(r => r.action === "entrada").length;
  const exits = records.filter(r => r.action === "salida").length;
  document.getElementById("statTotal").textContent = records.length;
  document.getElementById("statEntries").textContent = entries;
  document.getElementById("statExits").textContent = exits;
}

function renderTable() {
  const tbody = document.getElementById("accessTableBody");
  const empty = document.getElementById("emptyState");

  tbody.innerHTML = "";

  if (filteredRecords.length === 0) {
    empty.classList.remove("hidden");
    tbody.classList.add("hidden");
    document.getElementById("paginationWrapper").innerHTML = "";
    return;
  }

  empty.classList.add("hidden");
  tbody.classList.remove("hidden");

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const page = filteredRecords.slice(start, start + ITEMS_PER_PAGE);

  page.forEach(record => {
    const isEntry = record.action === "entrada";
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-amber-50/40 transition-colors";
    tr.innerHTML = `
      <td class="px-6 py-4">
        <div class="h-9 w-9 rounded-lg flex items-center justify-center ${isEntry ? "bg-green-100" : "bg-red-100"}">
          <span class="material-symbols-outlined text-sm ${isEntry ? "text-green-700" : "text-red-600"}">
            ${isEntry ? "login" : "logout"}
          </span>
        </div>
      </td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${isEntry ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}">
          ${isEntry ? "Entrada" : "Salida"}
        </span>
      </td>
      <td class="px-6 py-4">
        <span class="font-semibold text-slate-800">${record.userName || "—"}</span>
      </td>
      <td class="px-6 py-4">
        <span class="font-bold text-on-surface">Cajón ${record.spotId}</span>
      </td>
      <td class="px-6 py-4 text-secondary text-sm">
        ${formatTimestamp(record.timestamp)}
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const wrapper = document.getElementById("paginationWrapper");
  wrapper.innerHTML = "";
  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.innerHTML = '<span class="material-symbols-outlined text-sm">chevron_left</span>';
  prev.className = `h-9 w-9 flex items-center justify-center rounded-full border ${currentPage === 1 ? "border-slate-200 text-slate-300 cursor-not-allowed" : "border-slate-300 text-slate-600 hover:bg-slate-50 transition"}`;
  prev.disabled = currentPage === 1;
  prev.onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
  wrapper.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i !== 1 && i !== totalPages && Math.abs(i - currentPage) > 1) {
      if (i === 2 || i === totalPages - 1) {
        const dots = document.createElement("span");
        dots.textContent = "...";
        dots.className = "px-1 text-slate-400 text-sm";
        wrapper.appendChild(dots);
      }
      continue;
    }
    const btn = document.createElement("button");
    btn.textContent = i;
    const isActive = i === currentPage;
    btn.className = `h-9 w-9 flex items-center justify-center rounded-full text-sm font-semibold transition ${isActive ? "bg-primary-container text-on-primary-container font-black shadow-sm" : "text-secondary hover:bg-surface-container-low"}`;
    btn.onclick = () => { currentPage = i; renderTable(); };
    wrapper.appendChild(btn);
  }

  const next = document.createElement("button");
  next.innerHTML = '<span class="material-symbols-outlined text-sm">chevron_right</span>';
  next.className = `h-9 w-9 flex items-center justify-center rounded-full border ${currentPage === totalPages ? "border-slate-200 text-slate-300 cursor-not-allowed" : "border-slate-300 text-slate-600 hover:bg-slate-50 transition"}`;
  next.disabled = currentPage === totalPages;
  next.onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(); } };
  wrapper.appendChild(next);
}

function showLoading(show) {
  document.getElementById("loadingState")?.classList.toggle("hidden", !show);
  document.getElementById("accessTableBody")?.classList.toggle("hidden", show);
}

document.getElementById("filterUser")?.addEventListener("input", applyFilters);
document.getElementById("filterAction")?.addEventListener("change", applyFilters);
document.getElementById("filterDate")?.addEventListener("change", applyFilters);
document.getElementById("clearFilters")?.addEventListener("click", () => {
  document.getElementById("filterUser").value = "";
  document.getElementById("filterAction").value = "todos";
  document.getElementById("filterDate").value = "";
  applyFilters();
});
document.getElementById("refreshBtn")?.addEventListener("click", () => location.reload());
