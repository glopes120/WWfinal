import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './BudgetOverview.css';

function BudgetOverview() {
  const [budgetSummary, setBudgetSummary] = useState({
    totalBudget: 0,
    totalExpenses: 0,
    remaining: 0,
  });
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBudgetAndBills = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Fetch current month's budget
        const { data: budgetData, error: budgetError } = await supabase
          .from('budgets')
          .select('amount')
          .gte('end_date', startOfMonth.toISOString())
          .lte('start_date', endOfMonth.toISOString())
          .eq('user_id', user.id);
        if (budgetError) throw budgetError;

        const totalBudget = budgetData.reduce((sum, budget) => sum + budget.amount, 0);

        // Fetch current month's expenses
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('amount')
          .gte('expense_date', startOfMonth.toISOString())
          .lte('expense_date', endOfMonth.toISOString())
          .eq('user_id', user.id);
        if (expensesError) throw expensesError;

        const totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);

        setBudgetSummary({
          totalBudget,
          totalExpenses,
          remaining: totalBudget - totalExpenses,
        });

        // Fetch upcoming bills (expenses in the future, categorized as 'bill' or similar)
        // This assumes you have a way to identify bills, e.g., a 'type' column or specific category
        // For now, let's just fetch future expenses as a placeholder for 'bills'
        const { data: futureExpenses, error: futureExpensesError } = await supabase
          .from('expenses')
          .select('description, amount, expense_date')
          .gte('expense_date', today.toISOString())
          .eq('user_id', user.id)
          .order('expense_date', { ascending: true })
          .limit(3); // Show 3 upcoming bills
        
        if (futureExpensesError) throw futureExpensesError;
        setUpcomingBills(futureExpenses);

      } catch (error) {
        console.error('Error fetching budget and bills data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetAndBills();
  }, []);

  if (loading) {
    return <div className="budget-overview-container"><h3>Budget Overview</h3><p>Loading...</p></div>;
  }

  return (
    <div className="budget-overview-container">
      <h3>Budget Overview</h3>
      <div className="budget-summary">
        <p>Total Budget: €{budgetSummary.totalBudget.toFixed(2)}</p>
        <p>Total Expenses: €{budgetSummary.totalExpenses.toFixed(2)}</p>
        <p className={budgetSummary.remaining >= 0 ? 'positive' : 'negative'}>
          Remaining: €{budgetSummary.remaining.toFixed(2)}
        </p>
      </div>

      <h4>Upcoming Bills</h4>
      {upcomingBills.length === 0 ? (
        <p>No upcoming bills.</p>
      ) : (
        <ul className="upcoming-bills-list">
          {upcomingBills.map(bill => (
            <li key={bill.description + bill.expense_date} className="upcoming-bill-item">
              <span>{bill.description}</span>
              <span>€{bill.amount.toFixed(2)}</span>
              <span>{new Date(bill.expense_date).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BudgetOverview;
