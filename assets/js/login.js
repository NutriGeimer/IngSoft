import { hideAlert, showAlert, setButtonLoading, loginUser, resetPassword, observeAuth, getFirebaseErrorMessage } from "./auth.js"

const form = document.getElementById('loginForm')
const emailInput = document.getElementById('loginEmail')
const passwordInput = document.getElementById('loginPassword')
const loginBtn = document.getElementById('loginBtn')

observeAuth((user)=>{
    if(user){
        window.location.href = './../../dashboard.html'
    }
})

// Recuperar contraseña
const resetModal    = document.getElementById('resetPasswordModal')
const resetBackdrop = document.getElementById('resetBackdrop')
const resetForm     = document.getElementById('resetForm')
const resetEmail    = document.getElementById('resetEmail')
const resetBtn      = document.getElementById('resetBtn')

function openResetModal() {
    resetEmail.value = ''
    const alertEl = document.getElementById('resetAlert')
    alertEl.className = 'hidden px-4 py-3 rounded-lg mb-md font-body-sm text-body-sm'
    alertEl.textContent = ''
    setButtonLoading(resetBtn, false, 'Enviar enlace')
    resetModal.classList.remove('hidden')
}

function closeResetModal() {
    resetModal.classList.add('hidden')
}

document.getElementById('openResetModal')?.addEventListener('click', openResetModal)
document.getElementById('closeResetModal')?.addEventListener('click', closeResetModal)
resetBackdrop?.addEventListener('click', closeResetModal)

resetForm?.addEventListener('submit', async (e) => {
    e.preventDefault()

    const alertEl = document.getElementById('resetAlert')
    alertEl.className = 'hidden px-4 py-3 rounded-lg mb-md font-body-sm text-body-sm'
    alertEl.textContent = ''

    const email = resetEmail.value.trim()
    if (!email) {
        alertEl.textContent = 'Por favor ingresa tu correo electrónico.'
        alertEl.className = 'px-4 py-3 rounded-lg mb-md font-body-sm text-body-sm bg-red-100 border border-red-400 text-red-700'
        return
    }

    setButtonLoading(resetBtn, true, 'Enviar enlace', 'Enviando...')

    try {
        await resetPassword(email)
        alertEl.textContent = 'Enlace enviado. Revisa tu correo electrónico.'
        alertEl.className = 'px-4 py-3 rounded-lg mb-md font-body-sm text-body-sm bg-green-100 border border-green-400 text-green-700'
        resetForm.reset()
    } catch (error) {
        alertEl.textContent = getFirebaseErrorMessage(error)
        alertEl.className = 'px-4 py-3 rounded-lg mb-md font-body-sm text-body-sm bg-red-100 border border-red-400 text-red-700'
    } finally {
        setButtonLoading(resetBtn, false, 'Enviar enlace')
    }
})

// Inicio de sesión
form?.addEventListener('submit', async(e) => {
    e.preventDefault()

    hideAlert('loginAlert')

    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()

    if(!email || !password){
        showAlert('loginAlert', 'Por favor, completa todos los campos')
        return
    }

    try {
        setButtonLoading(loginBtn, true, 'Iniciar Sesión', 'Iniciando Sesión')
        await loginUser({email, password})
        window.location.href = './../../dashboard.html'

    } catch (error) {
        showAlert('loginAlert', getFirebaseErrorMessage(error))

    } finally {
        setButtonLoading(loginBtn, false, 'Iniciar Sesión')
    }
})
