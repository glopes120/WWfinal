import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Fetch é nativo no Node.js 18+, mas garantimos compatibilidade 

const app = express();
const port = 3004;

// ------------------------------------------------------------------
// CONFIGURAÇÕES
// ------------------------------------------------------------------

// 1. Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://uczfpbyaedxytlulxisw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.warn("AVISO: Nenhuma chave do Supabase encontrada. Verifique o seu ficheiro .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// 3. Google Gemini (Manual Fetch Implementation)
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey) {
    console.error("❌ ERRO CRÍTICO: GEMINI_API_KEY não encontrada no .env!");
} else {
    // Log seguro da chave (apenas os primeiros 5 caracteres)
    console.log(`✅ Gemini API Key carregada (${geminiKey.substring(0, 5)}...)`);
}

// Usar uma versão específica e estável do modelo
const GEMINI_MODEL_NAME = "gemini-1.5-flash"; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL_NAME}:generateContent`;

// Helper function to call Gemini API directly via fetch
async function callGeminiAPI(promptText) {
    if (!geminiKey) throw new Error("API Key missing");

    const response = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    // Extract text from response structure
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Middleware
app.use(express.json());
app.use(cors());

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

// Helper: Buscar e formatar contexto financeiro
async function getFinancialContext(userId) {
    try {
        // A. Contas
        const { data: accounts } = await supabase
            .from('accounts')
            .select('name, type, balance')
            .eq('user_id', userId);
        
        // B. Despesas Recentes (últimos 30 dias)
        const { data: expenses } = await supabase
            .from('expenses')
            .select('amount, description, expense_date, categories(name)')
            .eq('user_id', userId)
            .order('expense_date', { ascending: false })
            .limit(50);

        // C. Categorias
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name');

        // D. Objetivos Financeiros
        const { data: goals } = await supabase
            .from('financial_goals')
            .select('name, target_amount, current_amount, deadline')
            .eq('user_id', userId);

        // E. Orçamentos
        const { data: budgets } = await supabase
            .from('budgets')
            .select('amount, category_id')
            .eq('user_id', userId);

        // F. Riqueza
        const { data: wealth } = await supabase
            .from('wealth')
            .select('cash, savings')
            .eq('user_id', userId)
            .maybeSingle();

        // Formatação
        const accountSummary = accounts?.map(a => `${a.name} (${a.type}): €${a.balance}`).join(', ') || "Sem contas.";
        
        const recentTx = expenses?.map(e => {
            const date = new Date(e.expense_date).toLocaleDateString();
            const cat = e.categories?.name || 'Geral';
            return `- ${date}: ${e.description} (€${e.amount}) [${cat}]`;
        }).join('\n') || "Sem transações recentes.";
        
        const categoryList = categories?.map(c => c.name).join(', ');

        const goalsSummary = goals?.map(g => {
            const progress = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
            return `- ${g.name}: €${g.current_amount} / €${g.target_amount} (${progress}%) Deadline: ${g.deadline}`;
        }).join('\n') || "Sem objetivos definidos.";

        const budgetSummary = budgets?.map(b => {
            const catName = categories?.find(c => c.id === b.category_id)?.name || 'Unknown';
            return `- ${catName}: Budget Limit €${b.amount}`;
        }).join('\n') || "Sem orçamentos definidos.";

        const wealthSummary = wealth ? `Cash: €${wealth.cash}, Savings: €${wealth.savings}` : "Wealth data not set.";

        return {
            accountSummary,
            recentTx,
            categoryList,
            goalsSummary,
            budgetSummary,
            wealthSummary
        };
    } catch (error) {
        console.error("Erro ao buscar contexto:", error);
        return null; 
    }
}

// ------------------------------------------------------------------
// ROTAS
// ------------------------------------------------------------------

// [NOVO] ROTA DE STATUS / WEBSERVICE
// Esta rota é pública e serve para a Landing Page (ou qualquer outro sistema)
// verificar se o backend está operacional.
app.get('/api/status', (req, res) => {
    const uptime = process.uptime(); // Tempo que o servidor está ligado em segundos
    
    // Cálculo simples de horas e minutos de atividade
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    // Retorna um JSON com dados do sistema
    res.json({
        status: 'online',
        system: 'WiseWallet API v1.0',
        uptime: `${hours}h ${minutes}m`,
        serverTime: new Date().toLocaleString('pt-PT'),
        // Mensagem dinâmica que aparecerá na Landing Page
        messageOfTheDay: "A liberdade financeira começa com o primeiro registo."
    });
});

// NOVO: Rota de Chat Geral com Contexto
app.post('/gemini-chat', async (req, res) => {
    const { text, userId, history } = req.body;
    console.log(`[/gemini-chat] Received request for User: ${userId}, Text: "${text}"`);

    if (!text || !userId) {
        return res.status(400).json({ error: 'Texto e User ID obrigatórios.' });
    }

    try {
        console.log('[/gemini-chat] Fetching Supabase context...');
        const ctx = await getFinancialContext(userId);
        
        if (!ctx) {
            throw new Error("Falha ao recuperar dados financeiros.");
        }
        console.log('[/gemini-chat] Context fetched successfully.');

        // Construir histórico de conversa (últimas 10 mensagens para não estourar contexto)
        const conversationContext = history 
            ? history.slice(-10).map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n')
            : "No previous history.";

        // 2. Construir Prompt
        console.log(`[/gemini-chat] Calling Gemini API (Model: ${GEMINI_MODEL_NAME})...`);
        
        const prompt = `
            You are WiseWallet AI, a comprehensive and proactive financial advisor.
            
            ### FINANCIAL CONTEXT
            - **Wealth:** ${ctx.wealthSummary}
            - **Accounts:** ${ctx.accountSummary}
            - **Goals:**
            ${ctx.goalsSummary}
            - **Budgets:**
            ${ctx.budgetSummary}
            - **Recent Transactions (last 50):**
            ${ctx.recentTx}
            - **Categories:** ${ctx.categoryList}

            ### CONVERSATION HISTORY
            ${conversationContext}

            ### INSTRUCTIONS
            1. **Transaction Entry:** If the user wants to ADD a transaction (e.g., "gastei 10 euros em comida"), return ONLY a JSON object inside a code block:
            \
            { "type": "expense" | "income", "amount": number, "description": "string", "category": "string" }
            \
            
            2. **Financial Advice & Queries:**
            - **Be Holistic:** Consider their balance, recent spending trends, budget limits, and savings goals.
            - **Be Proactive:** If they are spending near their budget limit, warn them. If they are close to a goal, encourage them.
            - **Safe-to-Spend:** Use the wealth and account data to advise if they can afford something.
            - Answer in **PORTUGUESE (Portugal)**.
            - Be concise but professional and friendly.
            
            ### CURRENT USER MESSAGE
            "${text}"
        `;

        const answer = await callGeminiAPI(prompt);
        console.log('[/gemini-chat] Gemini response received.');

        // 3. Processar Resposta
        const jsonMatch = answer.match(/```json\n([\s\S]*?)\n```/);
        
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsedTransaction = JSON.parse(jsonMatch[1].trim());
                return res.status(200).json({
                    type: 'transaction_intent',
                    data: parsedTransaction,
                    message: `Entendi. Queres registar: ${parsedTransaction.description} (€${parsedTransaction.amount})?`
                });
            } catch (e) {
                console.error("Erro ao fazer parse do JSON do Gemini", e);
            }
        }

        res.status(200).json({
            type: 'message',
            message: answer 
        });

    } catch (error) {
        console.error('[/gemini-chat] CRITICAL ERROR:', error);
        // Fallback or explicit failure
        res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
});

// Rota: Processamento de Texto com IA (Gemini - Parse Only)
app.post('/gemini-parse', async (req, res) => {
    const { text } = req.body;
    console.log('[/gemini-parse] Recebido texto:', text);

    if (!text) {
        return res.status(400).json({ error: 'Texto não fornecido.' });
    }

    try {
        const prompt = `
            Analyze the text to extract transaction details.
            Return ONLY a single JSON object inside a markdown code block.
            The JSON object must have: 'type' ('expense' or 'income'), 'amount' (number), 'description' (string), and 'category' (string).
            - 'description' should be a single, concise Portuguese word.
            - 'category' should be a concise English word (e.g. "Food", "Salary"). Use 'Uncategorized' if unsure.
            - Default to 'expense' if type is unclear.
            
            Text: "${text}"
        `;

        const answer = await callGeminiAPI(prompt);

        // Extração robusta do JSON
        const jsonMatch = answer.match(/```json\n([\s\S]*?)\n```/);
        if (!jsonMatch || !jsonMatch[1]) throw new Error('Formato inválido do Gemini');

        const parsedTransaction = JSON.parse(jsonMatch[1].trim());
        res.status(200).json(parsedTransaction);

    } catch (error) {
        console.error('[/gemini-parse] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota: Insights Financeiros (Gemini)
app.post('/gemini-insights', async (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ error: 'User ID obrigatório.' });

    try {
        // Busca despesas recentes
        const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('amount, description, category_id, expense_date')
            .eq('user_id', userId)
            .order('expense_date', { ascending: false })
            .limit(20);

        if (expensesError) throw expensesError;

        // Busca nomes das categorias
        const { data: categories } = await supabase.from('categories').select('id, name');
        const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

        const formattedTransactions = expenses.map(exp => ({
            ...exp,
            category: categoryMap.get(exp.category_id) || 'Unknown',
            date: new Date(exp.expense_date).toLocaleDateString()
        }));

        const prompt = `
            Analyze these financial transactions and provide 3 short, actionable insights/tips in Portuguese.
            Format as a list.
            Data: ${JSON.stringify(formattedTransactions)}
        `;

        const answer = await callGeminiAPI(prompt);
        
        // Limpa a formatação para devolver apenas o texto das linhas
        const insights = answer.split('\n')
            .filter(line => line.trim().length > 0 && (/^\d+\./.test(line) || line.startsWith('-')))
            .map(line => line.replace(/^[\d-]+\.\s*/, '').trim());

        res.status(200).json({ insights });

    } catch (error) {
        console.error('[/gemini-insights] Erro:', error);
        res.status(500).json({ error: 'Falha ao gerar insights.' });
    }
});

// Rota 3: Login Simples (Legado)
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'user@exemplo.com' && password === 'senha123') {
        res.status(200).json({ success: true, message: 'Login realizado!' });
    } else {
        res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }
});

// ------------------------------------------------------------------
// ROTAS DE MARKET DATA (PROXY - SEM CORS!)
// ------------------------------------------------------------------

// Rota: Buscar Preço de Criptomoeda (CoinGecko via Backend)
app.get('/api/market/crypto/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const tickerUpper = ticker.toUpperCase();
  
  // Mapeamento de tickers para CoinGecko IDs
  const cryptoMap = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum'
  };
  
  const coinId = cryptoMap[tickerUpper];
  if (!coinId) {
    return res.status(400).json({ error: 'Crypto não suportada' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`CoinGecko error: ${response.status}`);
    }

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData || !coinData.usd) {
      throw new Error('Dados inválidos');
    }

    res.json({
      ticker: tickerUpper,
      price: parseFloat(coinData.usd.toFixed(2)),
      change: parseFloat((coinData.usd_24h_change || 0).toFixed(2)),
      source: 'coingecko',
      timestamp: Date.now()
    });

  } catch (error) {
    console.error(`[Market API] Crypto error for ${ticker}:`, error.message);
    res.status(500).json({ error: 'Erro ao buscar preço de crypto' });
  }
});

// Rota: Buscar Preço de Ação/ETF (Múltiplas APIs como Fallback)
app.get('/api/market/stock/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const tickerUpper = ticker.toUpperCase();

  // APIs para tentar (em ordem de prioridade)
  const apis = [];

  // 1. Finnhub (se tiver API key)
  if (process.env.FINNHUB_API_KEY && process.env.FINNHUB_API_KEY !== 'demo') {
    apis.push({
      name: 'finnhub',
      url: `https://finnhub.io/api/v1/quote?symbol=${tickerUpper}&token=${process.env.FINNHUB_API_KEY}`,
      parser: (data) => {
        if (!data || !data.c) return null;
        return {
          price: parseFloat(data.c.toFixed(2)),
          change: parseFloat(((data.c - (data.pc || data.o || data.c)) / (data.pc || data.o || data.c) * 100).toFixed(2)),
          volume: data.v || 0,
          source: 'finnhub'
        };
      }
    });
  }

  // 2. Twelve Data (se tiver API key)
  if (process.env.TWELVE_DATA_API_KEY && process.env.TWELVE_DATA_API_KEY !== 'demo') {
    apis.push({
      name: 'twelvedata',
      url: `https://api.twelvedata.com/quote?symbol=${tickerUpper}&apikey=${process.env.TWELVE_DATA_API_KEY}`,
      parser: (data) => {
        if (!data || data.status === 'error' || !data.close) return null;
        const change = data.previous_close > 0 
          ? parseFloat(((data.close - data.previous_close) / data.previous_close * 100).toFixed(2))
          : 0;
        return {
          price: parseFloat(parseFloat(data.close).toFixed(2)),
          change: change,
          volume: data.volume || 0,
          source: 'twelvedata'
        };
      }
    });
  }

  // 3. Alpha Vantage (se tiver API key)
  if (process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo') {
    apis.push({
      name: 'alphavantage',
      url: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${tickerUpper}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
      parser: (data) => {
        if (data['Error Message'] || data['Note']) return null;
        const quote = data['Global Quote'];
        if (!quote || !quote['05. price']) return null;
        const price = parseFloat(quote['05. price']);
        const prevClose = parseFloat(quote['08. previous close'] || price);
        const change = prevClose > 0 ? ((price - prevClose) / prevClose * 100) : 0;
        return {
          price: parseFloat(price.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          volume: quote['06. volume'] || 0,
          source: 'alphavantage'
        };
      }
    });
  }

  // 4. Yahoo Finance (último recurso - via backend funciona!)
  apis.push({
    name: 'yahoo',
    url: `https://query1.finance.yahoo.com/v8/finance/chart/${tickerUpper}?interval=1d&range=1d`,
    parser: (data) => {
      const result = data.chart?.result?.[0];
      if (!result || !result.meta) return null;
      const meta = result.meta;
      const price = meta.regularMarketPrice || meta.previousClose;
      if (!price || price === 0) return null;
      const prevClose = meta.previousClose || price;
      const change = prevClose > 0 ? ((price - prevClose) / prevClose * 100) : 0;
      return {
        price: parseFloat(price.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        volume: meta.regularMarketVolume || 0,
        source: 'yahoo'
      };
    }
  });

  // Tentar cada API até uma funcionar
  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(api.url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      const result = api.parser(data);
      
      // Se parser retornar Promise, aguarda
      const finalResult = result instanceof Promise ? await result : result;

      if (finalResult && finalResult.price && finalResult.price > 0) {
        return res.json({
          ticker: tickerUpper,
          ...finalResult,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      // Tenta próxima API
      console.log(`[Market API] ${api.name} failed for ${tickerUpper}, trying next...`);
      continue;
    }
  }

  // Se todas falharem
  res.status(503).json({ error: 'Todas as APIs falharam. Tente novamente mais tarde.' });
});

// Rota 4: Enviar Relatório Mensal (RESEND)
app.post('/send-monthly-report', async (req, res) => {
    const { userId, userEmail, userName } = req.body;

    console.log(`[/send-monthly-report] A preparar envio para: ${userEmail}`);

    if (!userId || !userEmail) {
        return res.status(400).json({ error: 'User ID e Email são obrigatórios.' });
    }

    try {
        // --- Passo A: Obter dados do Supabase ---
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        // Buscar transações do mês
        const { data: expenses, error: expError } = await supabase
            .from('expenses')
            .select('amount, category_id')
            .eq('user_id', userId)
            .gte('expense_date', startOfMonth)
            .lte('expense_date', endOfMonth);

        if (expError) throw expError;

        // Buscar categorias para saber qual é "Income"
        const { data: categories, error: catError } = await supabase
            .from('categories')
            .select('id, name');
        
        if (catError) throw catError;

        // --- Passo B: Calcular Totais ---
        const incomeCat = categories.find(c => c.name.trim().toLowerCase() === 'income');
        const incomeId = incomeCat ? incomeCat.id : null;

        let totalIncome = 0;
        let totalExpense = 0;

        expenses.forEach(tx => {
            if (tx.category_id === incomeId) {
                totalIncome += tx.amount;
            } else {
                totalExpense += tx.amount;
            }
        });

        const balance = totalIncome - totalExpense;
        const monthName = today.toLocaleString('pt-PT', { month: 'long' });

        // --- Passo C: Construir HTML do Email ---
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #6c5ce7;">Relatório de ${monthName}</h1>
                <p>Olá <strong>${userName}</strong>, aqui está o teu resumo:</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <p><strong>Entradas:</strong> <span style="color: #00b894;">€${totalIncome.toFixed(2)}</span></p>
                    <p><strong>Saídas:</strong> <span style="color: #d63031;">€${totalExpense.toFixed(2)}</span></p>
                    <hr>
                    <p style="font-size: 1.2em;"><strong>Saldo:</strong> 
                        <span style="color: ${balance >= 0 ? '#00b894' : '#d63031'}">€${balance.toFixed(2)}</span>
                    </p>
                </div>
                <p style="color: #636e72; font-size: 12px; margin-top: 20px;">WiseWallet App</p>
            </div>
        `;

        // --- Passo D: Enviar com Resend ---
        // NOTA DE DEBUG: Se estiver no plano Gratuito do Resend, só pode enviar para
        // o SEU PRÓPRIO EMAIL (o que usou para criar a conta Resend).
        // Se 'userEmail' for diferente, o envio falhará com erro 403.
        
        const data = await resend.emails.send({
            from: 'WiseWallet <onboarding@resend.dev>',
            to: ['guilermelopes279@gmail.com'], // <-- Mude para ['seu_email@gmail.com'] se estiver a testar e der erro
            subject: `Relatório Financeiro - ${monthName}`,
            html: htmlContent,
        });

        if (data.error) {
            console.error('Erro Resend:', data.error);
            return res.status(500).json({ error: data.error });
        }

        console.log('Email enviado com sucesso:', data);
        res.status(200).json({ success: true, data });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: error.message });
    }
});

// ------------------------------------------------------------------
// INICIALIZAÇÃO
// ------------------------------------------------------------------

// Servir os ficheiros estáticos da build do React
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

// Rota "catch-all" para garantir que o React Router funciona
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`✅ Servidor a correr na porta ${port}`);
    console.log(`🔍 Modelo Gemini definido como: ${GEMINI_MODEL_NAME}`);
});