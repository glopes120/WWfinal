import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Profile.css';

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

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

  if (loading) {
    return <div className="profile-container"><h3>Profile</h3><p>Loading...</p></div>;
  }

  if (!user) {
    return <div className="profile-container"><h3>Profile</h3><p>Could not load profile data.</p></div>;
  }

  return (
    <div className="profile-container">
      <h3>Profile</h3>
      <div className="profile-info">
        <div className="info-item">
          <span className="info-label">Email</span>
          <span className="info-value">{user.email}</span>
        </div>
        <div className="info-item">
          <span className="info-label">User ID</span>
          <span className="info-value">{user.id}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Last Signed In</span>
          <span className="info-value">{new Date(user.last_sign_in_at).toLocaleString()}</span>
        </div>
      </div>
      <button onClick={handleLogout} className="logout-btn">
        Log Out
      </button>
    </div>
  );
}

export default Profile;