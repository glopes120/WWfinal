import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './SavingsGoals.css';
function SavingsGoals({ refreshTrigger }) {
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contributionAmounts, setContributionAmounts] = useState({}); // State to hold contribution amount for each goal
  const [error, setError] = useState(null);

  const fetchSavingsGoals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('savings_goals')
          .select('id, name, target_amount, current_amount')
        .eq('user_id', user.id);

      if (error) throw error;

      setSavingsGoals(data || []);
    } catch (err) {
      console.error('Error fetching savings goals:', err);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavingsGoals();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  const handleDeleteGoal = async (goalId) => {
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not logged in.');
      }

      const { error: deleteError } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id); // Ensure user can only delete their own goals

      if (deleteError) {
        throw deleteError;
      }

      fetchSavingsGoals(); // Refresh goals list
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError(err.message);
    }
  };

  const handleContribute = async (goal) => {
    setError(null);
    const amountToContribute = parseFloat(contributionAmounts[goal.id] || 0);

    if (isNaN(amountToContribute) || amountToContribute <= 0) {
      setError('Please enter a valid amount to contribute.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not logged in.');
      }

      const newAmount = goal.current_amount + amountToContribute;

      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: newAmount })
        .eq('id', goal.id)
        .eq('user_id', user.id); // Ensure user can only update their own goals

      if (updateError) {
        throw updateError;
      }

      // Check if goal is completed
      if (newAmount >= goal.target_amount) {
        const { error: insertCompletedError } = await supabase
          .from('completed_savings_goals')
          .insert({
            user_id: user.id,
            goal_name: goal.name,
            target_amount: goal.target_amount,
            completed_amount: newAmount,
          });

        if (insertCompletedError) {
          console.error('Error inserting completed goal:', insertCompletedError);
          // Decide how to handle this error - maybe don't delete from active goals if completion record fails
        }

        // Optionally, remove the goal from the active savings_goals table
        const { error: deleteError } = await supabase
          .from('savings_goals')
          .delete()
          .eq('id', goal.id)
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('Error deleting completed goal from active list:', deleteError);
        }
      }

      setContributionAmounts(prev => ({ ...prev, [goal.id]: '' })); // Clear input
      fetchSavingsGoals(); // Refresh goals list
    } catch (err) {
      console.error('Error contributing to goal:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="savings-goals-container"><h3>Savings Goals</h3><p>Loading...</p></div>;
  }

  return (
    <div className="savings-goals-container">
      <h3>Savings Goals</h3>
      {error && <p className="error-message">{error}</p>}
      {savingsGoals.length === 0 ? (
        <p>No savings goals set yet.</p>
      ) : (
        <div className="goals-list">
          {savingsGoals.map(goal => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            return (
              <div key={goal.id} className="goal-item">
                <div className="goal-header">
                  <span className="goal-name">{goal.name}</span>
                  <div className="goal-actions">
                    <span className="goal-amount">€{goal.current_amount.toFixed(2)} / €{goal.target_amount.toFixed(2)}</span>
                    <button onClick={() => handleDeleteGoal(goal.id)} className="delete-goal-button">Delete</button>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
                <span className="progress-percentage">{progress.toFixed(0)}%</span>
                <div className="contribute-section">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={contributionAmounts[goal.id] || ''}
                    onChange={(e) => setContributionAmounts(prev => ({ ...prev, [goal.id]: e.target.value }))}
                    step="0.01"
                  />
                  <button onClick={() => handleContribute(goal)}>Contribute</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SavingsGoals;
