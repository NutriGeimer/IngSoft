import { db } from "./firebase-config.js";
import { collection, doc, getDocs, query, where, updateDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { logAccess } from "./historialAccesos.js";

const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const barrierVisual = document.getElementById('barrier-visual');
const barrierArm = document.getElementById('barrier-arm');

async function validarToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        mostrarError("No se detectó un token válido.");
        return;
    }

    try {
        const docRef = doc(db, "tokens_salida", token);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().active === true) {
            // Procesar la salida
            await procesarSalida(token, docSnap.data());
        } else {
            mostrarError("Este código ya fue usado o no existe.");
        }
    } catch (error) {
        console.error(error);
        mostrarError("Error de conexión con la colmena.");
    }
}

async function procesarSalida(token, tokenData) {
    try {
        const uid = tokenData.uid;
        const userEmail = tokenData.email;

        // Buscar el cajón ocupado por este usuario
        const spotsQuery = query(
            collection(db, "parkingSpots"),
            where("occupiedByUid", "==", uid)
        );
        const spotSnapshot = await getDocs(spotsQuery);

        if (spotSnapshot.empty) {
            mostrarError("No se encontró ningún cajón ocupado por este usuario.");
            // Invalidar el token de todas formas
            await updateDoc(doc(db, "tokens_salida", token), { active: false, usedAt: serverTimestamp() });
            return;
        }

        const spotDoc = spotSnapshot.docs[0];
        const spotId = spotDoc.data().id;
        const userName = spotDoc.data().occupiedBy || userEmail;

        // Marcar el token como usado
        await updateDoc(doc(db, "tokens_salida", token), {
            active: false,
            usedAt: serverTimestamp()
        });

        // Liberar el cajón
        await updateDoc(spotDoc.ref, {
            occupiedBy: null,
            occupiedByUid: null,
            updatedAt: serverTimestamp(),
        });

        // Registrar la salida en el historial
        try {
            await logAccess({
                uid: uid,
                userName: userName,
                spotId: spotId,
                action: "salida",
            });
        } catch (historialError) {
            console.warn("No se pudo registrar en historial:", historialError);
        }

        mostrarExito();
    } catch (error) {
        console.error("Error procesando salida:", error);
        mostrarError("Error al procesar la salida. Intenta de nuevo.");
    }
}

function mostrarExito() {
    statusIcon.innerHTML = '<i data-lucide="check-circle" class="text-green-500 w-16 h-16"></i>';
    statusTitle.innerText = "Salida completada";
    statusTitle.classList.add("text-green-600");
    statusMessage.innerText = "Tu salida del parking se completó correctamente. Puedes cerrar esta página.";
    barrierVisual.classList.remove('hidden');
    
    setTimeout(() => {
        barrierArm.style.transform = "rotate(-45deg) translateY(-20px)";
        lucide.createIcons();
    }, 100);
    lucide.createIcons();
}

function mostrarError(mensaje) {
    statusIcon.innerHTML = '<i data-lucide="x-circle" class="text-red-500 w-16 h-16"></i>';
    statusTitle.innerText = "Error";
    statusTitle.classList.add("text-red-600");
    statusMessage.innerText = mensaje;
    lucide.createIcons();
}

validarToken();
