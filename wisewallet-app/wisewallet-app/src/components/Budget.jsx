import { useState, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { supabase } from '../supabaseClient';
import TransactionForm from './TransactionForm';
import '../styles/revolut-base.css';
import './Budget.css';

ChartJS.register(ArcElement, Tooltip, Legend);

// Portfolio-style vibrant colors
const PORTFOLIO_COLORS = ['#00D856', '#0075FF', '#FFB800', '#8b5cf6', '#FF0080', '#00D4FF', '#FF6B00', '#A855F7'];

// Function to get vibrant color based on index (same as Portfolio)
const getCategoryColor = (index) => {
  return PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length];
}

// Pie chart options with Portfolio-style vibrant styling
const getPieOptions = () => ({
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#1a1a1a',
      titleColor: '#fff',
      titleFont: {
        size: 14,
        weight: 'bold'
      },
      bodyColor: '#fff',
      bodyFont: {
        size: 13
      },
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      cornerRadius: 12,
      padding: 14,
      displayColors: true,
      boxPadding: 8,
      callbacks: {
        label: function(context) {
          const label = context.label || '';
          const value = context.parsed || 0;
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return [`${label}: €${value.toFixed(2)}`, `${percentage}%`];
        }
      }
    },
  },
  cutout: '70%',
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 1200,
    easing: 'easeOutCubic'
  },
  elements: {
    arc: {
      borderWidth: 3,
      borderAlign: 'inner',
      borderColor: '#000000',
      hoverBorderWidth: 4,
      hoverBorderColor: '#ffffff',
      hoverOffset: 4
    }
  },
  onHover: (event, activeElements) => {
    event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
  }
});

const pieOptions = getPieOptions();

export default function Budget({ 
  expenses = [], 
  categories = [], 
  budgets = [], 
  incomeCategoryId,
  user,
  setView,
  onDataRefresh,
  onNotification
}) {
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false); // State for transaction modal
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryBudget, setNewCategoryBudget] = useState('');

  const { 
    totalIncome, 
    totalExpenses, 
    recentTransactions,
    budgetCategories 
  } = useMemo(() => {
    let income = 0;
    const expenseMap = new Map();
    const categoryDetails = new Map();

    // Use Portfolio-style vibrant colors instead of generated ones
    let colorIndex = 0;
    categories.forEach(cat => {
      categoryDetails.set(cat.id, { 
        name: cat.name, 
        color: getCategoryColor(colorIndex++),
        colorIndex: colorIndex - 1
      });
    });

    const validExpenses = Array.isArray(expenses) ? expenses : [];
    validExpenses.forEach(tx => {
      if (tx.category_id === incomeCategoryId) {
        income += tx.amount;
      } else {
        const currentSpent = expenseMap.get(tx.category_id) || 0;
        expenseMap.set(tx.category_id, currentSpent + tx.amount);
      }
    });

    const expenseTotal = Array.from(expenseMap.values()).reduce((sum, spent) => sum + spent, 0);

    let catColorIndex = 0;
    const finalBudgetCategories = Array.from(categoryDetails.entries())
      .filter(([id]) => id !== incomeCategoryId)
      .map(([id, details]) => {
        const budgetInfo = budgets.find(b => b.category_id === id);
        const color = getCategoryColor(catColorIndex++);
        return {
          id,
          name: details.name,
          spent: expenseMap.get(id) || 0,
          budget: budgetInfo ? budgetInfo.amount : 0,
          color: color,
          colorIndex: catColorIndex - 1
        };
      });
      
    const sortedTransactions = [...validExpenses]
        .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
        .map(tx => ({
            ...tx,
            categoryName: categoryDetails.get(tx.category_id)?.name || 'Uncategorized'
        }));


    return { 
      totalIncome: income, 
      totalExpenses: expenseTotal,
      recentTransactions: sortedTransactions.slice(0, 5),
      budgetCategories: finalBudgetCategories
    };
  }, [expenses, categories, budgets, incomeCategoryId]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!user) {
      onNotification({ title: 'Error', message: 'You must be logged in.', type: 'error' });
      return;
    }
    if (!newCategoryName.trim()) {
      onNotification({ title: 'Error', message: 'Category name cannot be empty.', type: 'error' });
      return;
    }
    const budgetAmount = parseFloat(newCategoryBudget);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      onNotification({ title: 'Error', message: 'Please enter a valid budget amount.', type: 'error' });
      return;
    }

    try {
      // 1. Create the new category
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .insert({ name: newCategoryName.trim() })
        .select();

      if (categoryError) throw categoryError;
      if (!categoryData || categoryData.length === 0) throw new Error("Failed to create category.");
      
      const newCategoryId = categoryData[0].id;

      // 2. Create the new budget for that category
      const { error: budgetError } = await supabase
        .from('budgets')
        .insert({ user_id: user.id, category_id: newCategoryId, amount: budgetAmount });

      if (budgetError) throw budgetError;

      onNotification({ title: 'Success', message: `Category '${newCategoryName}' added.`, type: 'success' });
      setShowAddCategory(false);
      setNewCategoryName('');
      setNewCategoryBudget('');
      onDataRefresh(); // Trigger data refresh in dashboard
    } catch (error) {
      console.error("Error adding category:", error);
      onNotification({ title: 'Error', message: error.message || 'Could not add category.', type: 'error' });
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"? This will also remove its budget.`)) return;

    try {
        // 1. Delete associated budget (if exists)
        await supabase.from('budgets').delete().eq('category_id', categoryId);

        // 2. Delete the category itself
        // Note: If there are expenses linked to this category, Supabase might throw a foreign key error 
        // unless 'ON DELETE SET NULL' or 'CASCADE' is configured. 
        // For safety, we try to delete. If it fails due to FK, we tell the user.
        const { error } = await supabase.from('categories').delete().eq('id', categoryId);

        if (error) {
            if (error.code === '23503') { // Foreign key violation code (Postgres)
                 throw new Error("Cannot delete this category because it has transactions linked to it. Delete the transactions first.");
            }
            throw error;
        }

        onNotification({ title: 'Success', message: `Category "${categoryName}" deleted.`, type: 'success' });
        onDataRefresh();
    } catch (error) {
        console.error("Error deleting category:", error);
        onNotification({ title: 'Error', message: error.message, type: 'error' });
    }
  };


  const remaining = totalIncome - totalExpenses;
  const budgetProgress = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

  // Prepare pie chart data with gradients and vibrant colors
  // Create vibrant pie chart data using Portfolio colors (bright and vivid)
  const pieData = useMemo(() => {
    if (budgetCategories.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: '#000000',
          borderWidth: 3,
          borderAlign: 'inner',
        }],
      };
    }

    // Use vibrant Portfolio colors directly - these are already bright and eye-catching
    const vibrantBackgroundColors = budgetCategories.map((c, index) => {
      return c.color || getCategoryColor(index);
    });

    return {
      labels: budgetCategories.map(c => c.name),
      datasets: [{
        data: budgetCategories.map(c => c.spent),
        backgroundColor: vibrantBackgroundColors,
        borderColor: '#000000',
        borderWidth: 3,
        borderAlign: 'inner',
      }],
    };
  }, [budgetCategories]);

  const getProgressBarClass = (progress) => {
    if (progress > 90) return 'progress-bar-danger';
    if (progress > 70) return 'progress-bar-warning';
    return 'progress-bar-safe';
  }

  return (
    <div className="revolut-container">
      <div className="revolut-header">
        <button 
          onClick={() => setView ? setView('Dashboard') : window.history.back()}
          className="revolut-back-btn"
        >
          ←
        </button>
        <div>
          <h1 className="revolut-title">Budget</h1>
          <p className="revolut-subtitle">Manage your finances</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowAddTransaction(true)} className="revolut-btn" style={{ fontSize: '0.875rem', padding: '0.625rem 1.25rem' }}>
            + Transaction
          </button>
          <button onClick={() => setShowAddCategory(true)} className="revolut-btn-secondary" style={{ fontSize: '0.875rem', padding: '0.625rem 1.25rem' }}>
            + Category
          </button>
        </div>
      </div>

      {/* Summary Cards - Modern Grid */}
      <div className="budget-summary-grid">
        <div className="budget-summary-card budget-card-income">
          <div className="budget-card-icon" style={{ background: 'rgba(0, 216, 86, 0.15)' }}>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
          </div>
          <div className="budget-card-content">
            <div className="budget-card-label">Total Income</div>
            <div className="budget-card-value budget-value-positive">€{totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          </div>
        </div>

        <div className="budget-summary-card budget-card-expenses">
          <div className="budget-card-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <span style={{ fontSize: '1.5rem' }}>💸</span>
          </div>
          <div className="budget-card-content">
            <div className="budget-card-label">Total Expenses</div>
            <div className="budget-card-value budget-value-negative">€{totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          </div>
        </div>

        <div className="budget-summary-card budget-card-remaining" style={{ 
          background: remaining >= 0 
            ? 'linear-gradient(135deg, rgba(0, 216, 86, 0.15) 0%, rgba(0, 216, 86, 0.05) 100%)' 
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)'
        }}>
          <div className="budget-card-icon" style={{ background: remaining >= 0 ? 'rgba(0, 216, 86, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontSize: '1.5rem' }}>{remaining >= 0 ? '✅' : '⚠️'}</span>
          </div>
          <div className="budget-card-content">
            <div className="budget-card-label">Remaining</div>
            <div className={`budget-card-value ${remaining >= 0 ? 'budget-value-positive' : 'budget-value-negative'}`}>
              {remaining >= 0 ? '+' : ''}€{remaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Progress Card */}
      <div className="revolut-card budget-progress-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600 }}>Budget Progress</h2>
          <span className="budget-progress-percentage" style={{ 
            color: budgetProgress > 90 ? '#ef4444' : budgetProgress > 70 ? '#f59e0b' : '#00D856',
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            {budgetProgress}%
          </span>
        </div>
        <div className="budget-progress-bar-container">
          <div 
            className="budget-progress-bar-fill"
            style={{ 
              width: `${Math.min(100, budgetProgress)}%`, 
              background: budgetProgress > 90 ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' : 
                          budgetProgress > 70 ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' : 
                          'linear-gradient(90deg, #00D856 0%, #00b048 100%)',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }} 
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
          <span>€{totalExpenses.toFixed(2)} of €{totalIncome.toFixed(2)}</span>
          <span>{((totalIncome - totalExpenses) / totalIncome * 100).toFixed(0)}% remaining</span>
        </div>
      </div>

      {/* Spending by Category & Pie Chart */}
      <div className="budget-chart-section">
        <div className="revolut-card budget-pie-card">
          <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Spending by Category</h2>
          <div className="budget-pie-container">
            <div className="budget-pie-chart-wrapper">
              <Pie data={pieData} options={pieOptions} />
            </div>
            <div className="budget-pie-legend">
              {budgetCategories.map((c) => (
                <div key={c.id} className="budget-legend-item">
                  <div className="budget-legend-dot" style={{ backgroundColor: c.color }} />
                  <div style={{ flex: 1 }}>
                    <div className="budget-legend-name">{c.name}</div>
                    <div className="budget-legend-amount">€{c.spent.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="revolut-card">
        <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Budget Categories</h2>
        {budgetCategories.length === 0 ? (
          <div className="revolut-empty-state">No budget categories yet. Add one to get started!</div>
        ) : (
          <div className="budget-categories-list">
            {budgetCategories.map((cat) => {
              const progress = cat.budget > 0 ? Math.round((cat.spent / cat.budget) * 100) : 0;
              const overBudget = cat.budget > 0 && cat.spent > cat.budget;
              return (
                <div key={cat.id} className="budget-category-item">
                  <div className="budget-category-header">
                    <div className="budget-category-info">
                      <div className="budget-category-dot" style={{ backgroundColor: cat.color }} />
                      <div>
                        <div className="budget-category-name">{cat.name}</div>
                        <div className="budget-category-meta">
                          <span className={overBudget ? 'budget-category-over' : ''}>€{cat.spent.toFixed(2)}</span>
                          <span className="budget-category-separator"> / </span>
                          <span>€{cat.budget.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="budget-category-actions">
                      <span className={`budget-category-percentage ${overBudget ? 'budget-category-percentage-over' : ''}`}>
                        {progress}%
                      </span>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="budget-category-delete-btn"
                        title="Delete Category"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="budget-category-progress-wrapper">
                    <div className="budget-category-progress-bar">
                      <div 
                        className="budget-category-progress-fill"
                        style={{ 
                          width: `${Math.min(100, progress)}%`, 
                          background: overBudget 
                            ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' 
                            : `linear-gradient(90deg, ${cat.color} 0%, ${cat.color}dd 100%)`,
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Recent Transactions */}
      <div className="revolut-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Transactions</h2>
          <button 
            onClick={() => setView('History')} 
            className="revolut-btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
          >
            View All →
          </button>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="revolut-empty-state">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
            <div>No recent transactions</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>Add your first transaction to get started</div>
          </div>
        ) : (
          <div className="budget-transactions-list">
            {recentTransactions.map((tx, idx) => (
              <div key={tx.id} className="budget-transaction-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="budget-transaction-icon" style={{ 
                  background: tx.category_id === incomeCategoryId 
                    ? 'linear-gradient(135deg, rgba(0, 216, 86, 0.2) 0%, rgba(0, 216, 86, 0.1) 100%)' 
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{tx.category_id === incomeCategoryId ? '💰' : '💸'}</span>
                </div>
                <div className="budget-transaction-details">
                  <div className="budget-transaction-name">{tx.description || 'Transaction'}</div>
                  <div className="budget-transaction-meta">
                    <span>{tx.categoryName}</span>
                    <span className="budget-transaction-separator"> • </span>
                    <span>{new Date(tx.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <div className={`budget-transaction-amount ${tx.category_id === incomeCategoryId ? 'budget-transaction-income' : 'budget-transaction-expense'}`}>
                  {tx.category_id === incomeCategoryId ? '+' : '-'}€{Math.abs(tx.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddTransaction && (
        <div className="revolut-modal-backdrop" onClick={() => setShowAddTransaction(false)}>
            <div className="revolut-modal-content" onClick={e => e.stopPropagation()}>
              <div className="revolut-modal-handle"></div>
                <TransactionForm
                    categories={categories}
                    incomeCategoryId={incomeCategoryId}
                    user={user}
                    onDataRefresh={onDataRefresh}
                    onNotification={onNotification}
                    onClose={() => setShowAddTransaction(false)}
                />
            </div>
        </div>
      )}

      {showAddCategory && (
        <div className="revolut-modal-backdrop" onClick={() => setShowAddCategory(false)}>
          <div className="revolut-modal-content" onClick={e => e.stopPropagation()}>
            <div className="revolut-modal-handle"></div>
            <h2 className="revolut-modal-title">Add Budget Category</h2>
            <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="revolut-label" htmlFor="categoryName">Category Name</label>
                <input 
                  id="categoryName" 
                  className="revolut-form-input" 
                  placeholder="e.g., Subscriptions" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div>
                <label className="revolut-label" htmlFor="monthlyBudget">Monthly Budget (€)</label>
                <input 
                  id="monthlyBudget" 
                  type="number" 
                  className="revolut-form-input" 
                  placeholder="100" 
                  value={newCategoryBudget}
                  onChange={(e) => setNewCategoryBudget(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddCategory(false)} className="revolut-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="revolut-btn" style={{ flex: 1 }}>Add Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}