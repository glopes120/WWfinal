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

import { useAppContext } from './contexts/AppContext';

function App() { 
    const [session, setSession] = useState(null);
    const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [isAIAssistantModalOpen, setIsAIAssistantModalOpen] = useState(false);

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

    if (isRecoveryMode) {
        return (
            <UpdatePassword
                onPasswordUpdated={() => setIsRecoveryMode(false)}
            />
        );
    }

    if (!session) {
        return (
            <div className="App">
                <NewLoginForm onLoginSuccess={(session) => setSession(session)} />
            </div>
        );
    } else {
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