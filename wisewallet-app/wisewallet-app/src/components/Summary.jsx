import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Add supabase import
import './Summary.css';

function Summary({ expenses, budget, incomeCategoryId }) {
  const [cash, setCash] = useState(0);
  const [savings, setSavings] = useState(0);
  const [wealthLoading, setWealthLoading] = useState(true);

  useEffect(() => {
    const fetchWealth = async () => {
      setWealthLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('wealth')
          .select('cash, savings')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching wealth:', error);
        } else if (data && data.length > 0) {
          const wealthData = data[0]; // Use only the first result
          setCash(data.cash || 0);
          setSavings(data.savings || 0);
        } else {
          setCash(0);
          setSavings(0);
        }
      }
      setWealthLoading(false);
    };

    fetchWealth();

    const wealthSubscription = supabase
        .channel('public:wealth_summary')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wealth' }, payload => {
            console.log('Wealth change received in Summary!', payload);
            fetchWealth();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(wealthSubscription);
    };
  }, []);

  const totalExpenses = expenses.reduce((total, expense) => {
    if (expense.category_id !== incomeCategoryId) {
      return total + expense.amount;
    } else {
      return total; // Income is not an expense
    }
  }, 0);

  const totalIncome = expenses.reduce((total, expense) => {
    if (expense.category_id === incomeCategoryId) {
      return total + expense.amount;
    }
    return total;
  }, 0);

  const remaining = totalIncome - totalExpenses; // Updated calculation

  const totalWealth = savings + remaining; // New calculation for totalWealth

  const remainingClassName = remaining >= 0 ? 'positive' : 'negative';

  return (
    <div className="summary-container total-wealth-box"> {/* Added total-wealth-box class */}
      <h3 className="total-wealth-header">Total Wealth: €{wealthLoading ? '...' : totalWealth.toFixed(2)}</h3> {/* Prominent header */}
      <div className="summary-cards-grid"> {/* New div for the grid of cards */}
        <div className="summary-card">
          <span className="summary-title">Income</span>
          <span className="summary-value">€{totalIncome.toFixed(2)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-title">Savings</span>
          <span className="summary-value">€{wealthLoading ? '...' : savings.toFixed(2)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-title">Expenses</span>
          <span className="summary-value">€{totalExpenses.toFixed(2)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-title">Budget</span>
          <span className="summary-value">€{budget.toFixed(2)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-title">Remaining</span>
          <span className={`summary-value ${remainingClassName}`}>€{remaining.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default Summary;