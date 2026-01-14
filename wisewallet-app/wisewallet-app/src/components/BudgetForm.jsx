import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './BudgetForm.css';

function BudgetForm({ editingBudget, setEditingBudget, onNotification }) {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name');
        
        if (error) throw error;

        if (data) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        if (onNotification) {
          onNotification({ title: 'Error', message: 'Could not fetch categories.', type: 'error' });
        }
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (editingBudget) {
      setAmount(editingBudget.amount);
      setCategoryId(editingBudget.category_id);
      // Format date for input field
      setStartDate(new Date(editingBudget.start_date).toISOString().split('T')[0]);
      setEndDate(new Date(editingBudget.end_date).toISOString().split('T')[0]);
    } else {
      setAmount('');
      setCategoryId('');
      setStartDate('');
      setEndDate('');
    }
  }, [editingBudget]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !categoryId || !startDate || !endDate) {
      onNotification({ title: 'Missing Fields', message: 'Please fill out all fields.', type: 'error' });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        onNotification({ title: 'Invalid Amount', message: 'Please enter a valid, positive budget amount.', type: 'error' });
        return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    let error;
    if (editingBudget) {
      // Update existing budget
      const { error: updateError } = await supabase
        .from('budgets')
        .update({
          amount: parsedAmount,
          category_id: parseInt(categoryId, 10),
          start_date: startDate,
          end_date: endDate,
        })
        .eq('id', editingBudget.id);
      error = updateError;
    } else {
      // Insert new budget
      const { error: insertError } = await supabase
        .from('budgets')
        .insert([{
          amount: parsedAmount,
          category_id: parseInt(categoryId, 10),
          start_date: startDate,
          end_date: endDate,
          user_id: user.id,
        }]);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      console.error('Error saving budget:', error);
      onNotification({ title: 'Error', message: `Error saving budget: ${error.message}`, type: 'error' });
    } else {
      onNotification({ title: 'Success!', message: `Budget ${editingBudget ? 'updated' : 'added'} successfully!`, type: 'success' });
      setAmount('');
      setCategoryId('');
      setStartDate('');
      setEndDate('');
      setEditingBudget(null); // Clear editing state
    }
  };

  const handleCancelEdit = () => {
    setEditingBudget(null);
  };

  return (
    <div className="budget-form-container">
      <h3>{editingBudget ? 'Edit Budget' : 'New Budget'}</h3>
      <form onSubmit={handleSubmit} className="budget-form">
        <div className="form-group">
          <label htmlFor="budget-amount">Amount</label>
          <input
            id="budget-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 500"
          />
        </div>
        <div className="form-group">
          <label htmlFor="budget-category">Category</label>
          <select id="budget-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="" disabled>Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
        </div>
        <div className="form-group">
          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (editingBudget ? 'Update Budget' : 'Add Budget')}
        </button>
        {editingBudget && (
          <button type="button" onClick={handleCancelEdit} disabled={loading} className="cancel-button">
            Cancel Edit
          </button>
        )}
      </form>
    </div>
  );
}

export default BudgetForm;