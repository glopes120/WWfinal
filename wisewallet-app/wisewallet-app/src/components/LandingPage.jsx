import React, { useEffect, useState } from 'react';
import './LandingPage.css';

/**
 * LandingPage Component
 * ------------------------------------------------------------------
 * Esta página é a "capa" do projeto.
 * Funcionalidades:
 * 1. Apresentação visual do produto.
 * 2. Teste de Webservice: Consome /api/status para mostrar que o backend está ligado.
 * 3. Botão para levar o utilizador ao Login/Registo.
 */
export default function LandingPage({ onEnterApp }) {
    // Estado para guardar a resposta do servidor
    const [serverStatus, setServerStatus] = useState(null);
    // Estado para controlar o carregamento do teste de API
    const [loadingStatus, setLoadingStatus] = useState(true);

    // Efeito para testar o Webservice assim que a página carrega
    useEffect(() => {
        const checkServer = async () => {
            try {
                // Tenta contactar o nosso Webservice local (ou produção se o URL for relativo)
                // Usamos o porto 3004 porque é onde o server.js está a correr
                const response = await fetch('http://localhost:3004/api/status');
                
                if (response.ok) {
                    const data = await response.json();
                    setServerStatus(data);
                } else {
                    setServerStatus({ status: 'offline' });
                }
            } catch (error) {
                console.error("Erro ao contactar webservice:", error);
                setServerStatus({ status: 'offline' });
            } finally {
                setLoadingStatus(false);
            }
        };

        checkServer();
    }, []);

    return (
        <div className="landing-container">
            {/* Navegação Simples */}
            <nav className="landing-nav">
                <div className="landing-logo">
                    <span className="logo-icon">W</span> WiseWallet
                </div>
                <div className="landing-links">
                    {/* Badge indicador de estado da API */}
                    <span className="api-badge">
                        Status API: 
                        <span className={`status-indicator ${serverStatus?.status === 'online' ? 'green' : 'red'}`}></span>
                        {loadingStatus ? 'Checking...' : (serverStatus?.status === 'online' ? 'Online' : 'Offline')}
                    </span>
                    {/* Botão para ir para o Ecrã de Login */}
                    <button onClick={onEnterApp} className="btn-login-nav">Login</button>
                </div>
            </nav>

            {/* Secção Hero (Principal) */}
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
                            Começar Agora Gratuitamente
                        </button>
                        <button className="btn-secondary-lg">
                            Saber Mais
                        </button>
                    </div>

                    {/* Área de Demonstração do Webservice (só aparece se estiver online) */}
                    {serverStatus && serverStatus.status === 'online' && (
                        <div className="server-message-box">
                            <p>🤖 <strong>Mensagem do Webservice:</strong> "{serverStatus.messageOfTheDay}"</p>
                            <small>Server Uptime: {serverStatus.uptime} | Time: {serverStatus.serverTime}</small>
                        </div>
                    )}
                </div>

                {/* Elemento Visual Decorativo (Mockup abstrato com animação) */}
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

            {/* Secção de Features */}
            <section className="features-grid">
                <div className="feature-card">
                    <div className="icon">📊</div>
                    <h3>Analytics em Tempo Real</h3>
                    <p>Visualiza para onde vai o teu dinheiro com gráficos interativos.</p>
                </div>
                <div className="feature-card">
                    <div className="icon">🤖</div>
                    <h3>Consultor IA</h3>
                    <p>Recebe conselhos personalizados baseados nos teus gastos reais.</p>
                </div>
                <div className="feature-card">
                    <div className="icon">🌍</div>
                    <h3>Mercados Globais</h3>
                    <p>Acompanha Cripto e Ações diretamente na tua dashboard.</p>
                </div>
            </section>

            <footer className="landing-footer">
                <p>© 2025 WiseWallet Project. All rights reserved.</p>
            </footer>
        </div>
    );
}