import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/revolut-base.css';
import './Dashboard.css';
import History from './History.jsx';
import Budget from './Budget.jsx';
import Settings from './Settings.jsx';
import Portfolio from './Portfolio.jsx';
import PortfolioRevolut from './PortfolioRevolut.jsx';
import InvestmentMarketplace from './InvestmentMarketplace.jsx';
import FinancialGoals from './FinancialGoals.jsx';
import AIAdvisor from './AIAdvisor.jsx';
import SpendingPower from './SpendingPower.jsx';
import Notification from './Notification.jsx';
import Cards from './Cards.jsx';
import CardDetails from './CardDetails.jsx';
import ExchangeWidget from './ExchangeWidget.jsx';
import GlobalActionMenu from './GlobalActionMenu.jsx';
import TransactionForm from './TransactionForm.jsx';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useAppContext } from '../contexts/AppContext';

export default function Dashboard({ view, setView, openAIAssistant, user, refreshSession }) {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [investments, setInvestments] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [wealth, setWealth] = useState({ cash: 0, savings: 0 }); // Added wealth state
  const [notification, setNotification] = useState(null);
  const [incomeCategoryId, setIncomeCategoryId] = useState(null);
  const [refreshAllData, setRefreshAllData] = useState(false);
  const { hideBalances, setHideBalances } = useAppContext();
  
  // Modals
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  
  // Add Account State
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('Checking');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountSafeToSpend, setNewAccountSafeToSpend] = useState(false);

  // Unallocated Wealth Calculation
  const totalWealthDeclared = (wealth.cash || 0) + (wealth.savings || 0);
  const totalAllocated = accounts.reduce((sum, a) => sum + (a.type !== 'credit' ? parseFloat(a.balance) : 0), 0);
  const unallocatedWealth = totalWealthDeclared - totalAllocated;

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName || !newAccountBalance) return;
    setLoading(true);
    
    const accountData = {
        user_id: user.id,
        name: newAccountName,
        type: newAccountType,
        balance: parseFloat(newAccountBalance),
        is_safe_to_spend: newAccountSafeToSpend
    };

    try {
        // Attempt 1: Try with is_safe_to_spend
        const { error } = await supabase.from('accounts').insert(accountData);
        if (error) throw error;

        // Success
        setNewAccountName('');
        setNewAccountBalance('');
        setNewAccountSafeToSpend(false);
        setShowAddAccountModal(false);
        setRefreshAllData(prev => !prev);
        setNotification({ type: 'success', message: 'Account added successfully!' });

    } catch (error) {
        console.warn("First insert attempt failed:", error.message);
        
        // Attempt 2: Fallback (Database might not have the column yet)
        if (error.code === '42703' || error.message.includes('column') || error.code === 'PGRST204') { // 42703 is undefined_column
             try {
                const { is_safe_to_spend, ...fallbackData } = accountData;
                const { error: fallbackError } = await supabase.from('accounts').insert(fallbackData);
                if (fallbackError) throw fallbackError;

                // Success (Fallback)
                setNewAccountName('');
                setNewAccountBalance('');
                setNewAccountSafeToSpend(false);
                setShowAddAccountModal(false);
                setRefreshAllData(prev => !prev);
                setNotification({ type: 'warning', message: 'Account added, but "Safe to Spend" setting was ignored (Database update required).' });
                return;
             } catch (retryError) {
                 setNotification({ type: 'error', message: retryError.message });
             }
        } else {
             setNotification({ type: 'error', message: error.message });
        }
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) return;
    
    setLoading(true);
    try {
        const { error } = await supabase.from('accounts').delete().eq('id', accountId);
        if (error) throw error;
        setRefreshAllData(prev => !prev);
        setNotification({ type: 'success', message: 'Account deleted successfully!' });
    } catch (error) {
        console.error('Error deleting account:', error);
        setNotification({ type: 'error', message: 'Failed to delete account. Ensure no transactions are linked to it.' });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch Wealth
        const { data: wData } = await supabase.from('wealth').select('*').eq('user_id', user.id).maybeSingle();
        if (wData) setWealth(wData);

        // Fetch categories for this user OR global categories (user_id is null)
        let { data: catData, error: catError } = await supabase
            .from('categories')
            .select('*')
            .or(`user_id.eq.${user.id},user_id.is.null`);
        
        if (catError) {
            // Fallback: If filtering fails (e.g. column doesn't exist), fetch all
            console.warn("Could not filter categories by user_id, fetching all.", catError);
            const { data: allCats } = await supabase.from('categories').select('*');
            catData = allCats;
        }

        // Ensure "Income" category exists
        let incomeCat = catData?.find(c => c.name.toLowerCase() === 'income');
        if (!incomeCat) {
            const { data: newCat, error: createError } = await supabase
                .from('categories')
                .insert({ name: 'Income' })
                .select()
                .single();
            
            if (!createError && newCat) {
                incomeCat = newCat;
                catData = [...(catData || []), newCat];
            }
        }

        setCategories(catData || []);
        setIncomeCategoryId(incomeCat?.id);

        const { data: accData } = await supabase.from('accounts').select('*').eq('user_id', user.id);
        setAccounts(accData || []);

        const { data: invData } = await supabase.from('portfolio_investments').select('*').eq('user_id', user.id);
        setInvestments(invData || []);

        const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { data: expData } = await supabase.from('expenses').select('*, categories(name)').eq('user_id', user.id).gte('expense_date', sixMonthsAgo.toISOString());
        setExpenses(expData || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [refreshAllData, user]);

  // Calculations
  const { totalAssets, totalDebt, netWorth, recentTransactions, spendingData, netWorthHistory, incomeExpenseData, assetList, debtList, safeToSpendBalance } = useMemo(() => {
    const assetAcc = accounts.filter(a => a.type !== 'credit' && a.balance > 0);
    const cashVal = assetAcc.reduce((sum, a) => sum + a.balance, 0);
    const investVal = investments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const assetsTotal = cashVal + investVal;

    const debtAcc = accounts.filter(a => a.type === 'credit' || a.balance < 0);
    const debtTotal = debtAcc.reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const assetBreakdown = [...assetAcc.map(a => ({ name: a.name, val: a.balance })), { name: 'Investments', val: investVal }].filter(i => i.val > 0);
    const debtBreakdown = debtAcc.map(a => ({ name: a.name, val: Math.abs(a.balance), isCC: a.type === 'credit' }));

    // Safe to Spend Calculation
    const safeToSpendBalance = accounts
        .filter(a => a.is_safe_to_spend && a.balance > 0)
        .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

    // Transactions
    const sortedTx = [...expenses].sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date)).slice(0, 5).map(tx => ({
      ...tx, name: tx.description, category: tx.categories?.name || 'Uncategorized', date: new Date(tx.expense_date).toLocaleDateString()
    }));

    // Spending Pie
    const catMap = new Map();
    expenses.filter(e => e.category_id !== incomeCategoryId).forEach(e => {
        const name = e.categories?.name || 'Other';
        catMap.set(name, (catMap.get(name) || 0) + e.amount);
    });
    // Updated palette: Varied colors for better distinction
    const pieData = Array.from(catMap.entries()).map(([name, value], i) => ({ name, value, color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i % 5] }));

    // Real Income vs Expenses Data
    const last6Months = Array.from({length: 6}, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return { 
            name: d.toLocaleString('en-US', { month: 'short' }), 
            monthKey: d.getMonth(), 
            yearKey: d.getFullYear() 
        };
    });

    const incExpData = last6Months.map(({ name, monthKey, yearKey }) => {
        const monthTx = expenses.filter(e => {
            const d = new Date(e.expense_date);
            return d.getMonth() === monthKey && d.getFullYear() === yearKey;
        });

        const income = monthTx
            .filter(e => e.category_id === incomeCategoryId)
            .reduce((sum, e) => sum + e.amount, 0);
            
        const expenseVal = monthTx
            .filter(e => e.category_id !== incomeCategoryId)
            .reduce((sum, e) => sum + e.amount, 0);

        return { month: name, income, expenses: expenseVal };
    });

    // Net Worth History (Smart Reconstruction)
    // 1. Start with Current Net Worth
    let currentNW = assetsTotal - debtTotal;
    
    // 2. Iterate backwards 6 months to build the curve
    const historyPoints = [];
    
    // Helper to get net change for a specific month/year
    const getNetChange = (m, y) => {
        const txs = expenses.filter(e => {
            const d = new Date(e.expense_date);
            return d.getMonth() === m && d.getFullYear() === y;
        });
        const inc = txs.filter(e => e.category_id === incomeCategoryId).reduce((sum, e) => sum + e.amount, 0);
        const exp = txs.filter(e => e.category_id !== incomeCategoryId).reduce((sum, e) => sum + e.amount, 0);
        return inc - exp; // Positive means we gained money, so previous month was lower.
    };

    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('en-US', { month: 'short' });
        
        // Push the CURRENT value for this month (end of month roughly)
        historyPoints.unshift({
            month: monthName,
            value: currentNW
        });

        // Calculate start of this month (which is end of previous)
        // CurrentNW = PreviousNW + NetChange
        // So: PreviousNW = CurrentNW - NetChange
        const change = getNetChange(d.getMonth(), d.getFullYear());
        currentNW = currentNW - change; 
    }

    const nwData = historyPoints;

    return { totalAssets: assetsTotal, totalDebt: debtTotal, netWorth: assetsTotal - debtTotal, recentTransactions: sortedTx, spendingData: pieData, netWorthHistory: nwData, incomeExpenseData: incExpData, assetList: assetBreakdown, debtList: debtBreakdown, safeToSpendBalance };
  }, [accounts, investments, expenses, incomeCategoryId]);

  const fmt = (v) => hideBalances ? '••••••' : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const renderContent = () => {
    const normalizedView = view.toLowerCase().replace(/\s+/g, ''); // Remove all spaces
    switch(normalizedView) {
        case 'budget': return <Budget expenses={expenses} categories={categories} incomeCategoryId={incomeCategoryId} user={user} setView={setView} onDataRefresh={() => setRefreshAllData(prev=>!prev)} onNotification={setNotification} />;
        case 'history': return <History expenses={expenses} loading={loading} incomeCategoryId={incomeCategoryId} setView={setView} onDataRefresh={() => setRefreshAllData(prev=>!prev)} />;
        case 'settings': return <Settings user={user} setView={setView} refreshSession={refreshSession} />;
        case 'portfolio': return <PortfolioRevolut setView={setView} onDataRefresh={() => setRefreshAllData(prev => !prev)} />;
        case 'marketplace': return <InvestmentMarketplace setView={setView} onInvestmentPurchased={() => setRefreshAllData(prev => !prev)} />;
        case 'financialgoals':
        case 'financial goals': return <FinancialGoals setView={setView} />;
        case 'aiadvisor':
        case 'ai advisor': return <AIAdvisor openAIAssistant={openAIAssistant} setView={setView} />;
        default: return (
            <div className="dashboard-container">
                {/* Header & Hero Balance */}
                <div className="header-gradient">
                    <div className="header-top">
                        <div className="header-user-info">
                           <div className="user-avatar">
                                <img src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`} alt="User" />
                           </div>
                           <h1 className="header-title">Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}</h1>
                        </div>
                        <div className="header-icon" onClick={() => setHideBalances(!hideBalances)}>{hideBalances ? '👁️' : '💰'}</div>
                    </div>
                    
                    {/* Hero Section: Net Worth */}
                    <div className="stats-grid">
                        <div className="stat-box">
                            <p className="stat-label">Total Balance</p>
                            <p className="stat-value">{fmt(netWorth)}</p>
                        </div>
                        <div className="stats-badges-container">
                             <span className="stat-badge stat-badge-positive">+2.4% this month</span>
                             <span className="stat-badge stat-badge-secondary">¥ {fmt(totalAssets)} Assets</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions (Revolut Style Circle Buttons) */}
                <div className="quick-stats-grid">
                    <button className="quick-card" onClick={() => setShowAddAccountModal(true)}>
                        <div className="quick-icon"><span>+</span></div>
                        <div className="quick-info"><p className="quick-title">Add Money</p></div>
                    </button>
                    <button className="quick-card" onClick={() => setShowExchangeModal(true)}>
                        <div className="quick-icon"><span>⇄</span></div>
                        <div className="quick-info"><p className="quick-title">Exchange</p></div>
                    </button>
                    <button className="quick-card" onClick={() => setView('Budget')}>
                        <div className="quick-icon"><span>📊</span></div>
                        <div className="quick-info"><p className="quick-title">Analytics</p></div>
                    </button>
                    <button className="quick-card" onClick={() => setView('Settings')}>
                        <div className="quick-icon"><span>•••</span></div>
                        <div className="quick-info"><p className="quick-title">More</p></div>
                    </button>
                </div>

                {/* Spending Power Section */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <SpendingPower expenses={expenses} incomeCategoryId={incomeCategoryId} safeToSpendBalance={safeToSpendBalance} />
                </div>

                {/* Cards Section (Revolut Style) */}
                <Cards 
                    accounts={accounts} 
                    onAddAccount={() => setShowAddAccountModal(true)} 
                    onCardClick={(card) => setSelectedCard(card)}
                />

                {/* Transactions (Full Width) */}
                <div className="dashboard-card" style={{ marginBottom: '2rem' }}>
                    <div className="card-header">
                        <h2 className="card-title">Recent Transactions</h2>
                        <button style={{color:'var(--theme-accent-primary)', fontWeight:'600', fontSize:'0.9rem'}} onClick={() => setView('History')}>See All</button>
                    </div>
                    <div className="list-stack">
                        {recentTransactions.map(tx => (
                            <div key={tx.id} className="list-item">
                                <div className="item-left">
                                    <div className="item-icon" style={{background: tx.category_id === incomeCategoryId ? 'rgba(52, 199, 89, 0.1)' : 'var(--theme-elevated)'}}>
                                        {tx.category_id === incomeCategoryId ? '📥' : '🛍️'}
                                    </div>
                                    <div className="item-text"><p className="item-title">{tx.name}</p><p className="item-sub">{tx.date}</p></div>
                                </div>
                                <div className="item-right">
                                    <p className={`item-amount ${tx.category_id === incomeCategoryId ? 'text-emerald' : ''}`}>
                                        {tx.category_id === incomeCategoryId ? '+' : ''}{fmt(tx.amount)}
                                    </p>
                                    <p className="text-date">{tx.category}</p>
                                </div>
                            </div>
                        ))}
                            {recentTransactions.length === 0 && <div style={{padding:'1rem', textAlign:'center', color:'var(--theme-text-tertiary)'}}>No transactions yet</div>}
                    </div>
                </div>

                {/* Chart Section */}
                <div className="chart-card">
                    <h2 className="card-title" style={{marginBottom:'1.5rem'}}>Net Worth Trend</h2>
                    <div style={{ width: '100%', height: 250, minHeight: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={netWorthHistory}>
                                <defs><linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient></defs>
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} tickFormatter={v => `$${v/1000}k`} />
                                <Tooltip contentStyle={{background:'var(--theme-surface)', border:'1px solid var(--theme-border)', borderRadius:'8px'}} />
                                <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} fill="url(#c1)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bottom Charts */}
                <div className="main-grid">
                    <div className="chart-card" style={{margin:0, padding:'1.5rem'}}>
                        <h2 className="card-title" style={{marginBottom:'1rem'}}>Income vs Expenses</h2>
                        <div style={{ width: '100%', height: 200, minHeight: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={incomeExpenseData}>
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} />
                                    <Tooltip contentStyle={{background:'var(--theme-surface)', border:'1px solid var(--theme-border)', borderRadius:'8px'}} />
                                    <Bar dataKey="income" fill="#10b981" radius={[4,4,0,0]} />
                                    <Bar dataKey="expenses" fill="#ef4444" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="chart-card" style={{margin:0, padding:'1.5rem'}}>
                        <h2 className="card-title" style={{marginBottom:'1rem'}}>Spending by Category</h2>
                        <div className="pie-flex">
                            <div style={{ width: 150, height: 150, minWidth: 150, minHeight: 150 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={spendingData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                                            {spendingData.map((e,i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="pie-legend">
                                {spendingData.slice(0,5).map((e,i) => (
                                    <div key={i} className="legend-row"><span className="legend-color" style={{background:e.color}} />{e.name}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {showAssetsModal && (
                    <div className="modal-overlay" onClick={() => setShowAssetsModal(false)}>
                        <div className="modal-box" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2 className="modal-h2">Assets Breakdown</h2><button className="close-btn" onClick={() => setShowAssetsModal(false)}>✕</button></div>
                            <div className="modal-list">
                                {assetList.map((a, i) => (
                                    <div key={i} className="modal-item"><span>{a.name}</span><span className="text-emerald">{fmt(a.val)}</span></div>
                                ))}
                            </div>
                            <div className="modal-footer"><span>Total</span><span>{fmt(totalAssets)}</span></div>
                        </div>
                    </div>
                )}
                {showDebtModal && (
                    <div className="modal-overlay" onClick={() => setShowDebtModal(false)}>
                        <div className="modal-box" onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h2 className="modal-h2">Debt Breakdown</h2><button className="close-btn" onClick={() => setShowDebtModal(false)}>✕</button></div>
                            <div className="modal-list">
                                {debtList.map((a, i) => (
                                    <div key={i} className="modal-item">
                                        <span>{a.name} {a.isCC && <span className="badge-credit">Credit</span>}</span>
                                        <span className="text-red">{fmt(a.val)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="modal-footer"><span>Total</span><span>{fmt(totalDebt)}</span></div>
                        </div>
                    </div>
                )}
                {/* Card Details Modal */}
                {selectedCard && (
                    <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
                        <div className="modal-box chat-modal-wrapper" onClick={e => e.stopPropagation()}>
                             <CardDetails 
                                card={selectedCard} 
                                onClose={() => setSelectedCard(null)} 
                                onDelete={handleDeleteAccount}
                             />
                        </div>
                    </div>
                )}

                {/* Exchange Modal */}
                {showExchangeModal && (
                    <div className="modal-overlay" onClick={() => setShowExchangeModal(false)}>
                        <div className="modal-box" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-h2">Exchange</h2>
                                <button className="close-btn" onClick={() => setShowExchangeModal(false)}>✕</button>
                            </div>
                            <ExchangeWidget onClose={() => setShowExchangeModal(false)} />
                        </div>
                    </div>
                )}
                
                {/* Add Account Modal */}
                {showAddAccountModal && (
                    <div className="modal-overlay" onClick={() => setShowAddAccountModal(false)}>
                        <div className="modal-box" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-h2">Add New Account</h2>
                                <button className="close-btn" onClick={() => setShowAddAccountModal(false)}>✕</button>
                            </div>
                            
                            <div className="info-box">
                                <p className="info-box-text">Unallocated Wealth:</p>
                                <p className="info-box-value">
                                    {unallocatedWealth >= 0 ? fmt(unallocatedWealth) : `Over-allocated by ${fmt(Math.abs(unallocatedWealth))}`}
                                </p>
                                <p className="info-box-text" style={{ fontSize: 'clamp(0.6875rem, 0.75vw + 0.5rem, 0.75rem)', color: '#9ca3af', marginTop: 'clamp(0.125rem, 0.25vw + 0.125rem, 0.25rem)' }}>
                                    (Total Declared Wealth - Current Accounts)
                                </p>
                            </div>

                            <form onSubmit={handleAddAccount} className="modal-list">
                                <div className="form-group">
                                    <label>Account Name</label>
                                    <input 
                                        type="text" 
                                        value={newAccountName} 
                                        onChange={e => setNewAccountName(e.target.value)}
                                        className="modal-form-input"
                                        placeholder="e.g., Chase Sapphire"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select 
                                        value={newAccountType} 
                                        onChange={e => setNewAccountType(e.target.value)}
                                        className="modal-form-input"
                                    >
                                        <option value="Checking">Checking</option>
                                        <option value="Savings">Savings</option>
                                        <option value="Credit">Credit Card</option>
                                        <option value="Investment">Investment</option>
                                        <option value="Cash">Cash</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Current Balance</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={newAccountBalance} 
                                        onChange={e => setNewAccountBalance(e.target.value)}
                                        className="modal-form-input"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{display:'flex', alignItems:'center', flexDirection: 'row', marginTop: 'clamp(0.375rem, 0.5vw + 0.25rem, 0.5rem)'}}>
                                    <input 
                                        type="checkbox" 
                                        id="safeToSpendCheck"
                                        checked={newAccountSafeToSpend}
                                        onChange={e => setNewAccountSafeToSpend(e.target.checked)}
                                    />
                                    <label htmlFor="safeToSpendCheck" style={{cursor:'pointer', marginLeft: 'clamp(0.375rem, 0.5vw + 0.25rem, 0.5rem)', marginBottom: '0'}}>
                                        Include in <strong>Safe to Spend</strong>?
                                    </label>
                                </div>
                                <button type="submit" className="btn-soft" style={{background:'#2563eb', color:'white', marginTop:'1rem'}}>
                                    Add Account
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Transaction Modal */}
                {showTransactionModal && (
                    <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
                        <div className="modal-box" onClick={e => e.stopPropagation()}>
                            <TransactionForm
                                categories={categories}
                                incomeCategoryId={incomeCategoryId}
                                user={user}
                                onDataRefresh={() => setRefreshAllData(prev => !prev)}
                                onNotification={setNotification}
                                onClose={() => setShowTransactionModal(false)}
                            />
                        </div>
                    </div>
                )}

                <GlobalActionMenu 
                    onAddTransaction={() => setShowTransactionModal(true)}
                    onAddAccount={() => setShowAddAccountModal(true)}
                />
            </div>
        );
    }
  };

  return <>{notification && <Notification notification={notification} onClear={()=>setNotification(null)} />}{renderContent()}</>;
}