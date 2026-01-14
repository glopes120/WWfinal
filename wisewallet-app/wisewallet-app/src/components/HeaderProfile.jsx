
import React from 'react';
import { supabase } from '../supabaseClient';
import './HeaderProfile.css';

function HeaderProfile({ user }) {
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
      alert(`Could not log out: ${error.message}`);
    }
  };

  return (
    <div className="header-profile">
      <div className="profile-info">
        <img src="https://via.placeholder.com/40" alt="User Avatar" className="profile-avatar" />
        <span className="user-email">{user.email}</span>
      </div>
      <button onClick={handleLogout} className="logout-btn">
        Sair
      </button>
    </div>
  );
}

export default HeaderProfile;
