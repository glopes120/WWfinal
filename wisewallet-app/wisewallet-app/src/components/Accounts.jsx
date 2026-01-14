import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Accounts.css';

function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountsData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      let cashAmount = 0;
      let savingsAmount = 0;

      if (user) {
        const { data, error } = await supabase
          .from('wealth')
          .select('cash, savings')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching wealth data for accounts:', error);
        }
        if (data) {
          cashAmount = data.cash || 0;
          savingsAmount = data.savings || 0;
        }
      }

      // Create a static list and populate it with dynamic data where available
      const userAccounts = [
        {
          name: 'Main Checking',
          type: 'Checking',
          icon: '💳',
          iconBg: 'var(--blue)',
          balance: cashAmount,
        },
        {
          name: 'Savings',
          type: 'Savings',
          icon: '💰',
          iconBg: 'var(--green)',
          balance: savingsAmount,
        },
        {
          name: 'Investment Portfolio',
          type: 'Investment',
          icon: '📈',
          iconBg: 'var(--purple)',
          balance: 12530.78, // Placeholder
        },
        {
          name: 'Credit Card',
          type: 'Credit',
          icon: '💳',
          iconBg: 'var(--orange)',
          balance: -850.21, // Placeholder, negative
        },
      ];

      setAccounts(userAccounts);
      setLoading(false);
    };

    fetchAccountsData();
  }, []);

  if (loading) {
    return <p>Loading accounts...</p>;
  }

  return (
    <div className="accounts-container">
      {accounts.map((account, index) => (
        <div key={index} className="account-item">
          <span>{account.name} ({account.type})</span>
          <span className={`account-balance ${account.balance < 0 ? 'negative' : ''}`}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(account.balance)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default Accounts;
