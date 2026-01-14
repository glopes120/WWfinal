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

// --- API: Expenses (GET with filters, POST to create) ---
app.get('/api/expenses', async (req, res) => {
    try {
        const q = req.query || {}
        const {
            user_id,
            min_amount,
            max_amount,
            start_date,
            end_date,
            category_id,
            currency,
            description_like,
            limit = 100,
            offset = 0,
            order_by = 'expense_date',
            order_dir = 'desc'
        } = q

        let query = supabase.from('expenses').select('*')

        if (user_id) query = query.eq('user_id', user_id)
        if (category_id) query = query.eq('category_id', category_id)
        if (currency) query = query.eq('currency', currency)
        if (min_amount) query = query.gte('amount', Number(min_amount))
        if (max_amount) query = query.lte('amount', Number(max_amount))
        if (start_date) query = query.gte('expense_date', start_date)
        if (end_date) query = query.lte('expense_date', end_date)
        if (description_like) query = query.ilike('description', `%${description_like}%`)

        query = query.order(order_by, { ascending: order_dir.toLowerCase() === 'asc' })
        query = query.range(Number(offset), Number(offset) + Number(limit) - 1)

        const { data, error } = await query
        if (error) return res.status(500).json({ error: error.message })
        return res.json({ data })
    } catch (e) {
        return res.status(500).json({ error: e.message || String(e) })
    }
})

app.post('/api/expenses', async (req, res) => {
    try {
        const payload = req.body || {}
        if (!payload.amount || !payload.expense_date || !payload.user_id) {
            return res.status(400).json({ error: 'Missing required fields: amount, expense_date, user_id' })
        }
        const { data, error } = await supabase.from('expenses').insert([payload]).select().single()
        if (error) return res.status(500).json({ error: error.message })
        return res.status(201).json({ data })
    } catch (e) {
        return res.status(500).json({ error: e.message || String(e) })
    }
})

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