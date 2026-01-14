import React, { useMemo } from 'react';
import './SpendingPower.css';

const SpendingPower = ({ expenses, incomeCategoryId, safeToSpendBalance }) => {
  const { spendingPower, spentThisMonth, avgIncome, healthScore } = useMemo(() => {
    if (!expenses || expenses.length === 0 || !incomeCategoryId) {
      return { spendingPower: 0, spentThisMonth: 0, avgIncome: 0, healthScore: 0 };
    }

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 1. Calculate Income & Expenses per month
    const monthlyStats = {}; // "2023-10": { income: 0, expense: 0 }

    expenses.forEach(tx => {
      const d = new Date(tx.expense_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      
      if (!monthlyStats[key]) monthlyStats[key] = { income: 0, expense: 0 };

      if (tx.category_id === incomeCategoryId) {
        monthlyStats[key].income += Number(tx.amount);
      } else {
        monthlyStats[key].expense += Number(tx.amount);
      }
    });

    // 2. Calculate Average Income (excluding current partial month if possible, or just all)
    // Let's use all months available to be safe, or last 3.
    const keys = Object.keys(monthlyStats);
    if (keys.length === 0) return { spendingPower: 0, spentThisMonth: 0, avgIncome: 0, healthScore: 0 };

    let totalIncome = 0;
    let monthsWithIncome = 0;
    keys.forEach(k => {
        if (monthlyStats[k].income > 0) {
            totalIncome += monthlyStats[k].income;
            monthsWithIncome++;
        }
    });

    const calculatedAvgIncome = monthsWithIncome > 0 ? totalIncome / monthsWithIncome : 0;

    // 3. Current Month Stats
    const currentKey = `${currentYear}-${currentMonth}`;
    const currentStats = monthlyStats[currentKey] || { income: 0, expense: 0 };
    
    // Spending Power Logic:
    // If we have an average income, that is our "implicit budget".
    // Remaining = AvgIncome - CurrentMonthExpense.
    
    // Use the HIGHER of (AvgIncome) or (CurrentMonthIncome) as the limit. 
    // Sometimes you earn more this month.
    const limit = Math.max(calculatedAvgIncome, currentStats.income);
    
    const remaining = limit - currentStats.expense;
    
    // Health Score (0-100)
    // 100 = 0 spending. 50 = spent 50% of income. 0 = spent 100%+.
    let score = 100;
    if (limit > 0) {
        const ratio = currentStats.expense / limit;
        score = Math.max(0, 100 - (ratio * 100));
    } else if (currentStats.expense > 0) {
        score = 0;
    }

    return {
      spendingPower: remaining,
      spentThisMonth: currentStats.expense,
      avgIncome: limit, // Effectively the "Limit"
      healthScore: score
    };
  }, [expenses, incomeCategoryId]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const getHealthColor = (score) => {
    if (score > 60) return '#10b981'; // Green
    if (score > 30) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const percentUsed = avgIncome > 0 ? Math.min(100, (spentThisMonth / avgIncome) * 100) : 0;

  return (
    <div className="spending-power-card">
      <div className="sp-header">
        <div className="sp-icon-wrapper">
            <span className="sp-icon">💳</span>
        </div>
        <div>
            <h3 className="sp-title">Spending Power</h3>
            <p className="sp-subtitle">Based on your income history</p>
        </div>
        <div className="sp-score" style={{color: getHealthColor(healthScore)}}>
            {Math.round(healthScore)}/100
        </div>
      </div>

      <div className="sp-body">
        {/* Safe To Spend Account Balance Override/Addition */}
        {Number(safeToSpendBalance) > 0 && (
            <div className="sp-account-balance" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--theme-border)' }}>
                <span className="sp-label" style={{ color: '#60a5fa' }}>Account Balance (Safe to Spend)</span>
                <span className="sp-amount" style={{ color: '#60a5fa', fontSize: '1.5rem', display: 'block' }}>
                    {formatCurrency(Number(safeToSpendBalance))}
                </span>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Available in designated accounts</p>
            </div>
        )}

        <div className="sp-main-value">
            <span className="sp-label">Income-Based Remaining</span>
            <span className="sp-amount" style={{color: spendingPower < 0 ? '#ef4444' : 'var(--theme-text-primary)'}}>
                {formatCurrency(spendingPower)}
            </span>
        </div>

        <div className="sp-progress-container">
            <div className="sp-progress-labels">
                <span>Spent: {formatCurrency(spentThisMonth)}</span>
                <span>Limit: {formatCurrency(avgIncome)}</span>
            </div>
            <div className="sp-progress-bar-bg">
                <div 
                    className="sp-progress-bar-fill" 
                    style={{ 
                        width: `${percentUsed}%`,
                        backgroundColor: getHealthColor(healthScore)
                    }}
                />
            </div>
        </div>

        <div className="sp-insight">
            {spendingPower > 0 
                ? `You have ${formatCurrency(spendingPower)} left before reaching your average monthly income.` 
                : "You have exceeded your average monthly income. Slow down!"
            }
        </div>
      </div>
    </div>
  );
};

export default SpendingPower;
