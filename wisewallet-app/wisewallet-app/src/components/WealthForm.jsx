import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './WealthForm.css';

function WealthForm({ onNotification }) {
  const [cash, setCash] = useState('');
  const [savings, setSavings] = useState('');
  const [allocated, setAllocated] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWealthData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch Wealth
        const { data, error } = await supabase
          .from('wealth')
          .select('cash, savings')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching wealth data:', error);
          onNotification({ title: 'Error', message: 'Could not load wealth data.', type: 'error' });
        }

        if (data) {
          setCash(data.cash || '');
          setSavings(data.savings || '');
        }

        // Fetch Accounts for Allocation Check
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('balance, type')
          .eq('user_id', user.id);

        if (accountsData) {
            const totalAllocated = accountsData.reduce((sum, acc) => {
                // Only count positive assets (exclude credit cards/debt) for allocation logic
                if (acc.type !== 'credit' && acc.type !== 'Credit') {
                    return sum + (parseFloat(acc.balance) || 0);
                }
                return sum;
            }, 0);
            setAllocated(totalAllocated);
        }
      }
    };
    fetchWealthData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cash && !savings) {
      onNotification({ title: 'Missing Fields', message: 'Please fill out at least one field.', type: 'error' });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('wealth')
        .upsert({
            user_id: user.id,
            cash: cash ? parseFloat(cash) : 0,
            savings: savings ? parseFloat(savings) : 0,
        }, { onConflict: 'user_id' });
    
    setLoading(false);

    if (error) {
        onNotification({ title: 'Error', message: `Error saving wealth: ${error.message}`, type: 'error' });
    } else {
        onNotification({ title: 'Success!', message: 'Wealth data saved successfully!', type: 'success' });
    }
  };

  const currentTotal = (parseFloat(cash) || 0) + (parseFloat(savings) || 0);
  const remaining = currentTotal - allocated;

  return (
    <div className="wealth-form-container">
      <h3>Update Your Wealth</h3>
      
      <div className="allocation-info" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#9ca3af' }}>Already Allocated in Accounts:</span>
            <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>${allocated.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
            <span style={{ color: '#d1d5db' }}>Remaining Unallocated:</span>
            <span style={{ fontWeight: 'bold', color: remaining >= 0 ? '#34d399' : '#f87171' }}>
                ${remaining.toLocaleString()}
            </span>
        </div>
        {remaining < 0 && (
            <p style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '0.5rem' }}>
                * Warning: You have allocated more money in your accounts than you are declaring here.
            </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="wealth-form">
        <div className="form-group">
          <label htmlFor="available-cash">Available Cash</label>
          <input
            id="available-cash"
            type="number"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            placeholder="Available Cash"
          />
        </div>
        <div className="form-group">
          <label htmlFor="total-savings">Total Savings</label>
          <input
            id="total-savings"
            type="number"
            value={savings}
            onChange={(e) => setSavings(e.target.value)}
            placeholder="Total Savings"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Wealth'}
        </button>
      </form>
    </div>
  );
}

export default WealthForm;