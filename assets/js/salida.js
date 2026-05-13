import { db, auth } from "./firebase-config.js";
import {
    doc, 
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs,
    writeBatch,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getCurrentUserProfile } from "./auth.js";
import { logAccess } from "./historialAccesos.js";

const SPOTS_COLLECTION = "parkingSpots";

if (document.getElementById("exitQrModal")) {
    let firebaseUser = null;
    let userName = "Usuario";

    const exitQrBtn = document.getElementById("exitQrBtn");
    const exitQrModal = document.getElementById("exitQrModal");
    const closeExitModal = document.getElementById("closeExitModal");
    const exitQrContainer = document.getElementById("exitQrcode");

    onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        firebaseUser = user;
        const profile = await getCurrentUserProfile(user.uid);
        userName = profile?.name || user.email || "Usuario";
    });

    const showExitModal = async () => {
        exitQrContainer.innerHTML = "";
        exitQrModal.classList.remove("hidden");

        const token = "salida_" + Math.random().toString(36).substring(2, 15);
        const base = window.location.href.substring(
            0, window.location.href.lastIndexOf("/") +1
        );
        const url = `${base}salida.html?token=${token}`;

        try {
            await setDoc(doc(db, "tokens_salida", token), {
                active: true,
                uid: firebaseUser?.uid || null,
                userName: userName,
                createdAt: serverTimestamp(),
                url: url,
            });

            new QRCode(exitQrContainer, {
                text: url, 
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H,
            });
        } catch(error) {
            console.error("Error al generar QR de salida:", error);
            exitQrContainer.innerHTML =
            '<p class="text-red-500 text-sm text-center">Error al generar código</p>';
        }
    };

    exitQrBtn?.addEventListener("click", showExitModal);

    closeExitModal?.addEventListener("click", () =>
        exitQrModal.classList.add("hidden")
    );

    exitQrModal?.addEventListener("click", (e) => {
        if (e.target === exitQrModal) exitQrModal.classList.add("hidden");
    });
}

if (document.getElementById("salidaStatus")) {
    const statusIcon = document.getElementById("status-icon");
    const statusTittle = document.getElementById("status-tittle");
    const statusMessage = document.getElementById("status-message");

    async function validarSalida() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if(!token) {
            mostrarError("No se detecto un token de salida valido.");
            return;
        }

        try {
            const docRef = doc(db, "tokens_salida", token);
            const docSnap = await getDoc(docRef);
            
            if(!docSnap.exists() || docSnap.data().active !== true) {
                mostrarError("Este código ya fue usado o no es válido.");
                return;
            }

            const { uid, userName } = docSnap.data();

            await updateDoc(docRef, {
                active: false,
                usedAt: serverTimestamp(),
            });

            const spotsQuery = query(
                collection(db, SPOTS_COLLECTION),
                where("occupiedByUid", "==", uid)
            );
            const spotsSnap = await getDocs(spotsQuery);
            let spotId = null;

            if(!spotsSnap.empty) {
                const batch = writeBatch(db);

                spotsSnap.forEach((spotDoc) => {
                    spotId = spotDoc.data().id;
                    batch.update(doc(db, SPOTS_COLLECTION, spotDoc.id), {
                        occupiedBy: null,
                        occupiedByUid: null,
                        updateAt: serverTimestamp(),
                    });
                });

                await batch.commit();

                await logAccess({
                    uid, 
                    userName,
                    spotId,
                    action: "salida",
                });
            }
            
            mostrarExito();
            } catch (error) {
                console.error("Error al valida salida:", error);
                mostrarError("Error de conexión. Intenta de nuevo.");
        }
    }

    function mostrarExito() {
        statusIcon.innerHTML = `
            <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <span class="material-symbols-outlined text-4xl text-amber-600"
                    style="font-variation-settings:'FILL' 1">check_circle</span>
            </div>`;
            statusTittle.textContent = "¡Salida Registrada!";
            statusTittle.className = "text-2xl font-bold text-green-700 mb-2";
            statusMessage.textContent = "Tu cajón fue liberado. ¡Hasta pronto en BeeParking!";

            setTimeout(() => {
                window.location.href = "historialAccesos.html";
            }, 3000);
    }

    function mostrarError(mensaje) {
        statusIcon.innerHTML = `
        <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <span class="material-symbols-outlined text-4xl text-red-500"
                    style="font-variation-settings:'FILL' 1">cancel</span>
            </div>`;
            statusTittle.textContent = "Acceso Denegado";
            statusTittle.className = "text-2xl font-bold text-red-600 mb-2";
            statusMessage.textContent = mensaje;
    }
    validarSalida();
}

export function setExitBtnState(hasSpot) {
    const exitQrBtn = document.getElementById("exitQrBtn");
    if (exitQrBtn) exitQrBtn.disabled = !hasSpot;
}
