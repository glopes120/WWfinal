import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './UpdatePassword.css'; // Importa o novo CSS

export default function UpdatePassword({ onPasswordUpdated }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;
      
      setMessage('Password updated successfully! Redirecting...');
      
      // Small delay for the user to read the message
      setTimeout(() => {
        if (onPasswordUpdated) onPasswordUpdated();
      }, 2000);

    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="update-password-container">
      <div className="update-password-card">
        <div className="update-password-header">
          <h2>Set New Password</h2>
          <p>Choose a new secure password for your account.</p>
        </div>
        
        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="password-input"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <button type="submit" disabled={loading} className="update-btn">
            {loading ? 'Updating...' : 'Update Password'}
          </button>

          {message && (
            <p className={`feedback-message ${message.includes('successfully') ? 'success' : 'error'}`} style={{marginTop: '1rem', textAlign: 'center'}}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}