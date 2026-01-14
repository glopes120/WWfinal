import React, { useState, useEffect } from 'react';
import './ExchangeWidget.css';

const ExchangeWidget = ({ onClose }) => {
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [rate, setRate] = useState(0.92); // 1 USD = 0.92 EUR (Fake dynamic)
  const [isSelling, setIsSelling] = useState(true); // Toggle direction

  useEffect(() => {
    // Simulate rate fluctuation
    const interval = setInterval(() => {
        setRate(prev => prev + (Math.random() - 0.5) * 0.005);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSellChange = (val) => {
    setSellAmount(val);
    setBuyAmount((val * rate).toFixed(2));
  };

  const handleBuyChange = (val) => {
    setBuyAmount(val);
    setSellAmount((val / rate).toFixed(2));
  };

  return (
    <div className="exchange-widget">
        <div className="exchange-rate-pill">
            1 USD = {rate.toFixed(4)} EUR <span style={{color: rate > 0.92 ? '#10b981' : '#ef4444'}}>
                {rate > 0.92 ? '▲' : '▼'}
            </span>
        </div>

        <div className="exchange-row">
            <div className="currency-selector">
                <img src="https://flagcdn.com/w40/us.png" alt="US" className="flag-icon" />
                <span>USD</span>
                <span className="balance-label">Balance: $1,240.50</span>
            </div>
            <input 
                type="number" 
                className="exchange-input" 
                placeholder="0" 
                value={sellAmount}
                onChange={e => handleSellChange(e.target.value)}
            />
        </div>

        <div className="exchange-divider">
            <button className="swap-btn" onClick={() => setIsSelling(!isSelling)}>⇅</button>
        </div>

        <div className="exchange-row">
            <div className="currency-selector">
                <img src="https://flagcdn.com/w40/eu.png" alt="EU" className="flag-icon" />
                <span>EUR</span>
                <span className="balance-label">Balance: €420.00</span>
            </div>
            <input 
                type="number" 
                className="exchange-input" 
                placeholder="0" 
                value={buyAmount}
                onChange={e => handleBuyChange(e.target.value)}
            />
        </div>

        <div className="exchange-actions">
            <button className="btn-primary" style={{width: '100%', marginTop:'1rem'}} onClick={onClose}>
                Review Order
            </button>
        </div>
    </div>
  );
};

export default ExchangeWidget;
