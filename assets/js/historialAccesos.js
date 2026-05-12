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
            action,         // "entrada" | "salida"
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

    const tableBody = document.getElementById("historyTableBody");
    const userNameLabel = document.getElementById("userNameLabel");
    const logoutBtn = document.getElementById("logoutBtn");
    const filterAction = document.getElementById("filterAction");
    const filterDate = document.getElementById("filterDate");
    const loadingState = document.getElementById("loadingState");
    const emptyState = document.getElementById("emptyState");
    const totalCount = document.getElementById("totalCount");
    const entryCount = document.getElementById("entryCount");
    const exitCount = document.getElementById("exitCount");

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        const profile = await getCurrentUserProfile(user.uid);
        const displayName = profile?.name || user.email || "Usuario";

        if (userNameLabel) userNameLabel.textContent = displayName;

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
        renderTable(allRecords);
        updateStats(allRecords);
       } catch (err) {
        console.error("Error cargando historial:", err);
       } finally {
        showLoading(false);
       }
    }

    function renderTable(records) {
        tableBody.innerHTML = "";

        if (records.length === 0) {
            emptyState?.classList.remove("hidden");
            return;
        }

        emptyState?.classList.add("hidden");

        records.forEach((record) => {
            const isEntry = record.action === "entrada";
            const row = document.createElement("tr");
            row.className = "border-b border-slate-100 hover:bg-amber-50/40 transition-colors";
            
            row.innerHTML = `
                <td class="px-6 py-4">
                  <div class="h-9 w-9 rounded-lg flex items-center justify-center ${isEntry ? "bg-green-100" : "bg-slate-100"}">
                    <span class="material-symbols-outlined text-sm ${isEntry ? "text-green-700" : "text-slate-500"}">
                      ${isEntry ? "login" : "logout"}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${isEntry ? "bg-green-100 text-green-800" : "bg-slate-800 text-white"}">
                    ${isEntry ? "Entrada" : "Salida"}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class="font-bold text-on-surface">Cajón ${record.spotId}</span>
                </td>
                <td class="px-6 py-4 text-secondary text-sm">
                  ${formatTimestamp(record.timestamp)}
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function updateStats(records) {
        const entries = records.filter((r) => r.action === "entrada").length;
        const exits = records.filter((r) => r.action === "salida").length;
        if (totalCount) totalCount.textContent = records.length;
        if (entryCount) entryCount.textContent = entries;
        if (exitCount) exitCount.textContent = exits;
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

        renderTable(filtered);
        updateStats(filtered);
    }

    function showLoading(show) {
        loadingState?.classList.toggle("hidden", !show);
        tableBody.classList.toggle("hidden", show);
    }

    filterAction?.addEventListener("change", applyFilters);
    filterDate?.addEventListener("change", applyFilters);

    document.getElementById("clearFilters")?.addEventListener("click", () => {
        if (filterAction) filterAction.value = "todos";
        if (filterDate) filterDate.value = "";
        renderTable(allRecords);
        updateStats(allRecords);
    });

    document.getElementById("refreshBtn")?.addEventListener("click", () => {
        location.reload();
    });
}