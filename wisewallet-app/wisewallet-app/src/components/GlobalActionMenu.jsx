import React, { useState } from 'react';
import './GlobalActionMenu.css';

export default function GlobalActionMenu({ onAddTransaction, onAddAccount }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="global-action-wrapper">
      {/* Overlay to close when clicking outside */}
      {isOpen && <div className="action-menu-overlay" onClick={() => setIsOpen(false)} />}
      
      <div className="global-action-container">
        <div className={`action-menu ${isOpen ? 'open' : ''}`}>
          <button 
            className="action-item" 
            onClick={() => { onAddAccount(); setIsOpen(false); }}
            style={{transitionDelay: isOpen ? '50ms' : '0ms'}}
          >
            <span className="action-label">Add Account</span>
            <div className="action-circle account-circle">
                <span>🏦</span>
            </div>
          </button>
          
          <button 
            className="action-item" 
            onClick={() => { onAddTransaction(); setIsOpen(false); }}
            style={{transitionDelay: isOpen ? '100ms' : '0ms'}}
          >
            <span className="action-label">Add Transaction</span>
            <div className="action-circle transaction-circle">
                <span>💸</span>
            </div>
          </button>
        </div>
        
        <button className={`fab-main ${isOpen ? 'open' : ''}`} onClick={toggleOpen}>
          <span className="fab-icon">{isOpen ? '✕' : '+'}</span>
        </button>
      </div>
    </div>
  );
}
