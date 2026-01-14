// Espera que o HTML esteja todo carregado antes de executar o script
document.addEventListener('DOMContentLoaded', () => {

    // 1. "Agarrar" os elementos do HTML pelos seus IDs
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageElement = document.getElementById('message');

    // 2. Adicionar um "escutador" para o evento de submit do formulário
    loginForm.addEventListener('submit', async (event) => {
        // 3. Prevenir o comportamento padrão do formulário (que é recarregar a página)
        event.preventDefault();

        // 4. Obter os valores dos campos
        const email = emailInput.value;
        const password = passwordInput.value;

        // 5. Criar o objeto de dados para enviar
        const data = {
            email: email,
            password: password
        };

        // 6. Enviar os dados para o servidor (Node.js) usando a API fetch()
        // (Estamos a assumir que o nosso servidor Node.js está a correr e
        // a "ouvir" no 'http://localhost:3000/login')
        try {
            const response = await fetch('http://localhost:3002/login', {
                method: 'POST', // Estamos a enviar dados
                headers: {
                    'Content-Type': 'application/json' // O formato dos dados
                },
                body: JSON.stringify(data) // Convertemos os dados para uma string JSON
            });

            const result = await response.json(); // Esperamos a resposta do servidor

            // 7. Mostrar a resposta do servidor ao utilizador
            if (response.ok) { // Se o status for 2xx (ex: 200 OK)
                messageElement.textContent = result.message; // Ex: "Login com sucesso!"
                messageElement.style.color = 'green';
                // Aqui poderíamos redirecionar o utilizador, ex:
                // window.location.href = '/dashboard';
            } else {
                messageElement.textContent = result.message; // Ex: "Credenciais inválidas"
                messageElement.style.color = 'red';
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            messageElement.textContent = 'Erro de conexão com o servidor.';
            messageElement.style.color = 'red';
        }
    });
});