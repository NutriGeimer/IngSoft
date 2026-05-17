import { db, auth } from "./firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    where,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getCurrentUserProfile, logoutUser } from "./auth.js";

const COLLECTION = "accessHistory";

export async function logAccess({ uid, userName, spotId, action}) {
    try {
        await addDoc(collection(db, COLLECTION), {
            uid,
            userName,
            spotId,
            action,         
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error al registrar acceso:", error);
    }
}

export async function getUserAccessHistory(uid) {
    const q = query(
        collection(db, COLLECTION),
        where("uid", "==", uid),
        orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export function formatTimestamp(timestamp) {
    if (!timestamp) return "-";
    const date = timestamp.toDate();
    return date.toLocaleString("es-MX", {
        day: "2-digit",
        month: "short", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

if (document.getElementById("historyTableBody")) {
    let currentUser = null;
    let allRecords = [];
    
    let currentPage = 1;
    const itemsPerPage = 8;
    let currentRecordsForPagination = [];

    const tableBody = document.getElementById("historyTableBody");
    const userNameLabel = document.getElementById("userNameLabel");
    const logoutBtn = document.getElementById("logoutBtn");
    
    const loadingState = document.getElementById("loadingState");
    const emptyState = document.getElementById("emptyState");
    const totalCount = document.getElementById("totalCount");
    const entryCount = document.getElementById("entryCount");
    const exitCount = document.getElementById("exitCount");

    const filterAction = document.getElementById("filterAction");
    const filterDate = document.getElementById("filterDate");
    const filterSpot = document.getElementById("filterSpot");
    const sortOrder = document.getElementById("sortOrder");

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        const profile = await getCurrentUserProfile(user.uid);
        const displayName = profile?.name || user.email || "Usuario";
        if (userNameLabel) userNameLabel.textContent = displayName;
        if (profile?.role === "admin") {
            const adminLink = document.getElementById('adminNavLink');
            if (adminLink) { adminLink.classList.remove('hidden'); adminLink.style.display = 'inline'; }
        }

        logoutBtn?.addEventListener('click', async () => {
          await logoutUser();
          window.location.href = 'login.html';
        });
        await loadHistory(user.uid);
    });

    async function loadHistory(uid) {
       showLoading(true);
       try {
        allRecords = await getUserAccessHistory(uid);
        currentPage = 1; 
        renderTable(allRecords);
        updateStats(allRecords);
       } catch (err) {
        console.error("Error cargando historial:", err);
       } finally {
        showLoading(false);
       }
    }

    // Función auxiliar matemática para ordenar por tiempo
    function getDurationMs(currentRecord) {
        if (currentRecord.action === "salida") return -1;
        
        const realIndex = allRecords.findIndex(r => r.id === currentRecord.id);
        if (realIndex === -1) return -1;

        let salidaRecord = null;
        for (let i = realIndex - 1; i >= 0; i--) {
            const temp = allRecords[i];
            if (temp.spotId === currentRecord.spotId) {
                if (temp.action === "salida") { salidaRecord = temp; break; } 
                else if (temp.action === "entrada") { break; }
            }
        }

        if (!salidaRecord) {
            if (!currentRecord.timestamp) return -1;
            return new Date().getTime() - currentRecord.timestamp.toDate().getTime();
        }

        if (!currentRecord.timestamp || !salidaRecord.timestamp) return -1;
        return salidaRecord.timestamp.toDate().getTime() - currentRecord.timestamp.toDate().getTime();
    }

    function calculateDuration(currentRecord) {
        if (currentRecord.action === "salida") return '<span class="text-slate-400">-</span>';
        
        const diffMs = getDurationMs(currentRecord);
        if (diffMs < 0) return '<span class="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">En curso</span>';

        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        if (hours > 0) return `<span class="font-bold text-slate-700">${hours}h ${mins}m</span>`;
        return `<span class="font-bold text-slate-700">${mins} min</span>`;
    }

    function renderPagination(totalPages) {
        const wrapper = document.getElementById("paginationWrapper");
        if (!wrapper) return;
        wrapper.innerHTML = "";

        if (totalPages <= 1) return; 

        const prevBtn = document.createElement("button");
        prevBtn.innerHTML = '<span class="material-symbols-outlined text-sm">chevron_left</span>';
        prevBtn.className = `h-9 w-9 flex items-center justify-center rounded-full border ${currentPage === 1 ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-outline text-secondary hover:bg-surface-container-low transition-colors'}`;
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderTable(currentRecordsForPagination); } };
        wrapper.appendChild(prevBtn);

        let pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) pages = [1, 2, 3, 4, '...', totalPages];
            else if (currentPage >= totalPages - 2) pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            else pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }

        pages.forEach(p => {
            if (p === '...') {
                const span = document.createElement('span');
                span.textContent = '...';
                span.className = 'px-1 text-secondary font-bold';
                wrapper.appendChild(span);
            } else {
                const btn = document.createElement('button');
                btn.textContent = p;
                const isActive = p === currentPage;
                btn.className = `h-9 w-9 flex items-center justify-center rounded-full font-button text-sm transition-colors ${isActive ? 'bg-primary-container text-on-primary-container font-black shadow-sm' : 'text-secondary hover:bg-surface-container-low'}`;
                btn.onclick = () => { currentPage = p; renderTable(currentRecordsForPagination); };
                wrapper.appendChild(btn);
            }
        });

        const nextBtn = document.createElement("button");
        nextBtn.innerHTML = '<span class="material-symbols-outlined text-sm">chevron_right</span>';
        nextBtn.className = `h-9 w-9 flex items-center justify-center rounded-full border ${currentPage === totalPages ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-outline text-secondary hover:bg-surface-container-low transition-colors'}`;
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(currentRecordsForPagination); } };
        wrapper.appendChild(nextBtn);
    }

    function renderTable(records) {
        tableBody.innerHTML = "";
        currentRecordsForPagination = records; 

        if (records.length === 0) {
            emptyState?.classList.remove("hidden");
            const wrapper = document.getElementById("paginationWrapper");
            if(wrapper) wrapper.innerHTML = "";
            return;
        }

        emptyState?.classList.add("hidden");

        const totalPages = Math.ceil(records.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);

        paginatedRecords.forEach((record) => {
            const isEntry = record.action === "entrada";
            const row = document.createElement("tr");
            row.className = "border-b border-slate-100 hover:bg-amber-50/40 transition-colors";
            
            const durationHTML = calculateDuration(record);
            
            row.innerHTML = `
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
                  <span class="font-bold text-on-surface">Cajón ${record.spotId}</span>
                </td>
                <td class="px-6 py-4 text-secondary text-sm">
                  ${formatTimestamp(record.timestamp)}
                </td>
                <td class="px-6 py-4 text-sm">
                  ${durationHTML}
                </td>
            `;
            tableBody.appendChild(row);
        });

        renderPagination(totalPages);
    }

    function updateAdvancedStats(records) {
        const totalTimeEl = document.getElementById("totalTimeStat");
        const favSpotEl = document.getElementById("favoriteSpotStat");
        const lastAccessEl = document.getElementById("lastAccessStat");
        const avgAccessEl = document.getElementById("avgAccessStat");

        if (!records || records.length === 0) {
            if(totalTimeEl) totalTimeEl.textContent = "0h 0m";
            if(favSpotEl) favSpotEl.textContent = "-";
            if(lastAccessEl) lastAccessEl.textContent = "-";
            if(avgAccessEl) avgAccessEl.textContent = "0 accesos";
            return;
        }

        const spotCounts = {};
        const daysSet = new Set();
        let totalEntradas = 0;
        let totalMs = 0;
        let pendingEntradas = {}; 

        const ascRecords = [...records].reverse();

        ascRecords.forEach(record => {
            if (!record.timestamp) return;
            const dateObj = record.timestamp.toDate();
            const dateStr = dateObj.toLocaleDateString("es-MX");

            if (record.action === "entrada") {
                spotCounts[record.spotId] = (spotCounts[record.spotId] || 0) + 1;
                daysSet.add(dateStr);
                totalEntradas++;
                pendingEntradas[record.spotId] = dateObj; 
            } else if (record.action === "salida") {
                if (pendingEntradas[record.spotId]) {
                    totalMs += (dateObj - pendingEntradas[record.spotId]);
                    delete pendingEntradas[record.spotId]; 
                }
            }
        });

        const totalMins = Math.floor(totalMs / 60000);
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        if(totalTimeEl) totalTimeEl.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

        let maxCount = 0;
        let favSpot = "-";
        for (const spot in spotCounts) {
            if (spotCounts[spot] > maxCount) {
                maxCount = spotCounts[spot];
                favSpot = spot;
            }
        }
        if(favSpotEl) favSpotEl.textContent = favSpot !== "-" ? `Cajón ${favSpot}` : "-";

        if(lastAccessEl) {
            const lastR = records[0]; 
            if (lastR && lastR.timestamp) {
                const dateObj = lastR.timestamp.toDate();
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                const timeStr = dateObj.toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit', hour12: true });
                
                if (dateObj.toDateString() === today.toDateString()) {
                    lastAccessEl.textContent = `Hoy ${timeStr}`;
                } else if (dateObj.toDateString() === yesterday.toDateString()) {
                    lastAccessEl.textContent = `Ayer ${timeStr}`;
                } else {
                    lastAccessEl.textContent = `${dateObj.toLocaleDateString("es-MX", { day: '2-digit', month: 'short' })} ${timeStr}`;
                }
            } else {
                lastAccessEl.textContent = "-";
            }
        }

        if(avgAccessEl) {
            const uniqueDays = daysSet.size;
            if (uniqueDays > 0) {
                const avg = (totalEntradas / uniqueDays).toFixed(1);
                avgAccessEl.textContent = `${avg} accesos`;
            } else {
                avgAccessEl.textContent = "0 accesos";
            }
        }
    }

    function updateStats(records) {
        const entries = records.filter((r) => r.action === "entrada").length;
        const exits = records.filter((r) => r.action === "salida").length;
        if (totalCount) totalCount.textContent = records.length;
        if (entryCount) entryCount.textContent = entries;
        if (exitCount) exitCount.textContent = exits;
        updateAdvancedStats(records);
    }

    function applyFilters() {
        let filtered = [...allRecords];

        const action = filterAction?.value;
        if (action && action !== "todos") {
            filtered = filtered.filter((r) => r.action === action);
        }

        const date = filterDate?.value;
        if (date) {
            filtered = filtered.filter((r) => {
                if (!r.timestamp) return false;
                const dateStr = r.timestamp.toDate().toISOString().split("T")[0];
                return dateStr === date;
            });
        }

        // Bloquear negativos y cero dinámicamente
        let spot = filterSpot?.value;
        if (spot !== "" && parseInt(spot) < 1) {
            filterSpot.value = "1";
            spot = "1";
        }
        if (spot) {
            filtered = filtered.filter((r) => String(r.spotId) === String(spot));
        }

        const sort = sortOrder?.value;
        if (sort === "asc") {
            filtered = filtered.reverse();
        } else if (sort === "time_desc") {
            filtered.sort((a, b) => getDurationMs(b) - getDurationMs(a));
        }

        currentPage = 1; 
        renderTable(filtered);
        updateStats(filtered);
    }

    function showLoading(show) {
        loadingState?.classList.toggle("hidden", !show);
        tableBody.classList.toggle("hidden", show);
    }

    filterAction?.addEventListener("change", applyFilters);
    filterDate?.addEventListener("change", applyFilters);
    filterSpot?.addEventListener("input", applyFilters); 
    sortOrder?.addEventListener("change", applyFilters);

    document.getElementById("clearFilters")?.addEventListener("click", () => {
        if (filterAction) filterAction.value = "todos";
        if (filterDate) filterDate.value = "";
        if (filterSpot) filterSpot.value = "";
        if (sortOrder) sortOrder.value = "desc";
        
        currentPage = 1; 
        renderTable(allRecords);
        updateStats(allRecords);
    });

    document.getElementById("refreshBtn")?.addEventListener("click", () => {
        location.reload();
    });
}