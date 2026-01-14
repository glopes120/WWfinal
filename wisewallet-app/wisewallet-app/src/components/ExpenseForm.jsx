import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './ExpenseForm.css';

function ExpenseForm({ onNotification }) {
  const [transactionType, setTransactionType] = useState('expense'); // 'expense' or 'income'
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [incomeCategoryId, setIncomeCategoryId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const setupCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name');
        
        if (error) throw error;

        if (data) {
          const incomeCategory = data.find(cat => cat.name.trim().toLowerCase() === 'income');
          if (incomeCategory) {
            setIncomeCategoryId(incomeCategory.id);
          } else {
            const { data: newCategoryData, error: newCategoryError } = await supabase
              .from('categories')
              .insert([{ name: 'Income' }])
              .select();
            if (newCategoryError) throw newCategoryError;
            setIncomeCategoryId(newCategoryData[0].id);
          }
          setCategories(data.filter(cat => cat.name.trim().toLowerCase() !== 'income'));
        }
      } catch (error) {
        console.error('Error setting up categories:', error);
        onNotification({ title: 'Error', message: 'Could not load categories.', type: 'error' });
      }
    };

    setupCategories();
  }, [onNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description || !amount) {
      onNotification({ title: 'Missing Fields', message: 'Please fill out all fields.', type: 'error' });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        onNotification({ title: 'Invalid Amount', message: 'Please enter a valid, positive amount.', type: 'error' });
        setLoading(false);
        return;
    }

    const isExpense = transactionType === 'expense';
    if (isExpense && (!categoryId || isNaN(parseInt(categoryId, 10)))) {
        onNotification({ title: 'Invalid Category', message: 'Please select a valid category for the expense.', type: 'error' });
        setLoading(false);
        return;
    }

    if (!isExpense && !incomeCategoryId) {
        onNotification({ title: 'Setup Error', message: 'The "Income" category is not set up correctly.', type: 'error' });
        setLoading(false);
        return;
    }

    const finalCategoryId = isExpense ? parseInt(categoryId, 10) : incomeCategoryId;

    const { error } = await supabase
        .from('expenses')
        .insert([{
            description,
            amount: parsedAmount,
            category_id: finalCategoryId,
            user_id: user.id,
            expense_date: new Date().toISOString(),
        }]);

    setLoading(false);

    if (error) {
        onNotification({ title: 'Error', message: error.message, type: 'error' });
    } else {
        onNotification({ title: 'Success!', message: `${isExpense ? 'Expense' : 'Income'} added successfully!`, type: 'success' });
        setDescription('');
        setAmount('');
        setCategoryId('');
    }
  };

  return (
    <div className="expense-form-container">
      <h3>Register</h3>
      <div className="transaction-type-selector">
        <button
          className={transactionType === 'expense' ? 'active' : ''}
          onClick={() => setTransactionType('expense')}
        >
          Expense
        </button>
        <button
          className={transactionType === 'income' ? 'active' : ''}
          onClick={() => setTransactionType('income')}
        >
          Income
        </button>
      </div>
      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-group">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
        </div>
        <div className="form-group">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
        </div>
        {transactionType === 'expense' && (
          <div className="form-group">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="" disabled>Select a category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}

export default ExpenseForm;