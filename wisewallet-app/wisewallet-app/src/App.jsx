import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import NewLoginForm from './components/NewLoginForm';
import Dashboard from './components/dashboard.jsx';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import UpdatePassword from './components/UpdatePassword';
import Modal from './components/Modal';
import AIAssistant from './components/AIAssistant';
import LandingPage from './components/LandingPage'; // <-- IMPORTA A NOVA LANDING PAGE

import { useAppContext } from './contexts/AppContext';

function App() { 
    const [session, setSession] = useState(null);
    const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [isAIAssistantModalOpen, setIsAIAssistantModalOpen] = useState(false);
    
    // NOVO ESTADO: Controla se mostramos o login ou a landing page quando não há sessão
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

    // 1. Prioridade Máxima: Recuperação de Password
    if (isRecoveryMode) {
        return (
            <UpdatePassword
                onPasswordUpdated={() => setIsRecoveryMode(false)}
            />
        );
    }

    // 2. Se o utilizador NÃO estiver autenticado
    if (!session) {
        // 2a. Se ele clicou em "Login" na Landing Page, mostra o formulário
        if (showLogin) {
            return (
                <div className="App">
                    {/* Botão simples para voltar à Landing Page */}
                    <button 
                        onClick={() => setShowLogin(false)}
                        style={{
                            position: 'absolute', 
                            top: '20px', 
                            left: '20px', 
                            zIndex: 1000, 
                            background: 'none', 
                            border: 'none', 
                            color: '#fff', 
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        ← Voltar
                    </button>
                    <NewLoginForm onLoginSuccess={(session) => setSession(session)} />
                </div>
            );
        }

        // 2b. Caso contrário (default), mostra a Landing Page
        return (
            <LandingPage onEnterApp={() => setShowLogin(true)} />
        );
    } 
    
    // 3. Se o utilizador ESTIVER autenticado (App Principal)
    else {
        return (
            <div className="app-layout">
                {/* Sidebar - Desktop Only */}
                <div className="sidebar-desktop">
                    <Sidebar
                        onSelectMenuItem={handleMenuSelect}
                        activeItem={activeMenuItem}
                        user={session.user}
                        openAIAssistant={openAIAssistant}
                    />
                </div>
                
                {/* Main Content */}
                <main className="main-content">
                    <Dashboard
                        view={activeMenuItem}
                        setView={setActiveMenuItem}
                        openAIAssistant={openAIAssistant}
                        user={session.user}
                        refreshSession={refreshSession}
                    />
                </main>
                
                {/* Bottom Navigation - Mobile/Tablet Only */}
                <div className="bottom-nav-mobile">
                    <BottomNav
                        onSelectMenuItem={handleMenuSelect}
                        activeItem={activeMenuItem}
                        user={session.user}
                        openAIAssistant={openAIAssistant}
                    />
                </div>
                
                {/* AI Assistant Modal */}
                <Modal
                    isOpen={isAIAssistantModalOpen}
                    onClose={() => setIsAIAssistantModalOpen(false)}
                    title={null}
                    contentClassName="chat-modal-wrapper"
                >
                    <AIAssistant user={session.user} onClose={() => setIsAIAssistantModalOpen(false)} />
                </Modal>
            </div>
        );
    }
}

export default App;