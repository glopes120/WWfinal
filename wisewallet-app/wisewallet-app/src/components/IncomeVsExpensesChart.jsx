import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './IncomeVsExpensesChart.css';

const IncomeVsExpensesChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name');
        if (categoriesError) throw categoriesError;

        const incomeCategory = categoriesData.find(cat => cat.name.trim().toLowerCase() === 'income');
        const incomeCategoryId = incomeCategory ? incomeCategory.id : null;

        const today = new Date();
        const last6Months = [];
        const monthlyTotals = {};

        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthYear = d.toLocaleString('default', { month: 'short' });
          last6Months.push(monthYear);
          monthlyTotals[monthYear] = { income: 0, expense: 0 };
        }

        const startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString();
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        const { data: allTransactions, error: expensesError } = await supabase
          .from('expenses')
          .select('amount, expense_date, category_id')
          .eq('user_id', user.id)
          .gte('expense_date', startDate)
          .lte('expense_date', endDate);

        if (expensesError) throw expensesError;

        allTransactions.forEach(item => {
          const date = new Date(item.expense_date);
          const monthYear = date.toLocaleString('default', { month: 'short' });

          if (monthlyTotals[monthYear]) {
            if (item.category_id === incomeCategoryId) {
              monthlyTotals[monthYear].income += item.amount;
            } else {
              monthlyTotals[monthYear].expense += item.amount;
            }
          }
        });

        setChartData({
          months: last6Months,
          income: last6Months.map(m => monthlyTotals[m].income),
          expenses: last6Months.map(m => monthlyTotals[m].expense),
        });

      } catch (err) {
        console.error('Error fetching monthly data:', err);
        setError('Failed to load chart data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, []);

  const handleMouseEnter = (e, index) => {
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      month: chartData.months[index],
      income: chartData.income[index],
      expenses: chartData.expenses[index],
      left: rect.left + rect.width / 2 - 70,
      top: rect.top - 90,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  if (loading) return <p>Loading chart...</p>;
  if (error) return <p style={{ color: 'var(--theme-accent-negative)' }}>{error}</p>;
  if (!chartData) return <p>No data to display yet.</p>;

  const maxValue = Math.max(...chartData.income, ...chartData.expenses, 1) * 1.2;
  const steps = 5;
  const stepValue = maxValue / steps;

  return (
    <div className="container">
      <h1>Income vs Expenses</h1>
      
      <div className="chart-container">
        <div className="y-axis">
          {[...Array(steps + 1)].map((_, i) => (
            <div key={i} className="y-label">
              ${((maxValue - (stepValue * i)) / 1000).toFixed(0)}k
            </div>
          ))}
        </div>
        
        <div className="chart-area">
          <div className="grid-lines">
            {[...Array(steps + 1)].map((_, i) => (
              <div key={i} className={i === steps ? 'grid-line' : 'grid-line dotted'}></div>
            ))}
          </div>
          <div className="bars-container">
            {chartData.months.map((month, index) => (
              <div
                key={month}
                className="bar-group"
                onMouseEnter={(e) => handleMouseEnter(e, index)}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  className="bar income"
                  style={{ height: `${(chartData.income[index] / maxValue) * 100}%`, animationDelay: `${index * 0.1}s` }}
                ></div>
                <div
                  className="bar expenses"
                  style={{ height: `${(chartData.expenses[index] / maxValue) * 100}%`, animationDelay: `${index * 0.1 + 0.05}s` }}
                ></div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="x-axis">
          {chartData.months.map(month => (
            <div key={month} className="x-label">{month}</div>
          ))}
        </div>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-dot income"></div>
          <span className="legend-label">Income</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot expenses"></div>
          <span className="legend-label">Expenses</span>
        </div>
      </div>

      {tooltip && (
        <div className="tooltip show" style={{ left: tooltip.left, top: tooltip.top }}>
          <div className="tooltip-month">{tooltip.month}</div>
          <div className="tooltip-row">
            <div className="tooltip-label">
              <div className="tooltip-dot" style={{ background: '#2ECC71' }}></div>
              Income
            </div>
            <div className="tooltip-value">${tooltip.income.toLocaleString()}</div>
          </div>
          <div className="tooltip-row">
            <div className="tooltip-label">
              <div className="tooltip-dot" style={{ background: '#E74C3C' }}></div>
              Expenses
            </div>
            <div className="tooltip-value">${tooltip.expenses.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeVsExpensesChart;