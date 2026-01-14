import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './BudgetList.css';

function BudgetList({ selectedMonth, onEditBudget, onBudgetDeleted }) {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBudgetsAndCategories = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name');
        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
          return;
        }
        setCategories(categoriesData);

        // Fetch budgets for the selected month
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0).toISOString();

        const { data: budgetsData, error: budgetsError } = await supabase
          .from('budgets')
          .select('id, amount, category_id, start_date, end_date')
          .eq('user_id', user.id)
          .gte('start_date', startDate)
          .lte('end_date', endDate)
          .order('start_date', { ascending: false });

        if (budgetsError) {
          console.error('Error fetching budgets:', budgetsError);
        } else {
          setBudgets(budgetsData);
        }
      }
      setLoading(false);
    };

    fetchBudgetsAndCategories();

    const subscription = supabase
      .channel('public:budgets_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, payload => {
        console.log('Budget change received in list!', payload);
        fetchBudgetsAndCategories(); // Re-fetch data on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedMonth]);

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const handleDelete = async (budgetId) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      setLoading(true);
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) {
        console.error('Error deleting budget:', error);
        alert('Error deleting budget: ' + error.message);
      } else {
        alert('Budget deleted successfully!');
        if (onBudgetDeleted) onBudgetDeleted(); // Notify parent to re-fetch
      }
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="budget-list-container"><h3>Your Budgets</h3><p>Loading budgets...</p></div>;
  }

  return (
    <div className="budget-list-container">
      <h3>Your Budgets</h3>
      {budgets.length === 0 ? (
        <p>No budgets set for this month.</p>
      ) : (
        <ul className="budget-list">
          {budgets.map(budget => (
            <li key={budget.id} className="budget-item">
              <div className="budget-item-details">
                <span className="budget-item-category">{getCategoryName(budget.category_id)}</span>
                <span className="budget-item-amount">€{budget.amount.toFixed(2)}</span>
                <span className="budget-item-dates">
                  {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                </span>
              </div>
              <div className="budget-item-actions">
                <button onClick={() => onEditBudget(budget)} className="edit-button">Edit</button>
                <button onClick={() => handleDelete(budget.id)} className="delete-button">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BudgetList;
