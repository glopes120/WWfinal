import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './TransactionForm.css';

function TransactionForm({ categories = [], incomeCategoryId, user, onDataRefresh, onNotification, onClose }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isExpense, setIsExpense] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out the income category for the expense dropdown
  const expenseCategories = categories.filter(c => c.id !== incomeCategoryId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      onNotification({ title: 'Error', message: 'You must be logged in.', type: 'error' });
      return;
    }
    if (!description || !amount || !date || (isExpense && !categoryId)) {
      onNotification({ title: 'Error', message: 'Please fill out all fields.', type: 'error' });
      return;
    }

    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      onNotification({ title: 'Error', message: 'Please enter a valid positive amount.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCategoryId = isExpense ? categoryId : incomeCategoryId;

      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          description,
          amount: transactionAmount,
          category_id: finalCategoryId,
          expense_date: date,
        });

      if (error) throw error;

      onNotification({ title: 'Success', message: 'Transaction added successfully!', type: 'success' });
      onDataRefresh(); // Refresh data in the parent component
      onClose(); // Close the modal on success
    } catch (error) {
      console.error('Error adding transaction:', error);
      onNotification({ 
        title: 'Error', 
        message: error.message || error.details || JSON.stringify(error) || 'Could not add transaction.', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="transaction-form-container">
      <h2 className="form-title">Add New Transaction</h2>
      <div className="type-toggle">
        <button
          className={`toggle-btn ${isExpense ? 'active' : ''}`}
          onClick={() => setIsExpense(true)}
        >
          Expense
        </button>
        <button
          className={`toggle-btn ${!isExpense ? 'active' : ''}`}
          onClick={() => setIsExpense(false)}
        >
          Income
        </button>
      </div>
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group description-group">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Coffee, Paycheck"
          />
        </div>
        
        {isExpense && (
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="" disabled>Select a category</option>
              {expenseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Transaction'}
            </button>
        </div>
      </form>
    </div>
  );
}

export default TransactionForm;