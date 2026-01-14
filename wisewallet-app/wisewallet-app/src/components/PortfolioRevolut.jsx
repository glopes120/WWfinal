import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../supabaseClient';
import { fetchMarketPrice } from '../services/marketDataService';
import './PortfolioRevolut.css';

// --- STOCK CONFIG ---
const STOCK_CATEGORIES = {
  'Tech Giants': {
    'AAPL': { name: 'Apple Inc.', base: 185, vol: 2.5, icon: '📱' },
    'MSFT': { name: 'Microsoft Corp.', base: 410, vol: 2.0, icon: '💻' },
    'GOOGL': { name: 'Alphabet Inc.', base: 170, vol: 2.8, icon: '🔍' },
    'AMZN': { name: 'Amazon.com Inc.', base: 180, vol: 3.0, icon: '📦' },
    'META': { name: 'Meta Platforms', base: 480, vol: 3.5, icon: '👤' },
    'NVDA': { name: 'NVIDIA Corp.', base: 900, vol: 4.5, icon: '🎮' },
  },
  'Innovation': {
    'TSLA': { name: 'Tesla Inc.', base: 240, vol: 5.5, icon: '🚗' },
    'NFLX': { name: 'Netflix Inc.', base: 620, vol: 3.0, icon: '🎬' },
    'AMD': { name: 'Adv. Micro Devices', base: 160, vol: 4.0, icon: '⚡' },
    'PLTR': { name: 'Palantir Tech', base: 24, vol: 6.0, icon: '🔮' },
    'COIN': { name: 'Coinbase Global', base: 250, vol: 7.0, icon: '₿' },
    'UBER': { name: 'Uber Tech', base: 75, vol: 3.0, icon: '🚕' },
  },
  'Blue Chip': {
    'JPM': { name: 'JPMorgan Chase', base: 195, vol: 1.8, icon: '🏦' },
    'V': { name: 'Visa Inc.', base: 280, vol: 1.5, icon: '💳' },
    'DIS': { name: 'Walt Disney Co.', base: 115, vol: 2.5, icon: '🎭' },
    'KO': { name: 'Coca-Cola Co.', base: 60, vol: 0.8, icon: '🥤' },
    'PEP': { name: 'PepsiCo Inc.', base: 170, vol: 0.9, icon: '🥤' },
    'MCD': { name: 'McDonald\'s Corp.', base: 270, vol: 1.2, icon: '🍔' },
  },
  'ETFs': {
    'SPY': { name: 'S&P 500 Index Fund', base: 510, vol: 1.0, icon: '📊' },
    'VOO': { name: 'Vanguard S&P 500', base: 470, vol: 1.0, icon: '📈' },
    'QQQ': { name: 'Invesco QQQ', base: 440, vol: 1.5, icon: '💹' },
    'TECH': { name: 'Tech Growth ETF', base: 350, vol: 2.0, icon: '📈' },
    'EM': { name: 'Emerging Markets', base: 98, vol: 2.5, icon: '🌍' },
    'BOND': { name: 'Bond Fund', base: 98, vol: 0.5, icon: '💼' },
    'REIT': { name: 'Real Estate REIT', base: 65, vol: 1.8, icon: '🏢' },
  }
};

const STOCK_DB = Object.values(STOCK_CATEGORIES).reduce((acc, cat) => ({ ...acc, ...cat }), {});
const COLORS = ['#00D856', '#0075FF', '#FFB800', '#8b5cf6', '#FF0080', '#00D4FF', '#FF6B00', '#A855F7'];

const NEWS_MOCK = [
  { title: 'Fed Signals Rate Cuts', source: 'Bloomberg', time: '2h ago', icon: '📰' },
  { title: 'Tech Stocks Rally', source: 'Reuters', time: '5h ago', icon: '💹' },
  { title: 'Housing Market Cools', source: 'CNBC', time: '1d ago', icon: '🏠' }
];

// Generate stock price history (pode receber preço atual como base)
const generateStockHistory = (ticker, days = 30, basePrice = null) => {
  const stock = STOCK_DB[ticker] || { name: ticker, base: 100, vol: 5 };
  let currentPrice = basePrice || stock.base;
  const history = [];
  const today = new Date();
  let seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + today.getDate();
  const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  
  // Se temos um preço real, ajusta o histórico para terminar nesse preço
  if (basePrice) {
    // Calcula o preço inicial estimado baseado no preço atual
    const volatility = stock.vol || 5;
    const estimatedStart = basePrice * (1 - (volatility / 100) * (days / 30));
    currentPrice = estimatedStart;
  }
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today); 
    date.setDate(date.getDate() - i);
    const change = (random() - 0.5) * (currentPrice * ((stock.vol || 5) / 100)); 
    currentPrice += change; 
    if (currentPrice < 1) currentPrice = 1;
    
    // No último dia, usa o preço real se fornecido
    if (i === 0 && basePrice) {
      currentPrice = basePrice;
    }
    
    history.push({ 
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      price: parseFloat(currentPrice.toFixed(2)),
      value: parseFloat(currentPrice.toFixed(2))
    });
  }
  return history;
};

const fetchStockData = async (ticker) => {
  const formattedTicker = ticker.toUpperCase();
  const stockInfo = STOCK_DB[formattedTicker] || { name: formattedTicker, base: 100, vol: 5 };
  const category = stockInfo?.category || 'stocks';
  
  // Usa simulação (sempre funciona, sem erros!)
  try {
    const simulatedPrice = await fetchMarketPrice(formattedTicker, category);
    
    if (simulatedPrice && simulatedPrice.price && simulatedPrice.price > 0) {
      // Gera histórico baseado no preço simulado
      const history = generateStockHistory(formattedTicker, 180, simulatedPrice.price);
      const name = stockInfo?.name || formattedTicker;
      const icon = stockInfo?.icon || '📊';
      
      return {
        ticker: formattedTicker,
        name,
        price: simulatedPrice.price,
        change: simulatedPrice.change || 0,
        history,
        icon,
        source: simulatedPrice.source || 'simulated', // Preserva source (coingecko ou simulated)
        volume: simulatedPrice.volume || simulatedPrice.volume24h || null
      };
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[Portfolio] Simulation error for ${ticker}:`, error.message);
    }
  }

  // Fallback: usar simulação básica (sempre funciona)
  await new Promise(resolve => setTimeout(resolve, 100)); // Reduzido delay
  const history = generateStockHistory(formattedTicker, 180);
  const currentPrice = history[history.length - 1].price;
  const prevPrice = history[history.length - 2]?.price || currentPrice;
  const change = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice * 100).toFixed(2) : 0;
  const name = stockInfo?.name || formattedTicker;
  const icon = stockInfo?.icon || '📊';
  
  return {
    ticker: formattedTicker,
    name,
    price: currentPrice,
    change: parseFloat(change),
    history,
    icon,
    source: 'simulated'
  };
};

export default function PortfolioRevolut({ setView, onDataRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [period, setPeriod] = useState('6M');
  const [investments, setInvestments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Add Investment Form
  const [addForm, setAddForm] = useState({
    searchTerm: '',
    ticker: '',
    name: '',
    amount: '',
    selectedAccountId: '',
    stockData: null,
    loadingData: false
  });

  // Sell Investment Form
  const [sellForm, setSellForm] = useState({
    quantity: '',
    maxQuantity: 0
  });

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await Promise.all([
          fetchInvestments(user.id),
          fetchAccounts(user.id),
          fetchCategories()
        ]);
      }
      setLoading(false);
    };
    initData();
  }, []);

  // Auto-refresh de preços a cada 60 segundos
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(async () => {
      if (user && investments.length > 0) {
        await fetchInvestments(user.id);
      }
    }, 60000); // Atualiza a cada 60 segundos

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, user, investments.length]);

  const fetchInvestments = async (userId) => {
    const { data } = await supabase
      .from('portfolio_investments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      const enhanced = await Promise.all(data.map(async (inv, index) => {
        const stockData = await fetchStockData(inv.ticker);
        const quantity = parseFloat(inv.quantity) || Math.max(1, Math.round(inv.amount / (stockData.price * 0.9)));
        const currentValue = stockData.price * quantity;
        const totalReturn = currentValue - parseFloat(inv.amount);
        const returnPct = inv.amount > 0 ? (totalReturn / inv.amount * 100).toFixed(2) : 0;
        const dayChangeVal = currentValue * (stockData.change / 100);
        
        return {
          ...inv,
          quantity,
          currentPrice: stockData.price,
          currentValue,
          name: stockData.name || inv.name,
          change: stockData.change,
          returnPct: parseFloat(returnPct),
          dayChangeVal,
          color: COLORS[index % COLORS.length],
          icon: stockData.icon || '📊',
          history: stockData.history
        };
      }));
      
      const totalVal = enhanced.reduce((sum, i) => sum + i.currentValue, 0);
      setInvestments(
        enhanced.map(i => ({
          ...i,
          allocation: totalVal > 0 ? parseFloat(((i.currentValue / totalVal) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.currentValue - a.currentValue)
      );
    } else {
      setInvestments([]);
    }
  };

  const fetchAccounts = async (uid) => {
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', uid);
    setAccounts(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    setCategories(data || []);
  };

  const handleTickerSearch = async (ticker) => {
    if (!ticker || ticker.length < 1) {
      setAddForm(prev => ({ ...prev, stockData: null }));
      return;
    }
    
    setAddForm(prev => ({ ...prev, loadingData: true, stockData: null }));
    const stockData = await fetchStockData(ticker.toUpperCase());
    setAddForm(prev => ({
      ...prev,
      ticker: stockData.ticker,
      name: stockData.name,
      stockData,
      loadingData: false
    }));
  };

  const handleAddInvestment = async () => {
    const { stockData, amount, selectedAccountId } = addForm;
    
    if (!stockData || !amount || !selectedAccountId) {
      alert('Please fill all fields');
      return;
    }

    const investmentAmount = parseFloat(amount);
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account || account.balance < investmentAmount) {
      alert('Insufficient funds');
      return;
    }

    try {
      const quantity = investmentAmount / stockData.price;
      
      // Update account balance
      await supabase
        .from('accounts')
        .update({ balance: account.balance - investmentAmount })
        .eq('id', selectedAccountId);

      // Check if investment already exists
      const existing = investments.find(i => i.ticker === stockData.ticker);
      
      if (existing) {
        // Update existing investment
        const newQuantity = existing.quantity + quantity;
        const newAmount = parseFloat(existing.amount) + investmentAmount;
        await supabase
          .from('portfolio_investments')
          .update({
            amount: newAmount,
            quantity: newQuantity,
            name: stockData.name
          })
          .eq('id', existing.id);
      } else {
        // Create new investment
        await supabase
          .from('portfolio_investments')
          .insert([{
            user_id: user.id,
            name: stockData.name,
            ticker: stockData.ticker,
            amount: investmentAmount,
            quantity: quantity,
            change: 0
          }]);
      }

      // Record as expense
      const expCat = categories.find(c => c.name.toLowerCase().includes('invest'))?.id || categories[0]?.id;
      if (expCat) {
        await supabase
          .from('expenses')
          .insert([{
            user_id: user.id,
            category_id: expCat,
            amount: investmentAmount,
            description: `Buy ${quantity.toFixed(2)} ${stockData.ticker}`,
            expense_date: new Date().toISOString()
          }]);
      }

      alert('Investment added successfully!');
      setShowAddModal(false);
      setAddForm({
        searchTerm: '',
        ticker: '',
        name: '',
        amount: '',
        selectedAccountId: '',
        stockData: null,
        loadingData: false
      });
      await Promise.all([fetchInvestments(user.id), fetchAccounts(user.id)]);
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (error) {
      console.error('Error adding investment:', error);
      alert('Error adding investment');
    }
  };

  const handleSellInvestment = async () => {
    if (!selectedInvestment) return;

    const sellQuantity = parseFloat(sellForm.quantity);
    if (isNaN(sellQuantity) || sellQuantity <= 0 || sellQuantity > sellForm.maxQuantity) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      const totalSale = selectedInvestment.currentPrice * sellQuantity;
      const remaining = selectedInvestment.quantity - sellQuantity;

      if (remaining <= 0) {
        // Delete investment
        await supabase
          .from('portfolio_investments')
          .delete()
          .eq('id', selectedInvestment.id);
      } else {
        // Update investment
        const newAmount = selectedInvestment.amount - ((selectedInvestment.amount / selectedInvestment.quantity) * sellQuantity);
        await supabase
          .from('portfolio_investments')
          .update({
            quantity: remaining,
            amount: newAmount
          })
          .eq('id', selectedInvestment.id);
      }

      // Add proceeds to first account
      if (accounts.length > 0) {
        await supabase
          .from('accounts')
          .update({ balance: accounts[0].balance + totalSale })
          .eq('id', accounts[0].id);
      }

      // Record as income
      const incCat = categories.find(c => c.name.toLowerCase() === 'income')?.id;
      if (incCat) {
        await supabase
          .from('expenses')
          .insert([{
            user_id: user.id,
            category_id: incCat,
            amount: totalSale,
            description: `Sold ${sellQuantity.toFixed(2)} ${selectedInvestment.ticker}`,
            expense_date: new Date().toISOString()
          }]);
      }

      alert('Investment sold successfully!');
      setSelectedInvestment(null);
      setSellForm({ quantity: '', maxQuantity: 0 });
      await Promise.all([fetchInvestments(user.id), fetchAccounts(user.id)]);
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (error) {
      console.error('Error selling investment:', error);
      alert('Error selling investment');
    }
  };

  const handleBuyMore = () => {
    setShowAddModal(true);
    if (selectedInvestment) {
      setAddForm(prev => ({
        ...prev,
        ticker: selectedInvestment.ticker,
        name: selectedInvestment.name,
        searchTerm: selectedInvestment.ticker
      }));
      handleTickerSearch(selectedInvestment.ticker);
    }
    setSelectedInvestment(null);
  };

  // Filtered stocks for search
  const filteredStocks = useMemo(() => {
    if (!addForm.searchTerm) return [];
    const term = addForm.searchTerm.toLowerCase();
    return Object.entries(STOCK_DB)
      .filter(([t, d]) => 
        t.toLowerCase().includes(term) || 
        d.name.toLowerCase().includes(term)
      )
      .slice(0, 6)
      .map(([ticker, data]) => ({ ticker, ...data }));
  }, [addForm.searchTerm]);

  // Calculate totals
  const totalValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  const totalCost = investments.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
  const totalReturn = totalValue - totalCost;
  const totalReturnPct = totalCost > 0 ? parseFloat((totalReturn / totalCost * 100).toFixed(2)) : 0;
  const dayChangeVal = investments.reduce((sum, inv) => sum + (inv.dayChangeVal || 0), 0);
  const dayChangePct = totalValue > 0 ? parseFloat((dayChangeVal / totalValue * 100).toFixed(2)) : 0;

  // Generate performance chart data based on period
  const generatePerformanceData = () => {
    if (investments.length === 0 || totalCost === 0) {
      return [{ month: 'Jan', value: 0 }, { month: 'Feb', value: 0 }, { month: 'Mar', value: 0 }, { month: 'Apr', value: 0 }, { month: 'May', value: 0 }, { month: 'Jun', value: 0 }];
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    // Simulate historical portfolio value
    const data = [];
    const baseValue = totalCost;
    let currentValue = baseValue;
    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
    
    for (let i = months.length - 1; i >= 0; i--) {
      const progress = (months.length - i) / months.length;
      const growthPercent = totalReturnPercent * progress;
      currentValue = baseValue * (1 + growthPercent / 100);
      data.push({ month: months[i], value: Math.max(0, currentValue) });
    }
    
    return data.reverse();
  };

  const performanceData = generatePerformanceData();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #000000, #0a0a0a)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="portfolio-revolut-container">
      {/* Header */}
      <div className="portfolio-revolut-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.75rem, 1vw + 0.5rem, 1rem)' }}>
          <button 
            onClick={() => setView ? setView('Dashboard') : window.history.back()}
            className="portfolio-back-btn"
          >
            ←
          </button>
          <h1 className="revolut-title" style={{ margin: 0 }}>Portfolio</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => setView && setView('Marketplace')}
            className="portfolio-marketplace-btn"
          >
            🏪 Market
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="portfolio-add-btn"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Total Value Card */}
      <div className="portfolio-value-card">
        <p className="portfolio-label">Total Portfolio Value</p>
        <h2 className="portfolio-total-value">
          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={dayChangePct >= 0 ? 'portfolio-change-positive' : 'portfolio-change-negative'}>
            {dayChangeVal >= 0 ? '+' : ''}${dayChangeVal.toFixed(2)} ({dayChangePct >= 0 ? '+' : ''}{dayChangePct}%)
          </span>
          <span className="portfolio-time-label">Today</span>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="portfolio-chart-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Performance</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['1M', '3M', '6M', '1Y', 'ALL'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`portfolio-period-btn ${period === p ? 'active' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {performanceData && performanceData.length > 0 ? (
          <div style={{ width: '100%', height: 180, minHeight: 180, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={180}>
              <LineChart data={performanceData}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0075FF" />
                <stop offset="50%" stopColor="#00D856" />
                <stop offset="100%" stopColor="#FF0080" />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} 
            />
            <YAxis hide domain={['dataMin - 2000', 'dataMax + 2000']} />
            <Tooltip 
              contentStyle={{ 
                background: '#1a1a1a', 
                border: 'none', 
                borderRadius: '0.75rem', 
                fontSize: '0.875rem',
                color: 'white'
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="url(#lineGradient)" 
              strokeWidth={3} 
              dot={false} 
            />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ width: '100%', height: 180, minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
            No performance data available
          </div>
        )}
      </div>

      {/* Holdings */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Holdings</h3>
        {investments.length === 0 ? (
          <div className="portfolio-empty-state">
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>
              No investments yet. Click "+ Add" to get started!
            </p>
          </div>
        ) : (
          investments.map((inv) => (
            <div
              key={inv.id}
              onClick={() => {
                setSelectedInvestment(inv);
                setSellForm({ quantity: '', maxQuantity: inv.quantity });
              }}
              className="portfolio-holding-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div 
                    className="portfolio-icon-circle"
                    style={{ background: inv.color + '20' }}
                  >
                    {inv.icon}
                  </div>
                  <div>
                    <p className="portfolio-ticker">{inv.ticker}</p>
                    <p className="portfolio-name">{inv.name}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="portfolio-holding-value">
                    ${inv.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={inv.change >= 0 ? 'portfolio-change-positive' : 'portfolio-change-negative'}>
                    {inv.change >= 0 ? '+' : ''}{inv.change.toFixed(2)}%
                  </p>
                </div>
              </div>
              {/* Allocation Bar */}
              <div style={{ marginTop: '0.75rem' }}>
                <div className="portfolio-allocation-bar">
                  <div
                    className="portfolio-allocation-fill"
                    style={{ width: `${inv.allocation}%`, background: inv.color }}
                  ></div>
                </div>
                <p className="portfolio-allocation-text">{inv.allocation}% of portfolio</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Market News */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Market News</h3>
        {NEWS_MOCK.map((item, i) => (
          <div key={i} className="portfolio-news-card">
            <div className="portfolio-news-icon">{item.icon}</div>
            <div style={{ flex: 1 }}>
              <p className="portfolio-news-title">{item.title}</p>
              <div className="portfolio-news-meta">
                <span>{item.source}</span>
                <span>•</span>
                <span>{item.time}</span>
              </div>
            </div>
            <button className="portfolio-news-arrow">→</button>
          </div>
        ))}
      </div>

      {/* Add Investment Modal */}
      {showAddModal && (
        <div 
          className="portfolio-modal-backdrop"
          onClick={() => {
            setShowAddModal(false);
            setAddForm({
              searchTerm: '',
              ticker: '',
              name: '',
              amount: '',
              selectedAccountId: '',
              stockData: null,
              loadingData: false
            });
          }}
        >
          <div className="portfolio-modal-content" onClick={e => e.stopPropagation()}>
            <div className="portfolio-modal-handle"></div>
            <h3 className="portfolio-modal-title">Add Investment</h3>
            
            <div className="portfolio-form-group">
              <label className="portfolio-form-label">Search Ticker</label>
              <input
                className="portfolio-form-input"
                placeholder="e.g., AAPL, MSFT, SPY"
                value={addForm.searchTerm}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setAddForm(prev => ({ ...prev, searchTerm: value }));
                  handleTickerSearch(value);
                }}
              />
              {addForm.searchTerm && filteredStocks.length > 0 && !addForm.stockData && (
                <div className="portfolio-stock-dropdown">
                  {filteredStocks.map((stock) => (
                    <div
                      key={stock.ticker}
                      onClick={() => {
                        setAddForm(prev => ({ ...prev, searchTerm: stock.ticker }));
                        handleTickerSearch(stock.ticker);
                      }}
                      className="portfolio-stock-option"
                    >
                      <span>{stock.icon} {stock.name} ({stock.ticker})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {addForm.loadingData && (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '1rem 0' }}>
                Loading stock data...
              </p>
            )}

            {addForm.stockData && (
              <div className="portfolio-stock-preview">
                <div>
                  <strong>{addForm.stockData.name}</strong>
                  <span className="portfolio-stock-price">${addForm.stockData.price.toFixed(2)}</span>
                </div>
                <span className={addForm.stockData.change >= 0 ? 'portfolio-change-positive' : 'portfolio-change-negative'}>
                  {addForm.stockData.change >= 0 ? '+' : ''}{addForm.stockData.change.toFixed(2)}%
                </span>
              </div>
            )}

            {addForm.stockData && (
              <>
                <div className="portfolio-form-group">
                  <label className="portfolio-form-label">Amount ($)</label>
                  <input
                    type="number"
                    className="portfolio-form-input"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={addForm.amount}
                    onChange={(e) => setAddForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                <div className="portfolio-form-group">
                  <label className="portfolio-form-label">Account</label>
                  <select
                    className="portfolio-form-input"
                    value={addForm.selectedAccountId}
                    onChange={(e) => setAddForm(prev => ({ ...prev, selectedAccountId: e.target.value }))}
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                </div>

                {addForm.amount && addForm.stockData && (
                  <div className="portfolio-total-preview">
                    <span>Quantity: {(parseFloat(addForm.amount) / addForm.stockData.price).toFixed(4)}</span>
                    <span>Total: ${parseFloat(addForm.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </>
            )}

            <button
              className="portfolio-modal-button"
              onClick={handleAddInvestment}
              disabled={!addForm.stockData || !addForm.amount || !addForm.selectedAccountId}
            >
              Add Investment
            </button>
          </div>
        </div>
      )}

      {/* Investment Detail Modal */}
      {selectedInvestment && (
        <div
          className="portfolio-modal-backdrop"
          onClick={() => {
            setSelectedInvestment(null);
            setSellForm({ quantity: '', maxQuantity: 0 });
          }}
        >
          <div className="portfolio-modal-content" onClick={e => e.stopPropagation()}>
            <div className="portfolio-modal-handle"></div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div
                className="portfolio-detail-icon"
                style={{ background: selectedInvestment.color + '20' }}
              >
                {selectedInvestment.icon}
              </div>
              <div>
                <h3 className="portfolio-detail-ticker">{selectedInvestment.ticker}</h3>
                <p className="portfolio-detail-name">{selectedInvestment.name}</p>
              </div>
            </div>

            <div className="portfolio-detail-value-card">
              <p className="portfolio-label">Current Value</p>
              <h2 className="portfolio-detail-value">
                ${selectedInvestment.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <span className={selectedInvestment.change >= 0 ? 'portfolio-change-positive' : 'portfolio-change-negative'}>
                {selectedInvestment.change >= 0 ? '+' : ''}{selectedInvestment.change.toFixed(2)}% Today
              </span>
            </div>

            <div className="portfolio-detail-stats">
              <div className="portfolio-stat-card">
                <p className="portfolio-stat-label">Allocation</p>
                <p className="portfolio-stat-value">{selectedInvestment.allocation}%</p>
              </div>
              <div className="portfolio-stat-card">
                <p className="portfolio-stat-label">Quantity</p>
                <p className="portfolio-stat-value">{selectedInvestment.quantity.toFixed(4)}</p>
              </div>
            </div>

            <div className="portfolio-detail-stats">
              <div className="portfolio-stat-card">
                <p className="portfolio-stat-label">Return</p>
                <p className={selectedInvestment.returnPct >= 0 ? 'portfolio-change-positive' : 'portfolio-change-negative'}>
                  {selectedInvestment.returnPct >= 0 ? '+' : ''}{selectedInvestment.returnPct.toFixed(2)}%
                </p>
              </div>
              <div className="portfolio-stat-card">
                <p className="portfolio-stat-label">Price</p>
                <p className="portfolio-stat-value">${selectedInvestment.currentPrice.toFixed(2)}</p>
              </div>
            </div>

            {/* Sell Section */}
            <div className="portfolio-form-group" style={{ marginTop: '1rem' }}>
              <label className="portfolio-form-label">
                Sell Quantity (Max: {selectedInvestment.quantity.toFixed(4)})
              </label>
              <input
                type="number"
                className="portfolio-form-input"
                placeholder="0.0000"
                step="0.0001"
                min="0"
                max={selectedInvestment.quantity}
                value={sellForm.quantity}
                onChange={(e) => setSellForm(prev => ({ ...prev, quantity: e.target.value }))}
              />
              {sellForm.quantity && (
                <div className="portfolio-sell-preview">
                  <span>
                    Proceeds: ${(parseFloat(sellForm.quantity) * selectedInvestment.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="portfolio-modal-actions">
              <button
                className="portfolio-action-btn portfolio-sell-btn"
                onClick={handleSellInvestment}
                disabled={!sellForm.quantity || parseFloat(sellForm.quantity) <= 0 || parseFloat(sellForm.quantity) > selectedInvestment.quantity}
              >
                Sell
              </button>
              <button
                className="portfolio-action-btn portfolio-buy-btn"
                onClick={handleBuyMore}
              >
                Buy More
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
