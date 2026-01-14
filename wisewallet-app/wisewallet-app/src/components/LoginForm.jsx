import React, { useState } from 'react';
import './LoginForm.css';
import { supabase } from '../supabaseClient';

function LoginForm({ onLoginSuccess }) {
    const [fullName, setFullName] = useState(''); // <-- MUDADO: de 'name' para 'fullName'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (isRegistering) {
                // LÓGICA DE REGISTO MODIFICADA PARA O NOVO ESQUEMA
                
                // Passo 1: Registar o utilizador no Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                });

                if (authError) throw authError;

                if (!authData.user) {
                    throw new Error("Falha no registo: O objeto do utilizador não foi retornado.");
                }

                const userId = authData.user.id;
                const userEmail = authData.user.email;
                const userProvider = authData.user.app_metadata.provider || 'email';
                const userAvatar = authData.user.user_metadata.avatar_url || null;


                // Passo 2: Inserir os dados na sua tabela 'public.users'
                // <-- OBJETO DE INSERÇÃO TOTALMENTE MODIFICADO -->
                const { error: profileError } = await supabase
                    .from('users') // O nome da sua tabela
                    .insert({
                        external_id: userId,          // <-- A sua coluna 'external_id' (uuid)
                        email: userEmail,             // A sua coluna 'email'
                        full_name: fullName,          // <-- A sua coluna 'full_name'
                        external_provider: userProvider, // <-- A sua coluna 'external_provider'
                        profile_image_url: userAvatar    // <-- A sua coluna 'profile_image_url'
                        // A coluna 'id' (int4) será preenchida automaticamente pelo Postgres
                    });

                if (profileError) {
                    console.error("Erro ao criar o perfil na tabela 'users':", profileError.message);
                    throw new Error(`Conta criada, mas falha ao guardar o perfil. (${profileError.message})`);
                }
                
                setMessage('Successo! Por favor, verifique o seu email para confirmar a conta.');

            } else {
                // Lógica de Login (sem alterações)
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                if (onLoginSuccess) {
                    onLoginSuccess(data.session);
                }
            }
        
        } catch (error) {
            setMessage(error.message);
        
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });

        if (error) {
            setMessage(error.message);
            setLoading(false);
        }
        // AVISO: Esta função NÃO vai criar um registo na 'public.users'
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <img src="/logo.png" alt="WiseWallet Logo" className="logo-login" />
                <h2>{isRegistering ? 'Create your account' : 'Log in to WiseWallet'}</h2>
                
                <form onSubmit={handleSubmit} className="login-form">
                    
                    {/* <-- CAMPO DE NOME MODIFICADO --> */}
                    {isRegistering && (
                        <div className="input-group">
                            <input
                                type="text"
                                id="name"
                                value={fullName} // <-- MUDADO
                                onChange={(e) => setFullName(e.target.value)} // <-- MUDADO
                                placeholder="Full Name" // <-- MUDADO
                                required
                                autoComplete="name"
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="input-group">
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            autoComplete={isRegistering ? "new-password" : "current-password"}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Log In')}
                    </button>
                </form>

                <div className="divider">OR</div>

                <button onClick={handleGoogleLogin} className="btn-secondary" disabled={loading}>
                    Continue with Google
                </button>

                <div className="switch-mode">
                    <p>
                        {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                        <button onClick={() => setIsRegistering(!isRegistering)} disabled={loading}>
                            {isRegistering ? 'Log In' : 'Sign Up'}
                        </button>
                    </p>
                </div>

                {message && <p className={`message ${message.includes('Success') ? 'success' : 'error'}`}>{message}</p>}
            </div>
        </div>
    );
}

export default LoginForm;