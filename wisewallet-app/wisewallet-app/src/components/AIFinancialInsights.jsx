import React, { useState } from 'react';
import './AIFinancialInsights.css'; // Import the CSS file you provided

// Placeholder icons (replace with actual icons from a library like react-icons)
const SettingsIcon = () => <span>⚙️</span>;
const FoodIcon = () => <span>🍔</span>;
const TransportIcon = () => <span>🚌</span>;
const ShoppingIcon = () => <span>🛒</span>;
const BillsIcon = () => <span>💡</span>;
const PlusIcon = () => <span>+</span>;

const AIFinancialInsights = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data - replace with actual data from your application state or API
  const monthlyBudget = {
    total: 3000,
    spent: 1750,
  };
  const budgetLeft = monthlyBudget.total - monthlyBudget.spent;
  const spentPercentage = (monthlyBudget.spent / monthlyBudget.total) * 100;

  const categories = [
    { name: 'Food & Drinks', spent: 450, budget: 600, icon: <FoodIcon /> },
    { name: 'Transport', spent: 150, budget: 200, icon: <TransportIcon /> },
    { name: 'Shopping', spent: 800, budget: 1000, icon: <ShoppingIcon /> },
    { name: 'Bills & Utilities', spent: 350, budget: 350, icon: <BillsIcon /> },
  ];

  const recentTransactions = [
    { name: 'Restaurant', category: 'Food & Drinks', amount: -55.0, date: '28 Nov' },
    { name: 'Gas Station', category: 'Transport', amount: -40.0, date: '27 Nov' },
    { name: 'Online Store', category: 'Shopping', amount: -120.0, date: '27 Nov' },
    { name: 'Electricity Bill', category: 'Bills & Utilities', amount: -85.0, date: '26 Nov' },
  ];
  
    const insights = [
    "You've spent 75% of your 'Food & Drinks' budget with 10 days left in the month.",
    "Great job! You are under budget on 'Transport' this month.",
    "Watch out! Your 'Shopping' expenses are higher than usual.",
  ];


  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="budget-container">
      {/* ======================= HEADER ======================= */}
      <header className="budget-header">
        <h1>Budget Management</h1>
        <div className="header-actions">
          <button className="settings-button"><SettingsIcon /> Settings</button>
          <button className="add-category-button button-primary" onClick={openModal}>
            <PlusIcon /> Add Category
          </button>
        </div>
      </header>

      {/* ======================= SUMMARY & PIE CHART GRID ======================= */}
      <main className="grid-2-summary">
        {/* Monthly Summary */}
        <section className="summary-section card">
          <h2>Monthly Summary</h2>
          <div className="budget-progress">
            <p><strong>Spent:</strong> ${monthlyBudget.spent.toFixed(2)}</p>
            <p><strong>Left:</strong> ${budgetLeft.toFixed(2)}</p>
          </div>
          <div className="budget-progress-bar-wrapper">
             <div 
               className="budget-progress-bar" 
               style={{ width: `${spentPercentage}%` }}
             ></div>
          </div>
          <div className="quick-stats">
             {/* Replace with actual stat components */}
             <div className="quick-stat"><p>Avg. Spending/day</p><h3>$58.33</h3></div>
             <div className="quick-stat"><p>Transactions</p><h3>124</h3></div>
          </div>
        </section>

        {/* Pie Chart */}
        <section className="pie-chart-section card">
          <h2>Spending by Category</h2>
          <div className="pie-chart-container">
            {/* Placeholder for Pie Chart Library */}
            <p style={{textAlign: "center", margin: "auto"}}>Pie Chart</p>
          </div>
          <div className="pie-legend">
            {categories.map(cat => (
              <div key={cat.name} className="pie-legend-item">
                <span className="pie-legend-dot" style={{ backgroundColor: 'var(--theme-accent-info)'}}></span>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ======================= BUDGET CATEGORIES ======================= */}
      <section className="categories-section card">
        <h2>Budget Categories</h2>
        {categories.map((category) => (
          <div key={category.name} className="category-item">
            <div className="category-icon">{category.icon}</div>
            <div className="category-details">
              <p>{category.name}</p>
              <small>${category.spent} of ${category.budget}</small>
            </div>
            <div className="category-progress-bar-wrapper">
              <div 
                className="category-progress-bar"
                style={{ width: `${(category.spent / category.budget) * 100}%` }}
              ></div>
            </div>
            <p className="category-percentage">{Math.round((category.spent / category.budget) * 100)}%</p>
          </div>
        ))}
         <button className="add-category-placeholder" onClick={openModal}>+ Add New Category</button>
      </section>

      {/* ======================= TRANSACTIONS & INSIGHTS GRID ======================= */}
      <div className="grid-2-bottom">
        {/* Recent Transactions */}
        <section className="transactions-section card">
          <h2>Recent Transactions</h2>
          {recentTransactions.map((t, index) => (
             <div key={index} className="transaction-item">
                <div className="transaction-icon">{/* Icon based on category */}</div>
                <div className="transaction-details">
                  <p>{t.name}</p>
                  <small>{t.category}</small>
                </div>
                <div className="transaction-amount">
                  <p>{t.amount < 0 ? `-$${Math.abs(t.amount).toFixed(2)}` : `$${t.amount.toFixed(2)}`}</p>
                  <small>{t.date}</small>
                </div>
             </div>
          ))}
          <button className="view-all-button">View All Transactions</button>
        </section>

        {/* Budget Insights */}
        <section className="insights-section card">
            <h2>AI Budget Insights</h2>
            <ul>
                {insights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                ))}
            </ul>
        </section>
      </div>


      {/* ======================= MODAL ======================= */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add New Category</h2>
            <form>
              <div className="form-group">
                <label htmlFor="categoryName">Category Name</label>
                <input type="text" id="categoryName" className="form-input" placeholder="e.g., Entertainment" />
              </div>
              <div className="form-group">
                <label htmlFor="budgetAmount">Monthly Budget</label>
                <input type="number" id="budgetAmount" className="form-input" placeholder="e.g., $200" />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-button-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal-button-submit button-primary">Add Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIFinancialInsights;