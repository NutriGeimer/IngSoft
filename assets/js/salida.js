import { db, auth } from "./firebase-config.js";
import { collection, doc, getDocs, query, where, updateDoc, serverTimestamp, getDoc,} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getCurrentUserProfile, logoutUser } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

import { logAccess } from "./historialAccesos.js";

const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const barrierVisual = document.getElementById('barrier-visual');
const barrierArm = document.getElementById('barrier-arm');


let spots = [];
let selectedSpotId = null;
let firebaseUser = null; //Se llena cuando Firebase confirma la sesion
let userName = "Usuario";

async function validarToken() {
    const urlParams = new URLSearchParams(window.location.search); //leer url
    const token = urlParams.get('token');

    //verifica que haya token en la url
    if (!token) {
        mostrarError("No se detectó un token válido.");
        return;
    }

    try {
       //buscar token
        const docRef = doc(db, "tokens_salida", token);
        const docSnap = await getDoc(docRef);
       
        //si todo sale bien
        if (docSnap.exists() && docSnap.data().active === true) {
            await updateDoc(docRef, { active: false }); //desactivar token
            await leaveSelectedSpot(); //quitar lugar seleccionado
            mostrarExito(); //mostrar exito y salir

        } else {
            mostrarError("Este código ya fue usado o no existe.");
            }
        } catch (error) {
            console.error(error);
            mostrarError("Error de conexión con la colmena.");
        }

}

function mostrarExito() {
    statusIcon.innerHTML = '<i data-lucide="check-circle" class="text-green-500 w-16 h-16"></i>';
    statusTitle.innerText = "Salida Concedido!";
    statusTitle.classList.add("text-green-600");
    statusMessage.innerText = "Levantando plumilla. Nos vemos abeja.";
    barrierVisual.classList.remove('hidden');
    
    setTimeout(() => {
                barrierArm.style.transform = "rotate(-45deg) translateY(-20px)";
                lucide.createIcons();
            }, 100);
    // cerrar sesión
    setTimeout( async () => {
                await logoutUser();
                window.location.href = 'login.html';
            }, 2000);
            
    lucide.createIcons();
}

function mostrarError(mensaje) {
    statusIcon.innerHTML = '<i data-lucide="x-circle" class="text-red-500 w-16 h-16"></i>';
    statusTitle.innerText = "Acceso Denegado";
    statusTitle.classList.add("text-red-600");
    statusMessage.innerText = mensaje;
    lucide.createIcons();
}

async function leaveSelectedSpot() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  let tokenData;

  const docRef = doc(db, "tokens_salida", token);
  const docSnap = await getDoc(docRef);
  tokenData = docSnap.data();

  const uid      = tokenData.uid;
  const userEmail = tokenData.email;

  let spotDoc;

    
    try {
        const spotsQuery = query(
          collection(db, "parkingSpots"),
          where("occupiedByUid", "==", uid)
        );
        const snapshot = await getDocs(spotsQuery);
    
        if (snapshot.empty) {
          mostrarError("No se encontró ningún cajón ocupado por este usuario.");
          //invalidar el token de todas formas para evitar reuso
          await updateDoc(doc(db, "tokens_salida", token), { active: false });
          return;
        }
    
        spotDoc = snapshot.docs[0];

      } catch (error) {
        console.error("Error al buscar el cajón:", error);
        mostrarError("Error al buscar tu cajón. Intenta de nuevo.");
        return;
      }

     const spotId   = spotDoc.data().id;
     const userName = spotDoc.data().occupiedBy || userEmail;
   
     // liberar el cajón en Firestore
     try {
       await updateDoc(spotDoc.ref, {
         occupiedBy:    null,
         occupiedByUid: null,
         updatedAt:     serverTimestamp(),
       });
     } catch (error) {
       console.error("Error al liberar el cajón:", error);
       showError("Error al liberar el cajón. Intenta de nuevo.");
       return;
     }
   
     //registrar la salida en el historial
     try {
       await logAccess({
         uid:      uid,
         userName: userName,
         spotId:   spotId,
         action:   "salida",
       });
     } catch (error) {
       console.warn("No se pudo registrar en historial:", error);
     }
   
       
}
// Esto evita que la página corra sin saber quién es el usuario
onAuthStateChanged(auth, (user) => {
  if (!user) {
    validarToken();
    return;
  }
  validarToken();
});
