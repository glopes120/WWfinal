import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './AIAssistant.css';

// --- CONFIGURATION ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

const AIAssistantV2 = ({ user, onTransactionAdd, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Olá! A configurar a ligação..." }
  ]);
  const [pendingTx, setPendingTx] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- AUTO DISCOVER MODEL ---
  useEffect(() => {
      const discoverModel = async () => {
          try {
              // Try v1 first
              let url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
              let res = await fetch(url);
              if (!res.ok) {
                  // Fallback to v1beta
                  url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
                  res = await fetch(url);
              }
              
              if (!res.ok) throw new Error("Could not list models");

              const data = await res.json();
              // Find a model that supports generateContent
              const model = data.models?.find(m => 
                  m.supportedGenerationMethods?.includes("generateContent") &&
                  (m.name.includes("flash") || m.name.includes("pro"))
              );

              if (model) {
                  const cleanName = model.name.replace('models/', '');
                  setActiveModel(cleanName);
                  setMessages(prev => [{ role: 'assistant', content: `Olá! Estou pronto. (Usando: ${cleanName})` }]);
                  console.log("Selected Gemini Model:", cleanName);
              } else {
                  setMessages(prev => [{ role: 'assistant', content: "Erro: Nenhum modelo compatível encontrado." }]);
              }

          } catch (e) {
              console.error(e);
              setMessages(prev => [{ role: 'assistant', content: "Erro de conexão à Google API." }]);
          }
      };
      discoverModel();
  }, []);

  // --- 1. FETCH CONTEXT DIRECTLY ---
  const fetchFinancialContext = async (userId) => {
    try {
        const [
            { data: accounts },
            { data: expenses },
            { data: goals },
            { data: budgets },
            { data: wealth }
        ] = await Promise.all([
            supabase.from('accounts').select('name, type, balance').eq('user_id', userId),
            supabase.from('expenses').select('amount, description, expense_date, categories(name)').eq('user_id', userId).order('expense_date', { ascending: false }).limit(20),
            supabase.from('financial_goals').select('name, target_amount, current_amount').eq('user_id', userId),
            supabase.from('budgets').select('amount, category_id').eq('user_id', userId),
            supabase.from('wealth').select('cash, savings').eq('user_id', userId).maybeSingle()
        ]);

        const accText = accounts?.map(a => `${a.name}: €${a.balance}`).join(', ') || "N/A";
        const txText = expenses?.map(e => `${new Date(e.expense_date).toLocaleDateString()}: ${e.description} (€${e.amount})`).join('\n') || "N/A";
        const wealthText = wealth ? `Cash: €${wealth.cash}, Savings: €${wealth.savings}` : "N/A";
        
        return `
          WEALTH: ${wealthText}
          ACCOUNTS: ${accText}
          RECENT TX: 
          ${txText}
        `;
    } catch (e) {
        console.error("Context Error", e);
        return "Error fetching context.";
    }
  };

  // --- 2. HANDLE SEND ---
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !activeModel) return;

    const userText = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
        // A. Get Context
        const contextData = await fetchFinancialContext(user.id);

        // B. Prepare Prompt
        const prompt = `
          You are a helpful financial assistant.
          Context:
          ${contextData}

          User: "${userText}"

          If the user wants to add a transaction, output JSON ONLY:
          {"type": "expense"|"income", "amount": number, "description": "string", "category": "string"}
          
          Otherwise, answer normally in Portuguese (Portugal).
        `;

        // C. Call Gemini Direct (Using Discovered Model)
        // Use v1beta endpoint as it's a superset usually.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${API_KEY}`;
        
        // Add artificial delay (1.5s) to simulate "thinking" and prevent rapid spam
        const [response] = await Promise.all([
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }),
            new Promise(resolve => setTimeout(resolve, 1500))
        ]);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini Error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Erro: Sem resposta.";

        // D. Check for JSON Intent
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const tx = JSON.parse(jsonMatch[0]);
                if (tx.amount && tx.description) {
                   setPendingTx(tx);
                   setMessages(prev => [...prev, { 
                       role: 'assistant', 
                       content: `Entendi. Queres registar: ${tx.description} (€${tx.amount})?`,
                       isConfirmation: true
                   }]);
                   setIsLoading(false);
                   return;
                }
            } catch (e) { /* ignore */ }
        }

        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${error.message}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  // --- 3. CONFIRM TRANSACTION ---
  const handleConfirm = async (confirmed) => {
      setMessages(prev => prev.map(m => ({ ...m, isConfirmation: false }))); // Hide buttons
      setPendingTx(null);

      if (!confirmed) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Cancelado." }]);
          return;
      }

      // Insert into Supabase
      if (pendingTx) {
         const { error } = await supabase.from('expenses').insert({
             user_id: user.id,
             amount: pendingTx.amount,
             description: pendingTx.description,
             expense_date: new Date().toISOString()
         });
         
         if (error) setMessages(prev => [...prev, { role: 'assistant', content: "Erro ao gravar na base de dados." }]);
         else setMessages(prev => [...prev, { role: 'assistant', content: "Gravado com sucesso! ✅" }]);
      }
  };

  return (
    <div className="ai-assistant-chat-container">
      <div className="chat-header">
        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            <div className="chat-icon"><span>🧠</span></div>
            <div>
            <h3 className="chat-title">WiseWallet Assistant</h3>
            <p className="chat-subtitle">Modelo: {activeModel || "Detecting..."}</p>
            </div>
        </div>
        {onClose && (
            <button onClick={onClose} className="chat-close-btn">✕</button>
        )}
      </div>

      <div className="chat-messages-area">
        {messages.map((msg, i) => (
          <div key={i} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}>
            <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
              <p style={{whiteSpace: 'pre-wrap'}}>{msg.content}</p>
              {msg.isConfirmation && (
                  <div className="confirmation-buttons" style={{marginTop: '10px'}}>
                      <button onClick={() => handleConfirm(true)} className="confirm-button">Confirmar</button>
                      <button onClick={() => handleConfirm(false)} className="cancel-button">Cancelar</button>
                  </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && <div className="message-wrapper assistant"><div className="message-bubble assistant-bubble">Thinking...</div></div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-area">
        <input 
            className="chat-input-field" 
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)}
            placeholder="Diz-me algo..."
            disabled={isLoading || !activeModel}
        />
        <button type="submit" className="chat-send-button" disabled={isLoading || !activeModel}>➤</button>
      </form>
    </div>
  );
};

export default AIAssistantV2;
