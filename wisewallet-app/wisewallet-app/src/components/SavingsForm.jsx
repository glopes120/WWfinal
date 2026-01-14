import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './SavingsForm.css';

function SavingsForm() {
  const [savings, setSavings] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!savings) {
      alert('Please fill out the savings field.');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    let success = false;
    let errorMsg = null;

    // First, fetch the current wealth to not overwrite cash
    const { data: wealthData, error: fetchError } = await supabase
        .from('wealth')
        .select('cash')
        .eq('user_id', user.id)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Ignore 'not found' error
        errorMsg = fetchError.message;
    } else {
        const currentCash = wealthData ? wealthData.cash : 0;
        const { error } = await supabase
            .from('wealth')
            .upsert({
                user_id: user.id,
                cash: currentCash,
                savings: parseFloat(savings),
            }, { onConflict: 'user_id' });
        
        if (error) {
            errorMsg = error.message;
        } else {
            success = true;
        }
    }

    setLoading(false);

    let alertMessage = '';
    if (success) {
      alertMessage += 'Savings saved successfully!\n';
    }
    if (errorMsg) {
      alertMessage += `Error saving savings: ${errorMsg}\n`;
    }

    if (alertMessage) {
        alert(alertMessage);
        if (success) {
            setSavings('');
        }
    }
  };

  return (
    <div className="savings-form-container">
      <h3>Update Savings</h3>
      <form onSubmit={handleSubmit} className="savings-form">
        <div className="form-group">
          <input
            type="number"
            value={savings}
            onChange={(e) => setSavings(e.target.value)}
            placeholder="Total Savings"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Savings'}
        </button>
      </form>
    </div>
  );
}

export default SavingsForm;
