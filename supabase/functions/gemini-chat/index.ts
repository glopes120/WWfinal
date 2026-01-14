import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, userId, history, task } = await req.json()
    console.log("Request received:", { method: req.method, task, userId });

    // 0. CHECK KEYS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
        const missing = []
        if (!supabaseUrl) missing.push("SUPABASE_URL")
        if (!supabaseKey) missing.push("SERVICE_ROLE_KEY")
        if (!geminiKey) missing.push("GEMINI_API_KEY")
        return new Response(JSON.stringify({ success: false, error: `Missing Secrets: ${missing.join(', ')}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    if (!userId) {
       return new Response(JSON.stringify({ success: false, error: 'User ID obrigatório.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Init Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Fetch Context (Shared for both Chat and Advisor)
    console.log("Fetching context from Supabase...");
    const [
        { data: accounts, error: accErr },
        { data: expenses },
        { data: categories },
        { data: goals },
        { data: budgets },
        { data: wealth }
    ] = await Promise.all([
        supabase.from('accounts').select('name, type, balance').eq('user_id', userId),
        supabase.from('expenses').select('amount, description, expense_date, categories(name)').eq('user_id', userId).order('expense_date', { ascending: false }).limit(50),
        supabase.from('categories').select('id, name'),
        supabase.from('financial_goals').select('name, target_amount, current_amount, deadline').eq('user_id', userId),
        supabase.from('budgets').select('amount, category_id').eq('user_id', userId),
        supabase.from('wealth').select('cash, savings').eq('user_id', userId).maybeSingle()
    ])

    if (accErr) {
        console.error("Supabase Error:", accErr);
        return new Response(JSON.stringify({ success: false, error: `Supabase Error: ${accErr.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
    console.log("Context fetched:", { 
        accounts: accounts?.length, 
        expenses: expenses?.length, 
        goals: goals?.length,
        budgets: budgets?.length,
        wealth: wealth ? 'Found' : 'Not Found'
    });

    // Format Context
    const accountSummary = accounts?.map(a => `${a.name} (${a.type}): €${a.balance}`).join(', ') || "Sem contas."
    const recentTx = expenses?.map(e => {
        const date = new Date(e.expense_date).toLocaleDateString()
        const cat = e.categories?.name || 'Geral'
        return `- ${date}: ${e.description} (€${e.amount}) [${cat}]`
    }).join('\n') || "Sem transações recentes."
    const categoryList = categories?.map(c => c.name).join(', ')
    const goalsSummary = goals?.map(g => {
        const progress = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0
        return `- ${g.name}: €${g.current_amount} / €${g.target_amount} (${progress}%) Deadline: ${g.deadline}`
    }).join('\n') || "Sem objetivos definidos."
    const budgetSummary = budgets?.map(b => {
        const catName = categories?.find(c => c.id === b.category_id)?.name || 'Unknown'
        return `- ${catName}: Budget Limit €${b.amount}`
    }).join('\n') || "Sem orçamentos definidos."
    const wealthSummary = wealth ? `Cash: €${wealth.cash}, Savings: €${wealth.savings}` : "Wealth data not set."


    // === MODE 1: ADVISOR REPORT ===
    if (task === 'advisor') {
        console.log("Generating Advisor Report...");
        const prompt = `
            You are an expert financial advisor. Analyze the user's financial situation based on the provided data.
            
            DATA:
            - Accounts: ${accountSummary}
            - Recent Spending: ${recentTx}
            - Goals: ${goalsSummary}
            - Wealth: ${wealthSummary}

            Task: Generate 3 highly personalized, specific, and actionable financial recommendations.
            Format: Return ONLY a JSON array of objects (no markdown, just raw JSON).
            Structure:
            [
              {
                "icon": "emoji string (e.g. 💡, ⚠️, 📈)",
                "title": "Short catchy title",
                "impact": "High Impact" | "Medium Impact" | "Low Impact",
                "type": "excellent" (green) | "good" (blue) | "fair" (yellow) | "poor" (red),
                "desc": "One sentence explanation of WHY and WHAT to do. Be specific (mention specific amounts or categories)."
              }
            ]
            Language: Portuguese (Portugal).
        `
        // console.log("Advisor Prompt:", prompt); // Optional: Uncomment to see full prompt

        const GEMINI_MODEL = 'gemini-1.5-flash'
        const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`

        const geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })

        if (!geminiRes.ok) {
             const errorText = await geminiRes.text();
             console.error("Gemini API Error (Advisor):"), geminiRes.status, errorText;
             throw new Error(`Gemini API Error: ${geminiRes.status} - ${errorText}`);
        }

        const geminiData = await geminiRes.json()
        const textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "[]"
        console.log("Gemini Raw Response (Advisor):"), textResponse;
        
        // Clean markdown if present
        const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
        
        let recommendations = []
        try {
            recommendations = JSON.parse(jsonStr)
        } catch (e) {
            console.error("JSON Parse Error (Advisor):"), e
            recommendations = [{ icon: '⚠️', title: 'Erro de Análise', impact: 'Low Impact', type: 'fair', desc: 'Não foi possível gerar recomendações automáticas.' }]
        }

        return new Response(JSON.stringify({ success: true, type: 'advisor_report', data: recommendations }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }


    // === MODE 2: CHAT (Default) ===
    // 3. Build Prompt for Chat
    const conversationContext = history 
            ? history.slice(-10).map((msg: any) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`).join('\n')
            : "No previous history."

    const prompt = `
            You are WiseWallet AI, a comprehensive and proactive financial advisor.
            
            ### FINANCIAL CONTEXT
            - **Wealth:** ${wealthSummary}
            - **Accounts:** ${accountSummary}
            - **Goals:**
            ${goalsSummary}
            - **Budgets:**
            ${budgetSummary}
            - **Recent Transactions (last 50):**
            ${recentTx}
            - **Categories:** ${categoryList}

            ### CONVERSATION HISTORY
            ${conversationContext}

            ### INSTRUCTIONS
            1. **Transaction Entry:** If the user wants to ADD a transaction (e.g., "gastei 10 euros em comida"), return ONLY a JSON object inside a code block:
            \`\`\`json
            { "type": "expense" | "income", "amount": number, "description": "string", "category": "string" }
            \`\`\`
            
            2. **Financial Advice & Queries:**
            - **Be Holistic:** Consider their balance, recent spending trends, budget limits, and savings goals.
            - **Be Proactive:** If they are spending near their budget limit, warn them. If they are close to a goal, encourage them.
            - **Safe-to-Spend:** Use the wealth and account data to advise if they can afford something.
            - Answer in **PORTUGUESE (Portugal)**.
            - Be concise but professional and friendly.
            
            ### CURRENT USER MESSAGE
            "${text}"
    `

    // 4. Call Gemini (Direct Fetch)
    const geminiKeyDirect = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKeyDirect) throw new Error("GEMINI_API_KEY not set")
    
    const GEMINI_MODEL = 'gemini-1.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${geminiKeyDirect}`

    const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })

    if (!geminiRes.ok) {
        const err = await geminiRes.text()
        console.error("Gemini API Error (Chat):"), geminiRes.status, err;
        return new Response(JSON.stringify({ success: false, error: `Gemini API Error: ${geminiRes.status} - ${err}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const geminiData = await geminiRes.json()
    const answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // 5. Parse Response (JSON intent check)
    let finalResponse: any = { type: 'message', message: answer }
    const jsonMatch = answer.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch && jsonMatch[1]) {
        try {
            const parsed = JSON.parse(jsonMatch[1].trim())
            finalResponse = {
                type: 'transaction_intent',
                data: parsed,
                message: `Entendi. Queres registar: ${parsed.description} (€${parsed.amount})?`
            }
        } catch (e) {
            console.error("JSON Parse Error"), e
        }
    }

    return new Response(JSON.stringify({ success: true, ...finalResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Global Error Handler:"), error
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown Error' }), {
      status: 200, // Return 200 so client can parse the error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})