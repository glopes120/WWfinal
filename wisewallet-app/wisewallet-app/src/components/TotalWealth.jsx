
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './TotalWealth.css';

function TotalWealth() {
  const [totalWealth, setTotalWealth] = useState(0);
  const [availableCash, setAvailableCash] = useState(0);
  const [savings, setSavings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWealth = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Authenticated user ID:', user?.id);

        if (user) {
          const { data, error } = await supabase
            .from('wealth')
            .select('cash, savings')
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error;
          }

          if (data) {
            const cash = data.cash || 0;
            const savings = data.savings || 0;
            setAvailableCash(cash);
            setSavings(savings);
            setTotalWealth(cash + savings);
          }
        }
      } catch (error) {
        console.error('Error fetching wealth data:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
      } finally {
        setLoading(false);
      }
    };

    fetchWealth();
  }, []);

  if (loading) {
    return <div className="total-wealth-container"><h3>Total Wealth</h3><p>Loading...</p></div>;
  }

  return (
    <div className="total-wealth-container">
      <div className="total-wealth-header">
        <h3>Total Wealth</h3>
        <span className="total-wealth-amount">${totalWealth.toLocaleString()}</span>
      </div>
      <div className="wealth-details">
        <div className="wealth-item">
          <span className="wealth-label">Available Cash</span>
          <span className="wealth-value">${availableCash.toLocaleString()}</span>
        </div>
        <div className="wealth-item">
          <span className="wealth-label">Savings</span>
          <span className="wealth-value">${savings.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default TotalWealth;
