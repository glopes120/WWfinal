import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './AIAssistant.css';

const AIAssistant = ({ user, onTransactionAdd, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const conversationEndRef = useRef(null);

  const [conversation, setConversation] = useState([
    { role: 'assistant', content: "Olá! Sou o WiseWallet AI. Tenho acesso aos seus dados financeiros. Pode perguntar sobre o seu saldo, despesas recentes ou pedir para adicionar uma transação." }
  ]);
  const [pendingTransaction, setPendingTransaction] = useState(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const toggleListening = () => {
      if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
          return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert("O teu navegador não suporta reconhecimento de voz. Tenta usar o Google Chrome.");
          return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-PT';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      setIsListening(true);

      recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(prev => (prev ? prev + ' ' + transcript : transcript)); // Append if text exists
      };

      recognition.onend = () => {
          setIsListening(false);
      };

      recognition.onerror = (event) => {
          if (event.error === 'not-allowed') {
              alert("Por favor, permite o acesso ao microfone.");
          }
          if (event.error !== 'aborted') {
              console.log("Speech Recognition stopped:", event.error);
          }
          setIsListening(false);
      };

      recognition.start();
  };

  const addUserMessage = (text) => {
    setConversation(prev => [...prev, { role: 'user', content: text }]);
  };

  const addAiMessage = (text, isConfirmation = false) => {
    setConversation(prev => [...prev, { role: 'assistant', content: text, isConfirmation }]);
  };

  const callGeminiDirect = async (text) => {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Local API Key");

      // 1. Discover available models
      let activeModel = 'gemini-1.5-flash'; // Default fallback
      try {
          const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          if (modelsRes.ok) {
              const data = await modelsRes.json();
              // Find a model that supports generateContent
              const viableModel = data.models?.find(m => 
                  m.supportedGenerationMethods?.includes("generateContent") &&
                  m.name.includes("gemini-1.5-flash")
              );
              if (viableModel) {
                  // Remove 'models/' prefix if present
                  activeModel = viableModel.name.replace('models/', '');
              } else {
                  // Fallback to any gemini model
                  const anyGemini = data.models?.find(m => 
                      m.supportedGenerationMethods?.includes("generateContent") &&
                      m.name.includes("gemini")
                  );
                  if (anyGemini) activeModel = anyGemini.name.replace('models/', '');
              }
          }
      } catch (e) {
          console.warn("Model discovery failed, using default.");
      }

      console.log("Using Gemini Model:", activeModel);

      const prompt = `
          You are WiseWallet AI.
          User says: "${text}"
          
          If the user wants to ADD a transaction (e.g. "spent 10 on food"), return JSON:
          {"type": "expense"|"income", "amount": number, "description": "string", "category": "string"}
          
          Otherwise, return a helpful text response in Portuguese (Portugal).
      `;

      // Helper to fetch with a specific model
      const fetchWithModel = async (model) => {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          if (!response.ok) {
              const err = await response.text();
              throw new Error(`${model} Error: ${err}`);
          }
          return response.json();
      };

      let data;
      try {
          data = await fetchWithModel(activeModel);
      } catch (e) {
          console.warn(`Retry failed with ${activeModel}, trying gemini-pro...`, e);
          data = await fetchWithModel('gemini-pro');
      }

      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Check for JSON
      const jsonMatch = answer.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
          try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.amount && parsed.description) {
                  return {
                      success: true,
                      type: 'transaction_intent',
                      data: parsed
                  };
              }
          } catch (e) { console.error("JSON Parse Error", e); }
      }

      return {
          success: true,
          type: 'message',
          message: answer
      };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    addUserMessage(userMessage);
    setInputValue('');
    setIsLoading(true);

    try {
      let data;
      // 1. Try Direct Frontend Call (if Key exists) - BYPASS SERVER
      if (import.meta.env.VITE_GEMINI_API_KEY) {
          console.log("Using Direct Frontend Connection...");
          data = await callGeminiDirect(userMessage);
      } else {
          // 2. Fallback to Supabase Edge Function
          const { data: responseData, error } = await supabase.functions.invoke('gemini-chat', {
            body: { 
                text: userMessage, 
                userId: user?.id,
                history: conversation.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    content: msg.content
                }))
            }
          });

          if (error) throw error;
          data = responseData;
      }

      if (data && data.success === false) {
          throw new Error(data.error || "Erro desconhecido na função.");
      }

      if (data.type === 'transaction_intent') {
        const parsedData = data.data;
        const categoryDisplay = parsedData.category ? `[${parsedData.category}]` : '';
        const confirmationText = `Entendi: ${parsedData.type === 'income' ? 'Receita' : 'Despesa'} de €${parsedData.amount} - "${parsedData.description}" ${categoryDisplay}. Confirmar?`;
        
        addAiMessage(confirmationText, true);
        setPendingTransaction(parsedData);
      } else {
        // General message
        addAiMessage(data.message);
      }

    } catch (error) {
      console.error('Erro AI:', error);
      addAiMessage("Desculpe, tive um problema ao processar o seu pedido. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmation = async (confirm) => {
    if (!pendingTransaction) return;

    setConversation(prev => prev.map(msg => msg.isConfirmation ? { ...msg, isConfirmation: false } : msg));

    if (confirm) {
      addUserMessage("Sim");
      setIsLoading(true);
      try {
        // Direct insertion if handler not provided
        let success = false;
        if (onTransactionAdd) {
            await onTransactionAdd(pendingTransaction);
            success = true;
        } else {
             // Fetch category ID
             let catId = null;
             if (pendingTransaction.category) {
                 const { data: cats } = await supabase.from('categories').select('id').ilike('name', pendingTransaction.category).maybeSingle();
                 if (cats) catId = cats.id;
                 else {
                     // Default or create? Let's search for 'General' or 'Uncategorized' or just pick the first one
                     // For now, keep it simple. If we can't find it, we might fail or insert null.
                     // Let's try to find "Uncategorized" or similar
                     const { data: defaultCat } = await supabase.from('categories').select('id').limit(1).single();
                     catId = defaultCat?.id;
                 }
             }

             const { error } = await supabase.from('expenses').insert({
                 user_id: user.id,
                 amount: pendingTransaction.amount,
                 description: pendingTransaction.description,
                 category_id: catId, // simplified
                 expense_date: new Date().toISOString()
             });
             if (!error) success = true;
        }

        if (success) {
             addAiMessage("Transação adicionada com sucesso! 🚀");
        } else {
             addAiMessage("Erro ao guardar a transação.");
        }

      } catch (error) {
        addAiMessage("Houve um problema técnico.");
      } finally {
        setIsLoading(false);
      }
    } else {
      addUserMessage("Não");
      addAiMessage("Cancelado.");
    }
    setPendingTransaction(null);
  };

  return (
    <div className="ai-assistant-chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-icon">
            <span>🤖</span>
          </div>
          <div>
            <h3 className="chat-title">WiseWallet AI</h3>
            <p className="chat-subtitle">Pergunte sobre saldos, gastos ou adicione transações.</p>
          </div>
        </div>
        {onClose && (
            <button onClick={onClose} className="chat-close-btn" style={{background:'none', border:'none', color:'white', fontSize:'1.5rem', cursor:'pointer'}}>✕</button>
        )}
      </div>


      {/* Messages */}
      <div className="chat-messages-area">
        {conversation.map((msg, i) => (
          <div key={i} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}>
            <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
              {msg.role === 'assistant' && (
                <div className="assistant-label">
                  <span className="assistant-icon">🤖</span>
                  <span className="assistant-name">AI Assistente</span>
                </div>
              )}
              <p className="message-content">{msg.content}</p>
              {msg.isConfirmation && pendingTransaction && ( // Only show confirmation buttons if it's the latest message and there's a pending transaction
                <div className="confirmation-buttons">
                  <button onClick={() => handleConfirmation(true)} className="confirm-button" disabled={isLoading}>Confirmar</button>
                  <button onClick={() => handleConfirmation(false)} className="cancel-button" disabled={isLoading}>Cancelar</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="message-wrapper assistant">
                <div className="message-bubble assistant-bubble">
                    <div className="assistant-label">
                        <span className="assistant-icon">🤖</span>
                        <span className="assistant-name">AI Assistente</span>
                    </div>
                    <p className="message-content">...</p>
                </div>
            </div>
        )}
        <div ref={conversationEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-input-form" style={{display:'flex', width:'100%', gap:'0.5rem', alignItems:'center'}}>
          
          <button 
            type="button" 
            onClick={toggleListening} 
            className={`voice-mic-button ${isListening ? 'listening' : ''}`}
            aria-label="Ativar Voz"
          >
             {isListening ? (
                 <span className="mic-pulse-ring"></span>
             ) : null}
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                 <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                 <line x1="12" y1="19" x2="12" y2="23"></line>
                 <line x1="8" y1="23" x2="16" y2="23"></line>
             </svg>
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Adicione uma transação ou faça uma pergunta..."
            disabled={isLoading}
            aria-label="Chatbot Input"
            className="chat-input-field"
          />
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="chat-send-button"
            disabled={isLoading || !inputValue.trim()}
          >
            <svg className="send-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
        {/* Suggestion buttons could be added here if desired */}
        {/*
        <div className="chat-suggestions">
            {['💰 Dicas de poupança', '📈 Aconselhamento de investimento', '🎯 Planeamento de objetivos'].map((suggestion, i) => (
                <button 
                    key={i}
                    onClick={() => setInputValue(suggestion)}
                    className="suggestion-button"
                >
                    {suggestion}
                </button>
            ))}
        </div>
        */}
      </div>
    </div>
  );
};

export default AIAssistant;