import { useState } from 'react';
import './Sidebar.css';
import { supabase } from '../supabaseClient'; // Import Supabase client

const menuItems = [
  { icon: '🏠', label: 'Dashboard' },
  { icon: '💰', label: 'Budget' },
  { icon: '💼', label: 'Portfolio' },
  { icon: '🎯', label: 'Financial Goals' },
  { icon: '🤖', label: 'AI Advisor' },
  { icon: '🛒', label: 'Marketplace' },
  { icon: '📜', label: 'History' },
  { icon: '⚙️', label: 'Settings' },
];

export default function Sidebar({ onSelectMenuItem, activeItem, user, openAIAssistant }) {
  const [collapsed, setCollapsed] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error.message);
        // Optionally, you can add a notification here to inform the user
    }
    // Supabase's onAuthStateChange listener in App.jsx will handle session changes
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <span>W</span>
          </div>
          {!collapsed && <span className="logo-text">WiseWallet</span>}
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="collapse-btn"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <div className="user-profile">
        <div className="user-avatar">
          <img src={avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`} alt="User Avatar" />
        </div>
        {!collapsed && (
          <div className="user-info">
            <p className="user-name">{userName}</p>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onSelectMenuItem(item.label)}
            className={`nav-item ${activeItem === item.label ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
        
        {/* AI Chat Button */}
        <button
          onClick={openAIAssistant}
          className="nav-item"
          style={{ 
            color: '#0075FF',
            marginTop: '0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '0.75rem'
          }}
        >
          <span className="nav-icon">✨</span>
          {!collapsed && <span className="nav-label">Ask AI</span>}
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="footer-link" onClick={handleSignOut}>
          <span className="footer-icon">🚪</span>
          {!collapsed && <span className="footer-label">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}