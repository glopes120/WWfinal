import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { AppProvider } from './contexts/AppContext'; // Importante para o tema

// Componentes
import NewLoginForm from './components/NewLoginForm';
import Dashboard from './components/dashboard.jsx'; // Nota: Verifica se o nome do ficheiro é minúscula ou maiúscula na pasta
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import UpdatePassword from './components/UpdatePassword';
import Modal from './components/Modal';
import AIAssistant from './components/AIAssistant';
import LandingPage from './components/LandingPage'; 

function App() { 
    const [session, setSession] = useState(null);
    const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [isAIAssistantModalOpen, setIsAIAssistantModalOpen] = useState(false);
    
    // Controla se mostramos a Landing Page ou o Login quando não há sessão
    const [showLogin, setShowLogin] = useState(false);

    const refreshSession = async () => {
        const { data: { session: newSession } } = await supabase.auth.getSession();
        setSession(newSession);
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecoveryMode(true);
            }
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleMenuSelect = (menuItem) => {
        if (menuItem === 'AI Assistant') {
            setIsAIAssistantModalOpen(true);
        } else {
            setActiveMenuItem(menuItem);
        }
    };

    const openAIAssistant = () => setIsAIAssistantModalOpen(true);

    // 1. Prioridade: Recuperação de Password
    if (isRecoveryMode) {
        return (
            <div className="App">
                <UpdatePassword onPasswordUpdated={() => setIsRecoveryMode(false)} />
            </div>
        );
    }

    // 2. Se NÃO houver sessão (Utilizador não logado)
    if (!session) {
        // Se clicou em "Login" na Landing Page, mostra o formulário
        if (showLogin) {
            return (
                <div className="auth-wrapper" style={{position: 'relative', minHeight: '100vh', background: 'var(--bg-dark)'}}>
                    <button 
                        onClick={() => setShowLogin(false)}
                        style={{
                            position: 'absolute', 
                            top: '20px', 
                            left: '20px', 
                            zIndex: 1000, 
                            background: 'rgba(255,255,255,0.1)', 
                            border: '1px solid rgba(255,255,255,0.2)', 
                            color: '#fff', 
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        ← Voltar
                    </button>
                    <NewLoginForm onLoginSuccess={(session) => setSession(session)} />
                </div>
            );
        }

        // Caso contrário, mostra a Landing Page
        return <LandingPage onEnterApp={() => setShowLogin(true)} />;
    } 
    
    // 3. App Principal (Logado)
    return (
        <AppProvider>
            <div className="app-layout">
                <div className="sidebar-desktop">
                    <Sidebar
                        onSelectMenuItem={handleMenuSelect}
                        activeItem={activeMenuItem}
                        user={session.user}
                        openAIAssistant={openAIAssistant}
                    />
                </div>
                
                <main className="main-content">
                    <Dashboard
                        view={activeMenuItem}
                        setView={setActiveMenuItem}
                        openAIAssistant={openAIAssistant}
                        user={session.user}
                        refreshSession={refreshSession}
                    />
                </main>
                
                <div className="bottom-nav-mobile">
                    <BottomNav
                        onSelectMenuItem={handleMenuSelect}
                        activeItem={activeMenuItem}
                        user={session.user}
                        openAIAssistant={openAIAssistant}
                    />
                </div>
                
                <Modal
                    isOpen={isAIAssistantModalOpen}
                    onClose={() => setIsAIAssistantModalOpen(false)}
                    title={null}
                    contentClassName="chat-modal-wrapper"
                >
                    <AIAssistant user={session.user} onClose={() => setIsAIAssistantModalOpen(false)} />
                </Modal>
            </div>
        </AppProvider>
    );
}

export default App;