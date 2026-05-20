import { hideAlert, showAlert, setButtonLoading, registerUser, getFirebaseErrorMessage } from "./auth.js"
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const form=document.getElementById('registerForm')
const nameInput=document.getElementById('name')
const emailInput=document.getElementById('email')
const plateInput=document.getElementById('plates')
const passwordInput=document.getElementById('password')
const confirmPasswordInput=document.getElementById('confirmPassword')
const registerBtn= document.getElementById('registerBtn')
const successBox=document.getElementById('registerSuccess')

form?.addEventListener('submit', async (e)=>{
    e.preventDefault()
   
    hideAlert('registerAlert')
  
    const name= nameInput.value.trim() 
    const email= emailInput.value.trim()
    const nplates=plateInput.value.trim() 
    const password= passwordInput.value.trim() 
    const confirmPassword= confirmPasswordInput.value.trim() 

    if(!name || !email || !password || !confirmPassword || !nplates){
        showAlert('registerAlert', 'Todos los datos son onligatorios')
        return
    }

    if (password.length < 6){
        showAlert('registerAlert', 'La contraseña debe tener más de 6 caracteres')
        return
    }

    if(password !== confirmPassword){
        showAlert('registerAlert', 'Las contraseñas no son iguales ')   
        return    
    }

    const q = query(collection(db, 'users'), where('nplates', '==', nplates))
    const placaExistente = await getDocs(q)

    if(!placaExistente.empty){
        showAlert('registerAlert', 'Esta placa ya está registrada en el sistema')
        return
    }


    try {
        setButtonLoading(registerBtn,true, '<i class="bi bi-person-check me-2"></i> crear cuenta', 
            'creando cuenta'
        )
        await registerUser({name,email, password, nplates})
 
       setTimeout(()=>{
        window.location.href='./login.html'
       }, 1200)
    
    }catch(error){
        showAlert('registerAlert', getFirebaseErrorMessage(error))

        }finally{

            setButtonLoading(registerBtn,false, '<i class="bi bi-person-check me-2"></i> crear cuenta', 
            'creando cuenta'
        )    
    }


    
})