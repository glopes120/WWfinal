import React, { useEffect, useState } from 'react';
import './LandingPage.css';

export default function LandingPage({ onEnterApp }) {
    const [serverStatus, setServerStatus] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState(true);

    useEffect(() => {
        const checkServer = async () => {
            try {
                // LÓGICA DE PRODUÇÃO:
                // 1. Tenta usar a variável de ambiente VITE_API_URL (configurada no Vercel)
                // 2. Se não existir, assume que estamos localmente (localhost:3004)
                // 3. Se estivermos no Vercel sem backend configurado, isto vai falhar silenciosamente (catch).
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3004';
                
                // Timeout curto (2s) para não ficar "Checking..." para sempre se o server não responder
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);

                const response = await fetch(`${apiUrl}/api/status`, { 
                    signal: controller.signal 
                });
                
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    setServerStatus(data);
                } else {
                    setServerStatus({ status: 'offline' });
                }
            } catch (error) {
                // Se falhar (ex: Vercel não consegue aceder ao localhost), define como offline
                console.log("Webservice indisponível (normal se estiveres no Vercel sem Backend alojado).");
                setServerStatus({ status: 'offline' });
            } finally {
                setLoadingStatus(false);
            }
        };

        checkServer();
    }, []);

    return (
        <div className="landing-container">
            <nav className="landing-nav">
                <div className="landing-logo">
                    <span className="logo-icon">W</span> WiseWallet
                </div>
                <div className="landing-links">
                    <span className="api-badge">
                        System: 
                        <span className={`status-indicator ${serverStatus?.status === 'online' ? 'green' : 'red'}`}></span>
                        {loadingStatus ? 'Checking...' : (serverStatus?.status === 'online' ? 'Online' : 'Vercel Mode')}
                    </span>
                    <button onClick={onEnterApp} className="btn-login-nav">Login</button>
                </div>
            </nav>

            <header className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Domina as tuas <span className="gradient-text">Finanças</span> com Inteligência Artificial
                    </h1>
                    <p className="hero-subtitle">
                        A WiseWallet não é apenas um gestor de despesas. É o teu assistente financeiro pessoal 
                        que te ajuda a poupar, investir e crescer.
                    </p>
                    
                    <div className="cta-group">
                        <button onClick={onEnterApp} className="btn-primary-lg">
                            Começar Agora
                        </button>
                        <button className="btn-secondary-lg">
                            Saber Mais
                        </button>
                    </div>

                    {/* Só mostra a caixa de mensagem se o servidor respondeu realmente */}
                    {serverStatus && serverStatus.status === 'online' && (
                        <div className="server-message-box">
                            <p>🤖 <strong>API Diz:</strong> "{serverStatus.messageOfTheDay}"</p>
                            <small>Uptime: {serverStatus.uptime}</small>
                        </div>
                    )}
                </div>

                <div className="hero-visual">
                    <div className="floating-card card-1">
                        <span>💰 Poupança</span>
                        <h3>€ 2,450.00</h3>
                    </div>
                    <div className="floating-card card-2">
                        <span>📈 Investimento</span>
                        <h3>+ 12.5%</h3>
                    </div>
                    <div className="gradient-blob"></div>
                </div>
            </header>

            <section className="features-grid">
                <div className="feature-card">
                    <div className="icon">📊</div>
                    <h3>Analytics</h3>
                    <p>Visualiza para onde vai o teu dinheiro com gráficos interativos.</p>
                </div>
                <div className="feature-card">
                    <div className="icon">🤖</div>
                    <h3>Consultor IA</h3>
                    <p>Recebe conselhos personalizados baseados nos teus gastos reais.</p>
                </div>
                <div className="feature-card">
                    <div className="icon">🌍</div>
                    <h3>Mercados</h3>
                    <p>Acompanha Cripto e Ações diretamente na tua dashboard.</p>
                </div>
            </section>

            <footer className="landing-footer">
                <p>© 2025 WiseWallet Project. All rights reserved.</p>
            </footer>
        </div>
    );
}