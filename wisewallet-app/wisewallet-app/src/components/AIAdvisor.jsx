import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/revolut-base.css';
import './AIAdvisor.css';

export default function AIAdvisor({ openAIAssistant, setView }) {
  const [healthScore, setHealthScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(true);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [financialData, setFinancialData] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    debt: 0,
    goals: [],
    categories: []
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch last 30 days of transactions
      const startInfo = new Date();
      startInfo.setDate(startInfo.getDate() - 30);
      
      const { data: transactions } = await supabase
        .from('expenses')
        .select('amount, category_id, categories(name)')
        .eq('user_id', user.id)
        .gte('expense_date', startInfo.toISOString());

      // Fetch accounts for debt
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance, type')
        .eq('user_id', user.id);

      // Fetch goals
      const { data: goals } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id);

      // Process Data
      let income = 0;
      let expenses = 0;
      let debt = 0;

      transactions?.forEach(t => {
        if (t.categories?.name.toLowerCase() === 'income') income += t.amount;
        else expenses += t.amount;
      });

      accounts?.forEach(a => {
        if (a.type === 'credit' || a.balance < 0) debt += Math.abs(a.balance);
      });

      const savings = income - expenses;

      setFinancialData({
        income,
        expenses,
        savings,
        debt,
        goals: goals || [],
        transactions: transactions || []
      });

      // Calculate Score
      const savingsRate = income > 0 ? (savings / income) : 0;
      const savingsScore = Math.min(40, (savingsRate / 0.2) * 40);
      const debtScore = debt === 0 ? 30 : Math.max(0, 30 - (debt / 1000)); 
      const avgGoalProgress = goals?.length > 0 
        ? goals.reduce((acc, g) => acc + (g.current_amount / g.target_amount), 0) / goals.length 
        : 0;
      const goalScore = Math.min(30, avgGoalProgress * 30);

      setHealthScore(Math.round(savingsScore + debtScore + goalScore));
      setLoading(false);

      // --- Call Gemini for Advanced Analysis ---
      try {
          const { data: aiResponse, error } = await supabase.functions.invoke('gemini-chat', { 
              body: { task: 'advisor', userId: user.id } 
          });
          
          if (aiResponse && aiResponse.type === 'advisor_report' && aiResponse.data.length > 0) {
              setAiRecommendations(aiResponse.data);
          } else {
              throw new Error("No AI data returned");
          }
      } catch (e) {
          console.warn("AI Offline, using local logic:", e);
          // --- FALLBACK LOGIC (Runs if AI fails) ---
          const fallbackRecs = [];
          
          // 1. Debt Logic
          if (debt > 0) {
              fallbackRecs.push({
                  icon: '💳',
                  title: 'Atenção à Dívida',
                  impact: 'High Impact',
                  type: 'poor',
                  desc: `Detetámos uma dívida de €${debt}. A tua prioridade deve ser liquidar isto para evitar juros.`
              });
          }

          // 2. Savings Logic
          const rate = income > 0 ? (savings / income) : 0;
          if (rate < 0.1) {
             fallbackRecs.push({
                  icon: '📉',
                  title: 'Aumentar Poupança',
                  impact: 'High Impact',
                  type: 'fair',
                  desc: `Estás a poupar apenas ${(rate*100).toFixed(0)}%. Tenta cortar em gastos supérfluos para chegar aos 10%.`
             });
          } else if (rate > 0.3) {
             fallbackRecs.push({
                  icon: '🚀',
                  title: 'Excelente Poupança',
                  impact: 'Medium Impact',
                  type: 'excellent',
                  desc: `Estás a poupar ${(rate*100).toFixed(0)}% do teu rendimento! Considera investir o excedente.`
             });
          } else {
             fallbackRecs.push({
                  icon: '⚖️',
                  title: 'Poupança Estável',
                  impact: 'Medium Impact',
                  type: 'good',
                  desc: `A tua taxa de poupança é saudável. Mantém o ritmo!`
             });
          }

          // 3. General Logic
          if (expenses > income) {
              fallbackRecs.push({
                  icon: '⚠️',
                  title: 'Gastos Excessivos',
                  impact: 'High Impact',
                  type: 'poor',
                  desc: `Cuidado! Gastaste mais do que ganhaste. Revê o teu orçamento urgente.`
              });
          } else {
              fallbackRecs.push({
                  icon: '🛡️',
                  title: 'Fundo de Emergência',
                  impact: 'Low Impact',
                  type: 'good',
                  desc: `Como as contas estão em dia, reforça o teu fundo de emergência.`
              });
          }

          setAiRecommendations(fallbackRecs);
      } finally {
          setAnalyzing(false);
      }
    };

    fetchData();
  }, []);

  const getScoreInfo = (score) => {
    if (score >= 80) return { type: 'excellent', label: 'Excellent' };
    if (score >= 60) return { type: 'good', label: 'Good' };
    if (score >= 40) return { type: 'fair', label: 'Fair' };
    return { type: 'poor', label: 'Needs Work' };
  };

  const scoreInfo = getScoreInfo(healthScore);

  if (loading) return <div className="revolut-empty-state">Loading financial data...</div>;

  return (
    <div className="revolut-container">
      {/* Header */}
      <div className="revolut-header">
        <button 
          onClick={() => setView ? setView('Dashboard') : window.history.back()}
          className="revolut-back-btn"
        >
          ←
        </button>
        <div>
          <h1 className="revolut-title">AI Financial Advisor</h1>
          <p className="revolut-subtitle">Real-time analysis based on your actual spending & goals</p>
        </div>
        <button 
          onClick={() => openAIAssistant && openAIAssistant()}
          className="revolut-icon-circle" 
          style={{ background: 'rgba(0, 117, 255, 0.2)', cursor: 'pointer', border: 'none', transition: 'all 0.2s' }}
        >
          ✨
        </button>
      </div>

      {/* Financial Health Score */}
      <div className="revolut-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }} viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle 
                cx="48" cy="48" r="40" 
                fill="none"
                stroke={healthScore >= 80 ? '#00D856' : healthScore >= 60 ? '#0075FF' : healthScore >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${(healthScore / 100) * 251} 251`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span className="revolut-value" style={{ fontSize: '2rem', margin: 0 }}>{healthScore}</span>
              <span className="revolut-item-subtitle" style={{ fontSize: '0.75rem' }}>Score</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Financial Health Score</h2>
            <p className={healthScore >= 80 ? 'revolut-change-positive' : healthScore >= 60 ? '' : 'revolut-change-negative'} style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{scoreInfo.label}</p>
            <p className="revolut-item-subtitle" style={{ marginBottom: '1rem' }}>
              {healthScore > 60 ? "You're on the right track! Keep it up." : "There are some areas for improvement."}
            </p>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${healthScore}%`, 
                background: healthScore >= 80 ? '#00D856' : healthScore >= 60 ? '#0075FF' : healthScore >= 40 ? '#f59e0b' : '#ef4444',
                borderRadius: '9999px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation Cards */}
      <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '1rem' }}>
          {analyzing ? "Generating AI Insights..." : "AI Strategic Recommendations"}
      </h2>

      {/* NEW: AI Text Analysis Box */}
      {!analyzing && aiRecommendations.length > 0 && (
          <div className="revolut-card" style={{ marginBottom: '1.5rem', background: 'rgba(0, 117, 255, 0.1)', border: '1px solid rgba(0, 117, 255, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="revolut-icon-circle" style={{ background: 'rgba(0, 117, 255, 0.2)' }}>🤖</div>
                  <h3 className="revolut-item-title" style={{ color: '#0075FF' }}>Análise do Advisor</h3>
              </div>
              <p className="revolut-item-subtitle" style={{ lineHeight: '1.6' }}>
                  Com base na análise dos teus últimos 30 dias: 
                  <br/><br/>
                  <strong>1. {aiRecommendations[0]?.title}:</strong> {aiRecommendations[0]?.desc}
                  <br/>
                  <strong>2. {aiRecommendations[1]?.title}:</strong> {aiRecommendations[1]?.desc}
                  <br/>
                  <strong>3. {aiRecommendations[2]?.title}:</strong> {aiRecommendations[2]?.desc}
              </p>
          </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {analyzing ? (
             <div className="revolut-empty-state" style={{ gridColumn: '1 / -1' }}>
                 <p style={{ marginBottom: '0.5rem' }}>🧠 Analyzing your transaction history...</p>
                 <p className="revolut-item-subtitle">Comparing spending against budgets and goals.</p>
             </div>
        ) : (
            aiRecommendations.map((rec, i) => (
              <div key={i} className="revolut-card-sm" style={{ 
                background: rec.type === 'excellent' ? 'rgba(0, 216, 86, 0.1)' : rec.type === 'poor' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 117, 255, 0.1)',
                border: `1px solid ${rec.type === 'excellent' ? 'rgba(0, 216, 86, 0.3)' : rec.type === 'poor' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 117, 255, 0.3)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{rec.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h3 className="revolut-item-title">{rec.title}</h3>
                    <span className="revolut-item-subtitle" style={{ fontSize: '0.75rem', color: rec.type === 'excellent' ? '#00D856' : rec.type === 'poor' ? '#ef4444' : '#0075FF' }}>● {rec.impact}</span>
                  </div>
                </div>
                <p className="revolut-item-subtitle">{rec.desc}</p>
              </div>
            ))
        )}
      </div>

      {/* NEW: Quick Stats Grid */}
      <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '1rem' }}>Raio-X Financeiro</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Stat 1: Top Category */}
          <div className="revolut-card-sm">
              <div className="revolut-label" style={{ fontSize: '0.875rem' }}>🏆 Maior Gasto</div>
              <div className="revolut-value" style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
                  {financialData.transactions?.length > 0 
                    ? Object.entries(financialData.transactions.reduce((acc, t) => {
                        const cat = t.categories?.name || 'Outros';
                        if (cat.toLowerCase() !== 'income') acc[cat] = (acc[cat] || 0) + t.amount;
                        return acc;
                      }, {})).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A'
                    : 'Sem dados'}
              </div>
              <div className="revolut-item-subtitle">
                  A tua categoria #1
              </div>
          </div>

          {/* Stat 2: Daily Average */}
          <div className="revolut-card-sm">
              <div className="revolut-label" style={{ fontSize: '0.875rem' }}>📅 Média Diária</div>
              <div className="revolut-value" style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
                  €{(financialData.expenses / 30).toFixed(2)}
              </div>
              <div className="revolut-item-subtitle">
                  Gasto por dia (aprox.)
              </div>
          </div>

          {/* Stat 3: Savings Rate */}
          <div className="revolut-card-sm">
              <div className="revolut-label" style={{ fontSize: '0.875rem' }}>💰 Taxa de Poupança</div>
              <div className="revolut-value" style={{ 
                fontSize: '1.5rem', 
                margin: '0.5rem 0',
                color: financialData.savings > 0 ? '#00D856' : '#ef4444'
              }}>
                  {financialData.income > 0 ? ((financialData.savings / financialData.income) * 100).toFixed(1) : 0}%
              </div>
              <div className="revolut-item-subtitle">
                  do teu rendimento total
              </div>
          </div>
      </div>

      {/* Projections based on Savings */}
      <div className="revolut-card">
        <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Simple Projections</h2>
        <p className="revolut-item-subtitle" style={{ marginBottom: '1rem' }}>If you maintain your current monthly savings of €{financialData.savings.toLocaleString()}:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }}>
            <p className="revolut-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>1 Year</p>
            <p className="revolut-value" style={{ fontSize: '1.5rem', margin: '0.5rem 0', color: '#00D856' }}>+€{(financialData.savings * 12).toLocaleString()}</p>
            <p className="revolut-item-subtitle" style={{ fontSize: '0.75rem' }}>Total Saved</p>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }}>
            <p className="revolut-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>5 Years</p>
            <p className="revolut-value" style={{ fontSize: '1.5rem', margin: '0.5rem 0', color: '#00D856' }}>+€{(financialData.savings * 60).toLocaleString()}</p>
            <p className="revolut-item-subtitle" style={{ fontSize: '0.75rem' }}>Total Saved</p>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }}>
            <p className="revolut-label" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Potential Investment</p>
            <p className="revolut-value" style={{ fontSize: '1.5rem', margin: '0.5rem 0', color: '#0075FF' }}>€{(financialData.savings * 12 * 1.07).toLocaleString()}</p>
            <p className="revolut-item-subtitle" style={{ fontSize: '0.75rem' }}>At 7% annual return (1 yr)</p>
          </div>
        </div>
      </div>

      {/* Chat Button */}
      <div style={{ marginTop: '1.5rem' }}>
        <button onClick={openAIAssistant} className="revolut-btn" style={{ width: '100%', fontSize: '1rem', padding: '1rem' }}>💬 Chat with AI Assistant</button>
      </div>
    </div>
  );
}