import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './CompletedSavingsGoals.css';

function CompletedSavingsGoals() {
  const [completedGoals, setCompletedGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompletedGoals = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('completed_savings_goals')
          .select('id, goal_name, target_amount, completed_amount, completion_date')
          .eq('user_id', user.id)
          .order('completion_date', { ascending: false });

        if (error) throw error;

        setCompletedGoals(data || []);
      } catch (err) {
        console.error('Error fetching completed goals:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedGoals();
  }, []);

  if (loading) {
    return <div className="loading-indicator">Loading completed goals...</div>;
  }

  if (error) {
    return <p className="no-data-message">Error: {error}</p>;
  }

  return (
    <div className="completed-goals-list">
      {completedGoals.length === 0 ? (
        <p className="no-data-message">No completed savings goals yet.</p>
      ) : (
        completedGoals.map(goal => (
          <div key={goal.id} className="goal-card">
            <div className="goal-icon">🏆</div>
            <div className="goal-details">
              <span className="goal-name">{goal.goal_name}</span>
              <span className="goal-amount-info">
                Achieved: <strong>€{goal.completed_amount.toFixed(2)}</strong> of €{goal.target_amount.toFixed(2)}
              </span>
            </div>
            <div className="goal-completion-info">
              <span className="goal-completion-date">
                Completed on: {new Date(goal.completion_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default CompletedSavingsGoals;