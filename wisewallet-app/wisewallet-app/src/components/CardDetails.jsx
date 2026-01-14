import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './CardDetails.css';

const CardDetails = ({ card, onClose, onDelete }) => {
  const settingsRef = useRef(null);

  // Load initial state from LocalStorage or Default
  const loadState = (key, defaultVal) => {
    const saved = localStorage.getItem(`card_${card.id}_${key}`);
    return saved ? JSON.parse(saved) : defaultVal;
  };

  const [isFrozen, setIsFrozen] = useState(() => loadState('frozen', false));
  const [settings, setSettings] = useState(() => loadState('settings', {
    online: true,
    contactless: true,
    swipe: true
  }));
  
  const [showPin, setShowPin] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);

  // Persist changes
  useEffect(() => { localStorage.setItem(`card_${card.id}_frozen`, JSON.stringify(isFrozen)); }, [isFrozen, card.id]);
  useEffect(() => { localStorage.setItem(`card_${card.id}_settings`, JSON.stringify(settings)); }, [settings, card.id]);

  // Fetch Transactions
  useEffect(() => {
    const fetchTx = async () => {
        const { data } = await supabase
            .from('expenses')
            .select('*, categories(name)')
            .eq('user_id', card.user_id)
            .order('expense_date', { ascending: false })
            .limit(5);
        
        setTransactions(data || []);
        setLoadingTx(false);
    };
    fetchTx();
  }, [card.id, card.user_id]);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const scrollToSettings = () => {
    settingsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generatePin = (id) => {
    const hash = id?.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 1234;
    return (hash % 9000 + 1000).toString();
  };

  const formatCardNumber = (id) => {
    const hash = id?.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 1234;
    return `•••• •••• •••• ${hash % 9000 + 1000}`;
  };

  const getGradient = (type) => {
    switch (type?.toLowerCase()) {
      case 'savings': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'credit': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      case 'investment': return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
      default: return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    }
  };

  const handleDelete = () => {
      if (window.confirm("Are you sure you want to terminate this card? This account will be deleted permanently.")) {
          if (onDelete) onDelete(card.id);
          onClose();
      }
  };

  return (
    <div className="card-details-container">
      {/* Header */}
      <div className="cd-header">
        <button onClick={onClose} className="cd-back-btn">←</button>
        <h2 className="cd-title">{card.name}</h2>
        <div style={{width:'32px'}}></div>
      </div>

      {/* Card Visual */}
      <div className="cd-hero">
        <div 
            className={`cd-card-visual ${isFrozen ? 'frozen' : ''}`}
            style={{ background: isFrozen ? '#9ca3af' : getGradient(card.type) }}
        >
            <div className="card-top">
              <span className="card-type">{card.type}</span>
              <span className="card-logo">Visa</span>
            </div>
            <div className="card-bottom">
              <span className="card-number">{formatCardNumber(card.id)}</span>
            </div>
            {isFrozen && <div className="frozen-overlay">❄️ Frozen</div>}
        </div>
        <div className="cd-balance-label">Available to spend</div>
        <div className="cd-balance-amount">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(card.balance))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="cd-actions-grid">
        <button className="cd-action-btn" onClick={() => setIsFrozen(!isFrozen)}>
            <div className={`cd-action-icon ${isFrozen ? 'active-freeze' : ''}`}>❄️</div>
            <span>{isFrozen ? 'Unfreeze' : 'Freeze'}</span>
        </button>
        <button className="cd-action-btn" onClick={() => setShowPin(!showPin)}>
            <div className="cd-action-icon">🔢</div>
            <span>{showPin ? generatePin(card.id) : 'View PIN'}</span>
        </button>
        <button className="cd-action-btn" onClick={scrollToSettings}>
            <div className="cd-action-icon">⚙️</div>
            <span>Settings</span>
        </button>
      </div>

      {/* Settings & History List */}
      <div className="cd-settings-list" ref={settingsRef}>
        
        {/* Transactions Mini-Section */}
        <h3 className="cd-section-title">Latest Transactions</h3>
        <div className="cd-mini-tx-list">
            {loadingTx ? (
                <p className="cd-setting-desc">Loading activity...</p>
            ) : transactions.length > 0 ? (
                transactions.map(tx => (
                    <div key={tx.id} className="cd-setting-item" style={{padding:'0.75rem 0'}}>
                        <div className="cd-setting-info">
                            <div className="cd-setting-icon" style={{fontSize:'1rem'}}>🛍️</div>
                            <div>
                                <p className="cd-setting-name" style={{fontSize:'0.9rem'}}>{tx.description}</p>
                                <p className="cd-setting-desc">{new Date(tx.expense_date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <span style={{fontWeight:'600'}}>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount)}</span>
                    </div>
                ))
            ) : (
                <p className="cd-setting-desc">No recent activity.</p>
            )}
        </div>

        <h3 className="cd-section-title" style={{marginTop:'2rem'}}>Security</h3>
        
        <div className="cd-setting-item">
            <div className="cd-setting-info">
                <div className="cd-setting-icon">🌍</div>
                <div>
                    <p className="cd-setting-name">Online Transactions</p>
                    <p className="cd-setting-desc">Allow payments on the internet</p>
                </div>
            </div>
            <label className="toggle-switch">
                <input type="checkbox" checked={settings.online} onChange={() => toggleSetting('online')} />
                <span className="slider round"></span>
            </label>
        </div>

        <div className="cd-setting-item">
            <div className="cd-setting-info">
                <div className="cd-setting-icon">📡</div>
                <div>
                    <p className="cd-setting-name">Contactless Payments</p>
                    <p className="cd-setting-desc">Tap to pay with your card</p>
                </div>
            </div>
            <label className="toggle-switch">
                <input type="checkbox" checked={settings.contactless} onChange={() => toggleSetting('contactless')} />
                <span className="slider round"></span>
            </label>
        </div>

        <div className="cd-setting-item">
            <div className="cd-setting-info">
                <div className="cd-setting-icon">🏧</div>
                <div>
                    <p className="cd-setting-name">ATM Withdrawals</p>
                    <p className="cd-setting-desc">Allow cash withdrawals</p>
                </div>
            </div>
            <label className="toggle-switch">
                <input type="checkbox" checked={settings.swipe} onChange={() => toggleSetting('swipe')} />
                <span className="slider round"></span>
            </label>
        </div>
      </div>
      
      <div className="cd-footer">
        <button className="cd-terminate-btn" onClick={handleDelete}>Terminate Card</button>
      </div>
    </div>
  );
};

export default CardDetails;
