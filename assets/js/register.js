import { hideAlert, showAlert, setButtonLoading, registerUser, getFirebaseErrorMessage } from "./auth.js"

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
   // successBox?.classList.add('d-none')
   // successBox?.textContent=''

    const name= nameInput.value.trim() 
    const email= emailInput.value.trim()
    const nplates=plateInput.value.trim() 
    const password= passwordInput.value.trim() 
    const confirmPassword= confirmPasswordInput.value.trim() 

    if(!name || !email || !password || !confirmPassword){
        showAlert('registerAlert', 'Todos los datos son onligatorios')
            return
    }

    //Agregar if para contraseña menor a 6 caracteres 


    if(password !== confirmPassword){
        showAlert('registerAlert', 'Las contraseñas no son iguales ')   
        return    
    }

  

    try {
        setButtonLoading(registerBtn,true, '<i class="bi bi-person-check me-2"></i> crear cuenta', 
            'creando cuenta'
        )
        await registerUser({name,email, password, nplates})
       
      // successBox?.textContent='cuenta creada correctamente'
      // successBox?.classList.remove('d-none')

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