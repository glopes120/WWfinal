import React from 'react';
import './Cards.css';

const Cards = ({ accounts, onAddAccount, onCardClick }) => {
  // Helper to generate random-ish gradients based on id or name
  const getGradient = (type) => {
    switch (type?.toLowerCase()) {
      case 'savings': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // Green
      case 'credit': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; // Gold/Orange
      case 'investment': return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'; // Purple
      default: return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'; // Blue (Standard)
    }
  };

  const formatCardNumber = (id) => {
    // Fake 4 digits based on ID
    const hash = id?.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 1234;
    return `•••• ${hash % 9000 + 1000}`;
  };

  return (
    <div className="cards-section">
      <div className="cards-header">
        <h2 className="section-title">My Cards</h2>
        <button className="add-card-btn" onClick={onAddAccount}>+ Add new</button>
      </div>
      
      <div className="cards-scroll-container">
        {accounts.map((acc) => (
          <div 
            key={acc.id} 
            className="digital-card"
            style={{ background: getGradient(acc.type) }}
            onClick={() => onCardClick && onCardClick(acc)}
          >
            <div className="card-top">
              <span className="card-type">{acc.name}</span>
              <span className="card-logo">Visa</span>
            </div>
            <div className="card-middle">
              <span className="card-chip"></span>
              <span className="contactless-icon">)))</span>
            </div>
            <div className="card-bottom">
              <span className="card-number">{formatCardNumber(acc.id)}</span>
              <span className="card-balance">
                 {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(acc.balance))}
              </span>
            </div>
          </div>
        ))}

        {/* Action Card (Add) */}
        <div className="digital-card add-card-placeholder" onClick={onAddAccount}>
            <div className="add-icon-circle">+</div>
            <span>Get a new card</span>
        </div>
      </div>
    </div>
  );
};

export default Cards;
