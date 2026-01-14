import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './SavingsGoalForm.css';

function SavingsGoalForm({ onGoalAdded, onNotification }) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !targetAmount) {
      onNotification({ title: 'Missing Fields', message: 'Please provide a name and target amount.', type: 'error' });
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not logged in.');
      }

      const { error: insertError } = await supabase
        .from('savings_goals')
        .insert({
          user_id: user.id,
          name,
          target_amount: parseFloat(targetAmount),
          current_amount: 0, // New goals start with 0 current amount
        });

      if (insertError) {
        throw insertError;
      }

      onNotification({ title: 'Success!', message: 'Savings goal added successfully!', type: 'success' });
      setName('');
      setTargetAmount('');
      if (onGoalAdded) {
        onGoalAdded(); // Notify parent component to refresh goals
      }
    } catch (err) {
      console.error('Error adding savings goal:', err);
      onNotification({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="savings-goal-form-container">
      <h3>Add New Savings Goal</h3>
      <form onSubmit={handleSubmit} className="savings-goal-form">
        <div className="form-group">
          <label htmlFor="goal-name">Goal Name</label>
          <input
            id="goal-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., New Car, Down Payment"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="target-amount">Target Amount</label>
          <input
            id="target-amount"
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="e.g., 10000"
            step="0.01"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Goal'}
        </button>
      </form>
    </div>
  );
}

export default SavingsGoalForm;
