import React, { useState } from 'react';
import './NewLoginForm.css';
import { supabase } from '../supabaseClient';

export default function NewLoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false); // NOVO ESTADO
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');



  // Lógica para enviar o email de recuperação
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.functions.invoke('send-password-reset-email', {
        body: { email },
      });

      if (error) throw error;
      setMessage('Check your email for the recovery link.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
        if (isRegistering) {
            // Lógica de Registo (igual ao anterior)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            if (!authData.user) throw new Error("Registration failed.");

            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    external_id: authData.user.id,
                    email: authData.user.email,
                    full_name: fullName,
                    external_provider: 'email'
                });

            if (profileError) throw profileError;
            
            setMessage('Success! Check your email to confirm your account.');

        } else {
            // Lógica de Login
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;
            if (onLoginSuccess) onLoginSuccess(data.session);
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
      options: {
        redirectTo: 'http://localhost:5173',
      }
    });
    if (error) {
        setMessage(error.message);
        setLoading(false);
    }
  };

  // Renderização do Formulário de Recuperação
  if (isRecovery) {
    return (
        <div className="login-page-container">
            <div className="login-form-section" style={{width: '100%'}}>
                <div className="login-form-wrapper">
                    <h1 className="welcome-text">Recover Password</h1>
                    <p className="sub-welcome-text">Enter your email to receive a recovery link.</p>
                    <form onSubmit={handleResetPassword} className="login-form-fields">
                        <div>
                            <label className="input-label">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading} className="submit-button">
                            {loading ? 'Sending...' : 'Send Link'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => { setIsRecovery(false); setMessage(''); setLoading(false); }} 
                            className="switch-mode-button"
                            style={{marginTop: '1rem', width: '100%', textAlign: 'center'}}
                        >
                            Back to Login
                        </button>
                        {message && <p className={`feedback-message ${message.includes('Check') ? 'success' : 'error'}`}>{message}</p>}
                    </form>
                </div>
            </div>
        </div>
    );
  }

  // Renderização Normal (Login/Registo)
  return (
    <div className="login-page-container">
      <div className="login-form-section">
        <div className="login-form-wrapper">
          <div className="brand-logo-container">
            <div className="brand-logo-icon"><span>W</span></div>
            <span className="brand-name">WiseWallet</span>
          </div>

          <h1 className="welcome-text">{isRegistering ? 'Create account' : 'Welcome back'}</h1>
          <p className="sub-welcome-text">
            {isRegistering ? 'Register to WiseWallet' : 'Login to your WiseWallet account'}
          </p>

          <form onSubmit={handleSubmit} className="login-form-fields">
            {isRegistering && (
                <div>
                    <label className="input-label">Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-field"
                        required
                    />
                </div>
            )}
            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <div className="password-header">
                <label className="input-label">Password</label>
                {!isRegistering && (
                    <button 
                        type="button" 
                        className="forgot-password-link" 
                        onClick={() => {
                          setIsRecovery(true);
                          setLoading(false);
                          setMessage('');
                        }}
                        style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}
                    >
                        Forgot password?
                    </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="submit-button">
              {loading ? <div className="spinner" /> : (isRegistering ? 'Register' : 'Login')}
            </button>

            <div className="or-divider">Or {isRegistering ? 'register' : 'login'} with</div>

            <div className="social-login-buttons">
              <button type="button" onClick={handleGoogleLogin} className="social-button google-button" disabled={loading}>
                Google
              </button>
            </div>

            <p className="no-account-text">
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                <button type="button" onClick={() => { setIsRegistering(!isRegistering); setMessage(''); setLoading(false); }} className="switch-mode-button">
                    {isRegistering ? 'Login' : 'Register'}
                </button>
            </p>

            {message && <p className={`feedback-message ${message.includes('Success') ? 'success' : 'error'}`}>{message}</p>}
          </form>
        </div>
      </div>
      <div className="features-section">
         {/* Conteúdo lateral mantém-se igual */}
         <div className="features-content">
            <h2 className="features-title">Your financial freedom starts here</h2>
         </div>
      </div>
    </div>
  );
}