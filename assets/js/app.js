//Funciones globales

const showAlert=(elementId, message) => {
    const alert=document.getElementById(elementId)
    alert.textContent=message
    alert.classList.remove('d-none')
}

const hideAlert=(elementId) =>{
    const alert=document.getElementById(elementId)
    alert.classList.add('d-none')
}