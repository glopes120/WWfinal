import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// --- CONFIGURAÇÕES INICIAIS ---
const app = express();
const port = process.env.PORT || 3004; // Usa a porta do ambiente ou 3004

// Configuração do Supabase e Resend (Mantém igual ao que tinhas)
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(express.json());
// Importante: No Vercel, o CORS deve permitir a origem do próprio domínio
app.use(cors({
    origin: '*', // Em produção deves restringir, mas para teste deixa *
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// --- AS TUAS ROTAS E FUNÇÕES (GEMINI, MARKET DATA, ETC) ---
// (Cola aqui o conteúdo das tuas funções getFinancialContext, callGeminiAPI, etc...)
// ... (Código omitido para brevidade, mantém as tuas funções lógicas aqui) ...

// --- ROTA DE TESTE (A que a Landing Page chama) ---
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        system: 'WiseWallet API (Vercel Edition)',
        serverTime: new Date().toLocaleString('pt-PT'),
        messageOfTheDay: "O Backend está conectado com sucesso no Vercel!"
    });
});

// ... (Outras rotas /gemini-chat, /login, etc...) ...


// --- PONTO CRÍTICO: INICIALIZAÇÃO HÍBRIDA ---

// Servir estáticos apenas se NÃO estivermos no ambiente Vercel Serverless puro
// (O Vercel trata dos estáticos automaticamente, mas localmente precisamos disto)
if (process.env.NODE_ENV !== 'production') {
    const __dirname = path.resolve();
    app.use(express.static(path.join(__dirname, 'dist')));
    
    // Rota Catch-All para React Router local
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// Lógica de Arranque:
// Se for executado diretamente (node server.js), faz o listen.
// Se for importado pelo Vercel, exporta a app.
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`✅ Servidor local a correr na porta ${port}`);
    });
}

// ISTO É O QUE O VERCEL PRECISA:
export default app;