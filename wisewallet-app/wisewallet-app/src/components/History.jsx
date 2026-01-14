import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './History.css';
import '../styles/revolut-base.css';
import CompletedSavingsGoals from './CompletedSavingsGoals.jsx';
import './CompletedSavingsGoals.css';

function History({ expenses, loading, incomeCategoryId, setView, onDataRefresh }) {
  const [activeTab, setActiveTab] = useState('expenseHistory');
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      if (onDataRefresh) onDataRefresh();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction.');
    } finally {
      setDeletingId(null);
    }
  };

  const renderExpenseHistory = () => {
    if (loading) {
      return <div className="revolut-empty-state">Loading...</div>;
    }

    if (expenses.length === 0) {
      return <div className="revolut-empty-state">No transactions recorded yet.</div>;
    }

    // Ordenar as despesas por data, da mais recente para a mais antiga
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));

    return (
      <div>
        {sortedExpenses.map(expense => {
          const isIncome = expense.category_id === incomeCategoryId;
          const amountPrefix = isIncome ? '+' : '-';
          const icon = isIncome ? '💰' : '💸';

          return (
            <div key={expense.id} className="revolut-list-item" style={{position:'relative'}}>
              <div className="revolut-icon-circle" style={{ background: isIncome ? 'rgba(0, 216, 86, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
                {icon}
              </div>
              <div style={{ flex: 1 }}>
                <div className="revolut-item-title">{expense.description}</div>
                <div className="revolut-item-subtitle">
                  {expense.categories?.name || 'Uncategorized'} • {new Date(expense.expense_date).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                <div className={`revolut-item-title ${isIncome ? 'revolut-change-positive' : 'revolut-change-negative'}`}>
                  {amountPrefix}€{expense.amount.toFixed(2)}
                </div>
              </div>
              <button 
                onClick={() => handleDelete(expense.id)} 
                disabled={deletingId === expense.id}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    opacity: deletingId === expense.id ? 0.5 : 1,
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                title="Delete Transaction"
              >
                🗑️
              </button>
            </div>
          );
        })}
      </div>
    );
  };

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
          <h1 className="revolut-title">Transaction History</h1>
          <p className="revolut-subtitle">Review your income and expenses</p>
        </div>
        <div style={{ width: 'clamp(2rem, 2.5vw + 1rem, 2.5rem)' }}></div>
      </div>

      {/* Tabs */}
      <div className="revolut-tabs">
        <button
          className={`revolut-tab ${activeTab === 'expenseHistory' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenseHistory')}
        >
          Expense History
        </button>
        <button
          className={`revolut-tab ${activeTab === 'completedGoals' ? 'active' : ''}`}
          onClick={() => setActiveTab('completedGoals')}
        >
          Completed Goals
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'expenseHistory' ? renderExpenseHistory() : <CompletedSavingsGoals />}
      </div>
    </div>
  );
}

export default History;
