import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './ResetData.css';

function ResetData() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDeleteExpenseHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('User not authenticated.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      alert('Your expense history has been successfully deleted.');
    } catch (error) {
      console.error('Error deleting expense history:', error);
      alert('An error occurred while trying to delete your expense history.');
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  return (
    <div className="reset-data-container">
      <h2>Reset Expense History</h2>
      <p>
        This action is irreversible. All your expense records will be permanently deleted.
      </p>
      <button onClick={() => setShowConfirmation(true)} className="delete-button" disabled={loading}>
        {loading ? 'Deleting...' : 'Delete Expense History'}
      </button>

      {showConfirmation && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Are you sure?</h3>
            <p>Do you confirm that you want to delete all your expense history? This action cannot be undone.</p>
            <div className="confirmation-buttons">
              <button onClick={handleDeleteExpenseHistory} className="confirm-button" disabled={loading}>
                {loading ? 'Deleting...' : 'Yes, delete history'}
              </button>
              <button onClick={() => setShowConfirmation(false)} className="cancel-button" disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResetData;