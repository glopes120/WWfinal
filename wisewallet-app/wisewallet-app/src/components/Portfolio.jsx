import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { supabase } from '../supabaseClient';
import './Portfolio.css';

// --- CONFIG ---
const STOCK_CATEGORIES = {
  'Tech Giants': {
    'AAPL': { name: 'Apple Inc.', base: 185, vol: 2.5 },
    'MSFT': { name: 'Microsoft Corp.', base: 410, vol: 2.0 },
    'GOOGL': { name: 'Alphabet Inc.', base: 170, vol: 2.8 },
    'AMZN': { name: 'Amazon.com Inc.', base: 180, vol: 3.0 },
    'META': { name: 'Meta Platforms', base: 480, vol: 3.5 },
    'NVDA': { name: 'NVIDIA Corp.', base: 900, vol: 4.5 },
  },
  'Innovation': {
    'TSLA': { name: 'Tesla Inc.', base: 240, vol: 5.5 },
    'NFLX': { name: 'Netflix Inc.', base: 620, vol: 3.0 },
    'AMD': { name: 'Adv. Micro Devices', base: 160, vol: 4.0 },
    'PLTR': { name: 'Palantir Tech', base: 24, vol: 6.0 },
    'COIN': { name: 'Coinbase Global', base: 250, vol: 7.0 },
    'UBER': { name: 'Uber Tech', base: 75, vol: 3.0 },
  },
  'Blue Chip': {
    'JPM': { name: 'JPMorgan Chase', base: 195, vol: 1.8 },
    'V': { name: 'Visa Inc.', base: 280, vol: 1.5 },
    'DIS': { name: 'Walt Disney Co.', base: 115, vol: 2.5 },
    'KO': { name: 'Coca-Cola Co.', base: 60, vol: 0.8 },
    'PEP': { name: 'PepsiCo Inc.', base: 170, vol: 0.9 },
    'MCD': { name: 'McDonald\'s Corp.', base: 270, vol: 1.2 },
  },
  'ETFs': {
    'SPY': { name: 'S&P 500 ETF', base: 510, vol: 1.0 },
    'VOO': { name: 'Vanguard S&P 500', base: 470, vol: 1.0 },
    'QQQ': { name: 'Invesco QQQ', base: 440, vol: 1.5 },
  }
};
const STOCK_DB = Object.values(STOCK_CATEGORIES).reduce((acc, cat) => ({ ...acc, ...cat }), {});
const COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-pink-500', 'bg-purple-500', 'bg-orange-500', 'bg-indigo-500'];
const NEWS_MOCK = [
  { title: 'Fed Signals Potential Rate Cut', desc: 'Inflation data suggests a dovish stance from the central bank.', time: '2h ago', source: 'FT' },
  { title: 'Tech Sector Rally', desc: 'Major earnings reports exceed expectations, driving NASDAQ higher.', time: '5h ago', source: 'CNBC' },
  { title: 'Housing Market Update', desc: 'New home sales data shows unexpected cooling in key regions.', time: '1d ago', source: 'Bloomberg' }
];

// --- HELPERS ---
const generateStockHistory = (ticker, days = 30) => {
  const stock = STOCK_DB[ticker] || { name: ticker, base: 100, vol: 5 };
  let currentPrice = stock.base;
  const history = [];
  const today = new Date();
  let seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + today.getDate();
  const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = days; i >= 0; i--) {
    const date = new Date(today); date.setDate(date.getDate() - i);
    const change = (random() - 0.5) * (stock.base * (stock.vol / 100)); 
    currentPrice += change; if (currentPrice < 1) currentPrice = 1;
    history.push({ date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), price: parseFloat(currentPrice.toFixed(2)) });
  }
  return history;
};

const fetchStockData = async (ticker) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const formattedTicker = ticker.toUpperCase();
  const history = generateStockHistory(formattedTicker, 30);
  const currentPrice = history[history.length - 1].price;
  const prevPrice = history[history.length - 2].price;
  const change = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2);
  const name = STOCK_DB[formattedTicker]?.name || formattedTicker;
  return { ticker: formattedTicker, name, price: currentPrice, change, history };
};

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'market', 'insights'
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  
  const [selectedStock, setSelectedStock] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);

  // Buy Form
  const [buyForm, setBuyForm] = useState({ ticker: '', quantity: 1, selectedAccountId: '', stockData: null, loadingData: false, error: null, searchTerm: '' });
  // Sell Form
  const [sellForm, setSellForm] = useState({ investmentId: null, ticker: '', quantity: 1, maxQuantity: 0, currentPrice: 0 });

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) await Promise.all([fetchInvestments(user.id), fetchAccounts(user.id), fetchCategories()]);
    };
    initData();
  }, []);

  const fetchInvestments = async (userId) => {
    const { data } = await supabase.from('portfolio_investments').select('*').eq('user_id', userId);
    if (data) {
      const enhanced = await Promise.all(data.map(async (inv, index) => {
        const stockData = await fetchStockData(inv.ticker);
        const quantity = inv.quantity || Math.max(1, Math.round(inv.amount / (stockData.price * 0.9)));
        const currentValue = stockData.price * quantity;
        const totalReturn = currentValue - parseFloat(inv.amount);
        const returnPct = inv.amount > 0 ? (totalReturn / inv.amount * 100).toFixed(2) : 0;
        return { ...inv, quantity, currentPrice: stockData.price, currentValue, name: stockData.name, change: stockData.change, returnPct, colorClass: COLORS[index % COLORS.length], history: stockData.history };
      }));
      // Allocations
      const totalVal = enhanced.reduce((sum, i) => sum + i.currentValue, 0);
      setInvestments(enhanced.map(i => ({ ...i, allocation: totalVal > 0 ? ((i.currentValue / totalVal) * 100).toFixed(1) : 0 })).sort((a, b) => b.currentValue - a.currentValue));
    }
  };
  const fetchAccounts = async (uid) => { const { data } = await supabase.from('accounts').select('*').eq('user_id', uid); setAccounts(data || []); };
  const fetchCategories = async () => { const { data } = await supabase.from('categories').select('*'); setCategories(data || []); };

  const handleTickerSelect = async (ticker) => {
    setBuyForm(prev => ({ ...prev, ticker, searchTerm: ticker, loadingData: true, stockData: null }));
    const data = await fetchStockData(ticker);
    setBuyForm(prev => ({ ...prev, loadingData: false, stockData: data }));
  };

  const executeBuy = async () => {
    const { quantity, selectedAccountId, stockData } = buyForm;
    if (!stockData || quantity <= 0 || !selectedAccountId) return;
    const account = accounts.find(a => a.id === selectedAccountId);
    const cost = stockData.price * quantity;
    if (account.balance < cost) return alert('Insufficient funds');
    
    await supabase.from('accounts').update({ balance: account.balance - cost }).eq('id', selectedAccountId);
    const existing = investments.find(i => i.ticker === stockData.ticker);
    if (existing) {
      await supabase.from('portfolio_investments').update({ amount: parseFloat(existing.amount) + cost, quantity: parseFloat(existing.quantity) + parseFloat(quantity) }).eq('id', existing.id);
    } else {
      await supabase.from('portfolio_investments').insert([{ user_id: user.id, name: stockData.name, ticker: stockData.ticker, amount: cost, quantity: parseFloat(quantity), change: 0 }]);
    }
    // Expense record
    const expCat = categories.find(c => c.name.toLowerCase().includes('invest'))?.id || categories[0]?.id;
    await supabase.from('expenses').insert([{ user_id: user.id, category_id: expCat, amount: cost, description: `Buy ${quantity} ${stockData.ticker}`, expense_date: new Date().toISOString() }]);

    alert('Purchase successful!');
    setShowBuyModal(false);
    setBuyForm({ ticker: '', quantity: 1, selectedAccountId: '', stockData: null, loadingData: false, error: null, searchTerm: '' });
    fetchInvestments(user.id); fetchAccounts(user.id);
  };

  const executeSell = async () => {
    const { investmentId, quantity, currentPrice, ticker } = sellForm;
    const totalSale = currentPrice * quantity;
    const inv = investments.find(i => i.id === investmentId);
    const remaining = inv.quantity - quantity;
    
    if (remaining <= 0) await supabase.from('portfolio_investments').delete().eq('id', investmentId);
    else await supabase.from('portfolio_investments').update({ quantity: remaining, amount: inv.amount - ((inv.amount / inv.quantity) * quantity) }).eq('id', investmentId);
    
    await supabase.from('accounts').update({ balance: accounts[0].balance + totalSale }).eq('id', accounts[0].id);
    const incCat = categories.find(c => c.name.toLowerCase() === 'income')?.id;
    if (incCat) await supabase.from('expenses').insert([{ user_id: user.id, category_id: incCat, amount: totalSale, description: `Sold ${quantity} ${ticker}`, expense_date: new Date().toISOString() }]);

    setShowSellModal(false); fetchInvestments(user.id); fetchAccounts(user.id);
  };

  const openChart = (inv) => { setSelectedStock({ ticker: inv.ticker, name: inv.name, price: inv.currentPrice, change: inv.change, history: inv.history }); setShowChartModal(true); };

  const totalValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalCost = investments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  
  // Calculate dynamic metrics
  const totalReturnVal = totalValue - totalCost;
  const totalReturnPct = totalCost > 0 ? (totalReturnVal / totalCost * 100).toFixed(2) : 0;
  
  // Estimate day change: sum of (currentValue * (changePct / 100))
  // Note: This is an approximation since we don't have exact previous close for every user holding in the DB, 
  // but we have 'change' % from stockData.
  const dayChangeVal = investments.reduce((sum, i) => sum + (i.currentValue * (parseFloat(i.change) / 100)), 0);
  const dayChangePct = totalValue > 0 ? (dayChangeVal / totalValue * 100).toFixed(2) : 0;

  const chartData = [{ month: 'Start', value: totalCost }, { month: 'Now', value: totalValue }];

  // Search filter for dropdown
  const filteredStocks = useMemo(() => {
    const term = buyForm.searchTerm.toLowerCase();
    return Object.entries(STOCK_DB).filter(([t, d]) => t.toLowerCase().includes(term) || d.name.toLowerCase().includes(term)).slice(0, 6);
  }, [buyForm.searchTerm]);

  return (
    <div className="portfolio-container">
      <div className="portfolio-header-area">
        <div className="portfolio-top-row">
           <h1 className="portfolio-title">Portfolio</h1>
           <button onClick={() => setShowBuyModal(true)} className="btn-primary">+ Add Investment</button>
        </div>
        <div className="portfolio-tabs">
           <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
           <button className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>Market</button>
           <button className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>Insights</button>
        </div>
      </div>

      {/* --- TAB CONTENT --- */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          <div className="portfolio-grid-top">
            <div className="card-std col-span-2">
               <div className="card-header"><h2 className="card-title">Performance</h2></div>
               <div style={{width:'100%', height: 220, minHeight: 220}}>
                 <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><XAxis dataKey="month" hide /><Tooltip contentStyle={{background: 'var(--theme-surface)', border: '1px solid var(--theme-border)'}} /><Line type="monotone" dataKey="value" stroke="var(--theme-accent-primary)" strokeWidth={3} dot={{r:4}} /></LineChart></ResponsiveContainer>
               </div>
            </div>
            <div className="card-std">
               <div className="card-header"><h2 className="card-title">Summary</h2></div>
               <div className="summary-list">
                  <div className="summary-item"><span className="summary-label">Total Value</span><span className="summary-val">${totalValue.toLocaleString()}</span></div>
                  <div className="summary-item">
                    <span className="summary-label">Day Change</span>
                    <span className={`summary-val ${dayChangePct >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {dayChangePct >= 0 ? '+' : ''}{dayChangePct}%
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Return</span>
                    <span className={`summary-val ${totalReturnPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct}%
                    </span>
                  </div>
               </div>
               <div className="allocation-bar">{investments.map((inv, i) => <div key={i} className={`${inv.colorClass} h-full`} style={{ width: `${inv.allocation}%` }} />)}</div>
               <div className="legend-grid">{investments.map((inv, i) => <div key={i} className="legend-item"><span className={`dot ${inv.colorClass}`} />{inv.ticker}</div>)}</div>
            </div>
          </div>

          <div className="card-std">
             <div className="card-header"><h2 className="card-title">Holdings</h2></div>
             <div className="table-container">
               <table className="std-table">
                 <thead>
                   <tr>
                     <th>Asset</th>
                     <th>Price</th>
                     <th>Holdings</th>
                     <th>Value</th>
                     <th>Change</th>
                   </tr>
                 </thead>
                 <tbody>
                   {investments.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem'}}>No investments yet.</td></tr> : investments.map(inv => (
                     <tr key={inv.id} onClick={() => openChart(inv)}>
                       <td><div style={{display:'flex', flexDirection:'column'}}><span style={{fontWeight:'700'}}>{inv.ticker}</span><span style={{fontSize:'0.8rem', color:'var(--theme-text-secondary)'}}>{inv.name}</span></div></td>
                       <td>${inv.currentPrice}</td>
                       <td>{inv.quantity.toFixed(2)}</td>
                       <td style={{fontWeight:'700'}}>${inv.currentValue.toLocaleString()}</td>
                       <td className={parseFloat(inv.change) >= 0 ? 'text-positive' : 'text-negative'}>{inv.change}%</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </>
      )}

      {/* 2. MARKET TAB */}
      {activeTab === 'market' && (
        <div className="market-section">
           {Object.entries(STOCK_CATEGORIES).map(([cat, stocks]) => (
             <div key={cat} className="market-group">
                <h3 className="market-cat-title">{cat}</h3>
                <div className="market-grid">
                   {Object.entries(stocks).map(([ticker, data]) => (
                     <div key={ticker} className="market-card">
                        <div className="m-card-top">
                           <span className="m-ticker">{ticker}</span>
                           <span className="m-price">${data.base}</span>
                        </div>
                        <div className="m-name">{data.name}</div>
                        <button onClick={() => { handleTickerSelect(ticker); setShowBuyModal(true); }} className="btn-buy-sm">Buy</button>
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      )}

      {/* 3. INSIGHTS TAB */}
      {activeTab === 'insights' && (
        <div className="insights-container">
           <div className="card-std">
              <div className="card-header"><h2 className="card-title">Market News</h2></div>
              <div>{NEWS_MOCK.map((n, i) => (
                <div key={i} className="news-row">
                   <div className="news-content">
                      <h4>{n.title}</h4>
                      <p>{n.desc}</p>
                      <div className="news-source">{n.source} • {n.time}</div>
                   </div>
                </div>
              ))}</div>
           </div>
           <div>
              <div className="card-header"><h2 className="card-title">AI Insights</h2></div>
              <div className="insight-box">
                 <strong>💡 Rebalancing Opportunity</strong>
                 <p style={{fontSize:'0.9rem', marginTop:'0.5rem'}}>Tech allocation is high (45%). Consider diversifying into ETFs.</p>
              </div>
              <div className="insight-box">
                 <strong>💰 Dividend Alert</strong>
                 <p style={{fontSize:'0.9rem', marginTop:'0.5rem'}}>You have pending dividends. Reinvest for compound growth.</p>
              </div>
           </div>
        </div>
      )}

      {/* --- MODALS --- */}
      
      {/* BUY */}
      {showBuyModal && (
        <div className="modal-backdrop" onClick={() => setShowBuyModal(false)}>
           <div className="modal-window" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-h2">Buy Asset</h2><button className="close-btn" onClick={() => setShowBuyModal(false)}>✕</button></div>
              
              <div className="form-field">
                 <label className="form-label">Ticker Symbol</label>
                 <input className="form-control" value={buyForm.searchTerm} onChange={e => setBuyForm({...buyForm, searchTerm: e.target.value.toUpperCase(), stockData: null})} placeholder="Search..." />
                 {/* Auto-complete dropdown could go here, simplified for standard UI */}
                 {buyForm.searchTerm && !buyForm.stockData && filteredStocks.length > 0 && (
                   <div style={{position:'absolute', background:'var(--theme-surface)', border:'1px solid var(--theme-border)', width:'calc(100% - 4rem)', zIndex:10, maxHeight:'150px', overflowY:'auto'}}>
                      {filteredStocks.map(([t, d]) => (
                        <div key={t} onClick={() => handleTickerSelect(t)} style={{padding:'0.5rem', borderBottom:'1px solid var(--theme-border)', cursor:'pointer'}}>{d.name} ({t})</div>
                      ))}
                   </div>
                 )}
              </div>

              {buyForm.stockData && (
                <div style={{padding:'1rem', background:'var(--theme-bg)', borderRadius:'0.5rem', marginBottom:'1rem', display:'flex', justifyContent:'space-between'}}>
                   <strong>{buyForm.stockData.name}</strong>
                   <span style={{color:'var(--theme-accent-primary)'}}>${buyForm.stockData.price}</span>
                </div>
              )}

              <div className="form-field">
                 <label className="form-label">Quantity</label>
                 <input type="number" className="form-control" min="0.1" step="0.1" value={buyForm.quantity} onChange={e => setBuyForm({...buyForm, quantity: e.target.value})} />
              </div>

              <div className="form-field">
                 <label className="form-label">Account</label>
                 <select className="form-control" value={buyForm.selectedAccountId} onChange={e => setBuyForm({...buyForm, selectedAccountId: e.target.value})}>
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (${a.balance.toLocaleString()})</option>)}
                 </select>
              </div>

              {buyForm.stockData && <div style={{textAlign:'right', fontWeight:'bold', fontSize:'1.2rem', marginBottom:'1rem'}}>Total: ${(buyForm.stockData.price * buyForm.quantity).toLocaleString()}</div>}

              <button className="btn-primary" style={{width:'100%'}} onClick={executeBuy} disabled={!buyForm.stockData || !buyForm.selectedAccountId}>Confirm Purchase</button>
           </div>
        </div>
      )}

      {/* CHART Detail Modal */}
      {showChartModal && selectedStock && (
        <div className="modal-backdrop" onClick={() => setShowChartModal(false)}>
           <div className="modal-window" style={{maxWidth:'700px'}} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                 <div><h2 className="modal-h2">{selectedStock.name}</h2><span className="ticker-badge" style={{marginTop:'0.5rem'}}>{selectedStock.ticker}</span></div>
                 <div className="text-right"><p style={{fontSize:'1.5rem', fontWeight:'bold'}}>${selectedStock.price}</p><p style={{color:'var(--theme-text-secondary)'}}>Current Price</p></div>
              </div>
              <div style={{width: '100%', height: 300, minHeight: 300, marginBottom:'1.5rem'}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={selectedStock.history}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--theme-accent-primary)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--theme-accent-primary)" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" hide /><Tooltip contentStyle={{background:'var(--theme-surface)', border:'1px solid var(--theme-border)'}} /><Area type="monotone" dataKey="price" stroke="var(--theme-accent-primary)" fill="url(#g1)" /></AreaChart></ResponsiveContainer></div>
              <div style={{display:'flex', gap:'1rem', justifyContent:'flex-end'}}>
                 <button className="btn-danger" style={{padding:'0.6rem 1.2rem', borderRadius:'0.5rem', border:'none', cursor:'pointer'}} onClick={() => { setShowChartModal(false); setSellForm({ investmentId: investments.find(i => i.ticker === selectedStock.ticker).id, ticker: selectedStock.ticker, quantity: 1, maxQuantity: investments.find(i => i.ticker === selectedStock.ticker).quantity, currentPrice: selectedStock.price }); setShowSellModal(true); }}>Sell Position</button>
                 <button className="btn-secondary" onClick={() => setShowChartModal(false)}>Close</button>
              </div>
           </div>
        </div>
      )}

      {/* SELL Modal */}
      {showSellModal && (
        <div className="modal-backdrop" onClick={() => setShowSellModal(false)}>
           <div className="modal-window" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h2 className="modal-h2">Sell {sellForm.ticker}</h2><button className="close-btn" onClick={() => setShowSellModal(false)}>✕</button></div>
              <div className="form-field"><label className="form-label">Quantity (Max: {sellForm.maxQuantity.toFixed(2)})</label><input type="number" className="form-control" max={sellForm.maxQuantity} value={sellForm.quantity} onChange={e => setSellForm({...sellForm, quantity: e.target.value})} /></div>
              <div style={{textAlign:'right', fontWeight:'bold', fontSize:'1.2rem', marginBottom:'1rem'}}>Total Proceeds: ${(sellForm.quantity * sellForm.currentPrice).toLocaleString()}</div>
              <button className="btn-danger" style={{width:'100%', padding:'0.75rem', borderRadius:'0.5rem', border:'none', cursor:'pointer'}} onClick={executeSell}>Confirm Sell</button>
           </div>
        </div>
      )}

    </div>
  );
}