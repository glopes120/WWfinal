
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './RecentExpenses.css';

function RecentExpenses({ refreshTrigger }) {
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentExpenses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('id, description, amount, expense_date') // Removed category_id as it's not displayed
          .eq('user_id', user.id)
          .order('expense_date', { ascending: false })
          .limit(5); // Fetch only the 5 most recent expenses

        if (expensesError) throw expensesError;

        setRecentExpenses(expensesData);
      } catch (error) {
        console.error('Error fetching recent expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentExpenses();
  }, [refreshTrigger]);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <>
      {recentExpenses.length === 0 ? (
        <p>No recent expenses to display.</p>
      ) : (
        <>
          {recentExpenses.map(expense => (
            <div key={expense.id} className="transaction-item"> {/* Renamed to transaction-item */}
              <span>{expense.description}</span>
              <span className="negative"> {/* Assuming all are expenses, thus negative */}
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(expense.amount)}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  );
}

export default RecentExpenses;
