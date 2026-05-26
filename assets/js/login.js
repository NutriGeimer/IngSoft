import { hideAlert, showAlert, setButtonLoading, loginUser, observeAuth, getFirebaseErrorMessage } from "./auth.js"

const form = document.getElementById('loginForm')
const emailInput = document.getElementById('loginEmail')
const passwordInput = document.getElementById('loginPassword')
const loginBtn = document.getElementById('loginBtn')

observeAuth((user)=>{
    if(user){
        window.location.href = './../../dashboard.html'
    }
})

form?.addEventListener('submit', async(e) => {
    e.preventDefault() //para que no haga refresh la pagina

    hideAlert('loginAlert')

    //.value optiene el valor, sin eso obtiene solo la etiqueta
    const email = emailInput.value.trim() 
    const password = passwordInput.value.trim()

    if(!email || !password){
        showAlert('loginAlert', 'Por favor, completa todos los campos')
        return
    }

    try {
        setButtonLoading(
            loginBtn, 
            true, 
            'Iniciar Sesión', 'Iniciando Sesión'
        )
        await loginUser ({email, password})
        window.location.href = './../../dashboard.html' //redirigir 
        
        
    } catch (error) {
        showAlert('loginAlert', getFirebaseErrorMessage(error))
        
    } finally {
        setButtonLoading(
            loginBtn, 
            false, 
            'Iniciar Sesión'
        )
    }
})

