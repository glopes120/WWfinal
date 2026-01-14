import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { fetchMarketPrice } from '../services/marketDataService';
import './InvestmentMarketplace.css';

// Categories
const categories = [
  { id: 'all', name: 'All', icon: '🌐' },
  { id: 'stocks', name: 'Stocks', icon: '📈' },
  { id: 'etfs', name: 'ETFs', icon: '📊' },
  { id: 'crypto', name: 'Crypto', icon: '₿' },
  { id: 'bonds', name: 'Bonds', icon: '💼' },
  { id: 'reits', name: 'REITs', icon: '🏢' }
];

// Stock database from PortfolioRevolut
const STOCK_CATEGORIES_DB = {
  'Tech Giants': {
    'AAPL': { name: 'Apple Inc.', base: 185, vol: 2.5, icon: '📱', color: '#000000', category: 'stocks' },
    'MSFT': { name: 'Microsoft Corp.', base: 410, vol: 2.0, icon: '💻', color: '#00A4EF', category: 'stocks' },
    'GOOGL': { name: 'Alphabet Inc.', base: 170, vol: 2.8, icon: '🔍', color: '#4285F4', category: 'stocks' },
    'AMZN': { name: 'Amazon.com Inc.', base: 180, vol: 3.0, icon: '📦', color: '#FF9900', category: 'stocks' },
    'META': { name: 'Meta Platforms', base: 480, vol: 3.5, icon: '👤', color: '#0084FF', category: 'stocks' },
    'NVDA': { name: 'NVIDIA Corp.', base: 900, vol: 4.5, icon: '🎮', color: '#76B900', category: 'stocks' },
  },
  'Innovation': {
    'TSLA': { name: 'Tesla Inc.', base: 240, vol: 5.5, icon: '⚡', color: '#E82127', category: 'stocks' },
    'NFLX': { name: 'Netflix Inc.', base: 620, vol: 3.0, icon: '🎬', color: '#E50914', category: 'stocks' },
    'AMD': { name: 'Adv. Micro Devices', base: 160, vol: 4.0, icon: '💾', color: '#ED1C24', category: 'stocks' },
    'PLTR': { name: 'Palantir Tech', base: 24, vol: 6.0, icon: '🔮', color: '#101010', category: 'stocks' },
    'COIN': { name: 'Coinbase Global', base: 250, vol: 7.0, icon: '🪙', color: '#0052FF', category: 'crypto' },
    'UBER': { name: 'Uber Tech', base: 75, vol: 3.0, icon: '🚕', color: '#000000', category: 'stocks' },
  },
  'Blue Chip': {
    'JPM': { name: 'JPMorgan Chase', base: 195, vol: 1.8, icon: '🏦', color: '#0066CC', category: 'stocks' },
    'V': { name: 'Visa Inc.', base: 280, vol: 1.5, icon: '💳', color: '#1433CB', category: 'stocks' },
    'DIS': { name: 'Walt Disney Co.', base: 115, vol: 2.5, icon: '🎭', color: '#113CCF', category: 'stocks' },
    'KO': { name: 'Coca-Cola Co.', base: 60, vol: 0.8, icon: '🥤', color: '#F40009', category: 'stocks' },
    'PEP': { name: 'PepsiCo Inc.', base: 170, vol: 0.9, icon: '🥤', color: '#004B93', category: 'stocks' },
    'MCD': { name: 'McDonald\'s Corp.', base: 270, vol: 1.2, icon: '🍔', color: '#FBC817', category: 'stocks' },
  },
  'ETFs': {
    'SPY': { name: 'S&P 500 Index Fund', base: 510, vol: 1.0, icon: '📊', color: '#0075FF', category: 'etfs' },
    'VOO': { name: 'Vanguard S&P 500', base: 470, vol: 1.0, icon: '🇺🇸', color: '#0075FF', category: 'etfs' },
    'QQQ': { name: 'Invesco QQQ', base: 440, vol: 1.5, icon: '💻', color: '#8b5cf6', category: 'etfs' },
    'TECH': { name: 'Tech Growth ETF', base: 350, vol: 2.0, icon: '📈', color: '#00D856', category: 'etfs' },
    'EM': { name: 'Emerging Markets', base: 98, vol: 2.5, icon: '🌍', color: '#FFB800', category: 'etfs' },
    'BOND': { name: 'Bond Fund', base: 98, vol: 0.5, icon: '📜', color: '#8b5cf6', category: 'bonds' },
    'REIT': { name: 'Real Estate REIT', base: 65, vol: 1.8, icon: '🏠', color: '#FF0080', category: 'reits' },
    'VNQ': { name: 'Vanguard Real Estate ETF', base: 87, vol: 1.5, icon: '🏢', color: '#00D856', category: 'reits' },
    'AGG': { name: 'iShares Core US Bond ETF', base: 99, vol: 0.3, icon: '💼', color: '#FFB800', category: 'bonds' },
  },
  'Crypto': {
    'BTC': { name: 'Bitcoin', base: 43521, vol: 8.0, icon: '₿', color: '#F7931A', category: 'crypto' },
    'ETH': { name: 'Ethereum', base: 2284, vol: 7.0, icon: '♦️', color: '#627EEA', category: 'crypto' },
  }
};

const STOCK_DB = Object.values(STOCK_CATEGORIES_DB).reduce((acc, cat) => ({ ...acc, ...cat }), {});

// Generate stock price with change (sempre usa simulação - funciona perfeitamente!)
const generateStockPrice = async (ticker) => {
  const stock = STOCK_DB[ticker] || { name: ticker, base: 100, vol: 5, icon: '📊', color: '#0075FF', category: 'stocks' };
  const category = stock.category || 'stocks';
  
  // Sempre usa simulação - funciona perfeitamente, sem erros!
  try {
    const simulatedPrice = await fetchMarketPrice(ticker, category);
    
    if (simulatedPrice && simulatedPrice.price && simulatedPrice.price > 0) {
      // Formatar volume (pode vir como volume24h para crypto)
      let volumeStr = simulatedPrice.volume || simulatedPrice.volume24h || '0M';
      
      // Gerar rating (simulado para consistência)
      const today = new Date();
      let seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + today.getDate();
      const rating = (4.0 + (seed % 80) / 100).toFixed(1);
      
      return {
        ticker,
        name: simulatedPrice.name || stock.name,
        price: parseFloat(simulatedPrice.price.toFixed(2)),
        change: parseFloat((simulatedPrice.change || 0).toFixed(2)),
        category: category,
        rating: parseFloat(rating),
        volume: volumeStr,
        icon: stock.icon || '📊',
        color: stock.color || '#0075FF',
        source: simulatedPrice.source || 'simulated' // Preserva source (coingecko ou simulated)
      };
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[Marketplace] Simulation error for ${ticker}:`, error.message);
    }
  }
  
  // Fallback: usar simulação básica (sempre funciona)
  const today = new Date();
  let seed = ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + today.getDate();
  const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  
  const volatility = stock.vol || 2;
  const change = (random() - 0.5) * (stock.base * (volatility / 100));
  const currentPrice = stock.base + change;
  const changePercent = ((change / stock.base) * 100).toFixed(2);
  
  // Generate volume
  const volumeSeed = seed % 100;
  const volumeBase = stock.base > 1000 ? 'B' : 'M';
  const volumeValue = (volumeSeed * (stock.base > 1000 ? 0.5 : 50) + 10).toFixed(1);
  
  // Generate rating (4.0 to 4.8)
  const rating = (4.0 + (seed % 80) / 100).toFixed(1);
  
  return {
    ticker,
    name: stock.name,
    price: parseFloat(currentPrice.toFixed(2)),
    change: parseFloat(changePercent),
    category: stock.category || 'stocks',
    rating: parseFloat(rating),
    volume: `${volumeValue}${volumeBase}`,
    icon: stock.icon || '📊',
    color: stock.color || '#0075FF',
    source: 'simulated'
  };
};


export default function InvestmentMarketplace({ setView, onInvestmentPurchased }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyAmount, setBuyAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [categories_data, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate all investments from stock database
  const [allInvestments, setAllInvestments] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);

  useEffect(() => {
    const loadPrices = async () => {
      setLoadingPrices(true);
      try {
        // Carrega preços para todos os investimentos
        const tickers = Object.keys(STOCK_DB);
        const prices = await Promise.all(
          tickers.map(ticker => generateStockPrice(ticker))
        );
        setAllInvestments(prices);
        
        // Gera trending com os maiores movimentos
        const trendingTickers = ['NVDA', 'AMD', 'COIN', 'TSLA', 'META', 'BTC'];
        const trendingPrices = await Promise.all(
          trendingTickers.slice(0, 3).map(ticker => generateStockPrice(ticker))
        );
        setTrending(
          trendingPrices
            .filter(t => t)
            .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
            .slice(0, 3)
        );
      } catch (error) {
        console.error('Error loading prices:', error);
      } finally {
        setLoadingPrices(false);
      }
    };
    
    loadPrices();
    
    // Auto-refresh a cada 60 segundos
    const interval = setInterval(loadPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: accData } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id);
        setAccounts(accData || []);
        
        const { data: catData } = await supabase.from('categories').select('*');
        setCategories(catData || []);
      }
      setLoading(false);
    };
    initData();
  }, []);

  const filteredInvestments = useMemo(() => {
    return allInvestments.filter(inv => 
      (selectedCategory === 'all' || inv.category === selectedCategory) &&
      (inv.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       inv.ticker.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => {
      // Sort by absolute change (most volatile first)
      return Math.abs(b.change) - Math.abs(a.change);
    });
  }, [allInvestments, selectedCategory, searchQuery]);

  const handleBuy = async () => {
    if (!selectedInvestment || !buyAmount || !selectedAccountId) {
      alert('Please fill all fields');
      return;
    }

    const quantity = parseFloat(buyAmount);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) {
      alert('Please select an account');
      return;
    }

    const totalCost = selectedInvestment.price * quantity;
    if (account.balance < totalCost) {
      alert('Insufficient funds');
      return;
    }

    try {
      // Update account balance
      await supabase
        .from('accounts')
        .update({ balance: account.balance - totalCost })
        .eq('id', selectedAccountId);

      // Check if investment already exists in portfolio
      const { data: existingInvestments } = await supabase
        .from('portfolio_investments')
        .select('*')
        .eq('user_id', user.id)
        .eq('ticker', selectedInvestment.ticker);

      const existing = existingInvestments?.[0];

      if (existing) {
        // Update existing investment
        const newQuantity = parseFloat(existing.quantity) + quantity;
        const newAmount = parseFloat(existing.amount) + totalCost;
        await supabase
          .from('portfolio_investments')
          .update({
            amount: newAmount,
            quantity: newQuantity,
            name: selectedInvestment.name
          })
          .eq('id', existing.id);
      } else {
        // Create new investment
        await supabase
          .from('portfolio_investments')
          .insert([{
            user_id: user.id,
            name: selectedInvestment.name,
            ticker: selectedInvestment.ticker,
            amount: totalCost,
            quantity: quantity,
            change: 0
          }]);
      }

      // Record as expense
      const expCat = categories_data.find(c => c.name.toLowerCase().includes('invest'))?.id || categories_data[0]?.id;
      if (expCat) {
        await supabase
          .from('expenses')
          .insert([{
            user_id: user.id,
            category_id: expCat,
            amount: totalCost,
            description: `Buy ${quantity.toFixed(2)} ${selectedInvestment.ticker}`,
            expense_date: new Date().toISOString()
          }]);
      }

      alert('Purchase successful!');
      setShowBuyModal(false);
      setBuyAmount('');
      setSelectedAccountId('');
      
      // Refresh accounts
      const { data: accData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
      setAccounts(accData || []);

      // Notify parent component if callback exists
      if (onInvestmentPurchased) {
        onInvestmentPurchased();
      }
    } catch (error) {
      console.error('Error purchasing investment:', error);
      alert('Error processing purchase. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="marketplace-container">
        <div className="marketplace-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="marketplace-container">
      {/* Header */}
      <div className="marketplace-header">
        <div className="marketplace-header-top">
          <button 
            onClick={() => setView ? setView('Portfolio') : window.history.back()}
            className="marketplace-back-btn"
          >
            ←
          </button>
          <h1 className="marketplace-title">Marketplace</h1>
          <button className="marketplace-search-icon">🔍</button>
        </div>
        
        {/* Search Bar */}
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stocks, ETFs, crypto..."
          className="marketplace-search-input"
        />
      </div>

      <div className="marketplace-content">
        {/* Price Source Indicator */}
        <div style={{ 
          padding: '0.75rem 1rem', 
          background: 'rgba(0, 216, 86, 0.1)', 
          border: '1px solid rgba(0, 216, 86, 0.3)', 
          borderRadius: '0.75rem', 
          marginBottom: '1rem',
          fontSize: '0.8125rem',
          color: 'rgba(255, 255, 255, 0.9)'
        }}>
          <span style={{ fontWeight: 600 }}>💡 Preços: </span>
          {loadingPrices ? (
            <span>Carregando preços...</span>
          ) : (
            <span>
              ✅ <strong>Crypto (BTC/ETH):</strong> Preços REAIS via CoinGecko | <strong>Ações/ETFs:</strong> Simulação (atualizados a cada 60s)
            </span>
          )}
        </div>

        {/* Trending */}
        {!loadingPrices && trending.length > 0 && (
          <div className="marketplace-section">
            <h3 className="marketplace-section-title">🔥 Trending Today</h3>
            <div className="marketplace-trending-grid">
              {trending.map((item, i) => (
                <div key={i} className="marketplace-trending-card">
                  <div className="marketplace-trending-icon">{item.icon}</div>
                  <p className="marketplace-trending-ticker">{item.ticker}</p>
                  <p className="marketplace-trending-name">{item.name}</p>
                  <span className="marketplace-trending-change">
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="marketplace-categories">
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`marketplace-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Investments Grid */}
        <div className="marketplace-section">
          <h3 className="marketplace-section-title">
            {selectedCategory === 'all' ? 'All Investments' : categories.find(c => c.id === selectedCategory)?.name}
            <span className="marketplace-count">({filteredInvestments.length})</span>
          </h3>
          
          {loadingPrices ? (
            <div className="marketplace-empty">
              <p>Carregando preços do mercado...</p>
            </div>
          ) : filteredInvestments.length === 0 ? (
            <div className="marketplace-empty">
              <p>No investments found. Try a different search or category.</p>
            </div>
          ) : (
            filteredInvestments.map(inv => (
              <div 
                key={inv.ticker}
                onClick={() => setSelectedInvestment(inv)}
                className="marketplace-investment-card"
              >
                <div className="marketplace-investment-row">
                  <div className="marketplace-investment-left">
                    <div 
                      className="marketplace-investment-icon-circle"
                      style={{ background: inv.color + '20' }}
                    >
                      {inv.icon}
                    </div>
                    <div>
                      <p className="marketplace-investment-ticker">
                        {inv.ticker}
                        {inv.source === 'coingecko' && (
                          <span style={{ 
                            fontSize: '0.625rem', 
                            color: '#00D856', 
                            marginLeft: '0.25rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center'
                          }} title="Preço REAL via CoinGecko">
                            ● REAL
                          </span>
                        )}
                      </p>
                      <p className="marketplace-investment-name">{inv.name}</p>
                      <div className="marketplace-investment-meta">
                        <div className="marketplace-rating">
                          {[...Array(5)].map((_, i) => (
                            <span 
                              key={i} 
                              className={`marketplace-star ${i < Math.floor(inv.rating) ? 'filled' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="marketplace-volume">Vol: {inv.volume}</span>
                      </div>
                    </div>
                  </div>
                  <div className="marketplace-investment-right">
                    <p className="marketplace-investment-price">
                      ${inv.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className={inv.change >= 0 ? 'marketplace-change-positive' : 'marketplace-change-negative'}>
                      {inv.change >= 0 ? '+' : ''}{inv.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Investment Detail Modal */}
      {selectedInvestment && !showBuyModal && (
        <div 
          className="marketplace-modal-backdrop"
          onClick={() => setSelectedInvestment(null)}
        >
          <div className="marketplace-modal-content" onClick={e => e.stopPropagation()}>
            <div className="marketplace-modal-handle"></div>
            
            <div className="marketplace-detail-header">
              <div 
                className="marketplace-detail-icon-circle"
                style={{ background: selectedInvestment.color + '20' }}
              >
                {selectedInvestment.icon}
              </div>
              <div className="marketplace-detail-info">
                <h3 className="marketplace-detail-ticker">{selectedInvestment.ticker}</h3>
                <p className="marketplace-detail-name">{selectedInvestment.name}</p>
              </div>
              <button className="marketplace-watch-btn">⭐</button>
            </div>

            <div className="marketplace-price-card">
              <p className="marketplace-label">Current Price</p>
              <h2 className="marketplace-price-value">
                ${selectedInvestment.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <span className={selectedInvestment.change >= 0 ? 'marketplace-change-positive' : 'marketplace-change-negative'}>
                {selectedInvestment.change >= 0 ? '+' : ''}{selectedInvestment.change.toFixed(2)}% Today
              </span>
            </div>

            <div className="marketplace-stats-grid">
              <div className="marketplace-stat-card">
                <p className="marketplace-stat-label">Volume</p>
                <p className="marketplace-stat-value">{selectedInvestment.volume}</p>
              </div>
              <div className="marketplace-stat-card">
                <p className="marketplace-stat-label">Rating</p>
                <p className="marketplace-stat-value">{selectedInvestment.rating} ★</p>
              </div>
              <div className="marketplace-stat-card">
                <p className="marketplace-stat-label">Type</p>
                <p className="marketplace-stat-value">{selectedInvestment.category.toUpperCase()}</p>
              </div>
            </div>

            <div className="marketplace-modal-actions">
              <button className="marketplace-action-btn marketplace-watch-action-btn">
                Watch
              </button>
              <button 
                onClick={() => setShowBuyModal(true)} 
                className="marketplace-action-btn marketplace-buy-action-btn"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Modal */}
      {showBuyModal && selectedInvestment && (
        <div 
          className="marketplace-modal-backdrop"
          onClick={() => {
            setShowBuyModal(false);
            setBuyAmount('');
            setSelectedAccountId('');
          }}
        >
          <div className="marketplace-buy-modal" onClick={e => e.stopPropagation()}>
            <h3 className="marketplace-modal-title">
              Buy {selectedInvestment.ticker}
            </h3>
            <p className="marketplace-buy-price-info">
              Current price: ${selectedInvestment.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            
            <div className="marketplace-form-group">
              <label className="marketplace-form-label">Number of Shares</label>
              <input 
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="0"
                step="0.0001"
                min="0.0001"
                className="marketplace-buy-input"
              />
            </div>

            {buyAmount && parseFloat(buyAmount) > 0 && (
              <div className="marketplace-total-preview">
                <p className="marketplace-total-label">Total Cost</p>
                <p className="marketplace-total-value">
                  ${(parseFloat(buyAmount) * selectedInvestment.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}

            <div className="marketplace-form-group">
              <label className="marketplace-form-label">Select Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="marketplace-form-input"
              >
                <option value="">Choose account...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                  </option>
                ))}
              </select>
            </div>

            {selectedAccountId && buyAmount && parseFloat(buyAmount) > 0 && (() => {
              const account = accounts.find(a => a.id === selectedAccountId);
              const totalCost = parseFloat(buyAmount) * selectedInvestment.price;
              const hasFunds = account && account.balance >= totalCost;
              
              return (
                <div className={hasFunds ? 'marketplace-funds-ok' : 'marketplace-funds-error'}>
                  {hasFunds 
                    ? `✓ Available: $${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : `✗ Insufficient funds. Available: $${account?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`
                  }
                </div>
              );
            })()}

            <div className="marketplace-modal-actions">
              <button 
                onClick={() => {
                  setShowBuyModal(false);
                  setBuyAmount('');
                  setSelectedAccountId('');
                }}
                className="marketplace-action-btn marketplace-cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleBuy}
                disabled={!buyAmount || parseFloat(buyAmount) <= 0 || !selectedAccountId}
                className="marketplace-action-btn marketplace-confirm-btn"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
