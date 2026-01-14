import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './BottomNav.css';

const menuItems = [
  { icon: '🏠', label: 'Home', id: 'Dashboard' },
  { icon: '💰', label: 'Budget', id: 'Budget' },
  { icon: '💼', label: 'Portfolio', id: 'Portfolio' },
  { icon: '🎯', label: 'Goals', id: 'FinancialGoals' },
  { icon: '🤖', label: 'AI', id: 'AIAdvisor' },
];

// Items that go in "More" menu
const moreMenuItems = [
  { icon: '🛒', label: 'Marketplace', id: 'Marketplace' },
  { icon: '📜', label: 'History', id: 'History' },
  { icon: '⚙️', label: 'Settings', id: 'Settings' },
];

export default function BottomNav({ onSelectMenuItem, activeItem, user, openAIAssistant }) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const moreMenuRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showMoreMenu || showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMoreMenu, showProfileMenu]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* Top Header Bar - Mobile/Compact */}
      <header className="top-header-bar">
        <div className="top-header-left">
          <div className="top-header-logo">
            <div className="top-header-logo-icon">W</div>
            <span className="top-header-logo-text">WiseWallet</span>
          </div>
        </div>
        <div className="top-header-right" ref={profileMenuRef}>
          <div className="top-header-avatar" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <img 
              src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`} 
              alt="User" 
            />
          </div>
          
          {/* Profile Menu Dropdown */}
          {showProfileMenu && (
            <div className="profile-menu-dropdown">
              <div className="profile-menu-header">
                <div className="profile-menu-avatar-large">
                  <img 
                    src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`} 
                    alt="User" 
                  />
                </div>
                <div>
                  <div className="profile-menu-name">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</div>
                  <div className="profile-menu-email">{user?.email}</div>
                </div>
              </div>
              <div className="profile-menu-divider"></div>
              {moreMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectMenuItem(item.id);
                    setShowProfileMenu(false);
                  }}
                  className={`profile-menu-item ${activeItem === item.id ? 'active' : ''}`}
                >
                  <span className="profile-menu-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  openAIAssistant();
                  setShowProfileMenu(false);
                }}
                className="profile-menu-item"
              >
                <span className="profile-menu-icon">✨</span>
                <span>Ask AI</span>
              </button>
              <div className="profile-menu-divider"></div>
              <button
                onClick={() => {
                  handleSignOut();
                  setShowProfileMenu(false);
                }}
                className="profile-menu-item profile-menu-danger"
              >
                <span className="profile-menu-icon">🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Bottom Navigation Bar - Revolut Style */}
      <nav className="bottom-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSelectMenuItem(item.id);
              setShowMoreMenu(false);
            }}
            className={`bottom-nav-item ${activeItem === item.id ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        ))}
        
        {/* More Menu Button */}
        <div className="bottom-nav-more-container" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`bottom-nav-item bottom-nav-more ${(moreMenuItems.some(item => item.id === activeItem)) ? 'active' : ''} ${showMoreMenu ? 'menu-open' : ''}`}
          >
            <span className="bottom-nav-icon">•••</span>
            <span className="bottom-nav-label">More</span>
          </button>
          
          {/* More Menu Dropdown */}
          {showMoreMenu && (
            <div className="more-menu-dropdown">
              {moreMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectMenuItem(item.id);
                    setShowMoreMenu(false);
                  }}
                  className={`more-menu-item ${activeItem === item.id ? 'active' : ''}`}
                >
                  <span className="more-menu-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  openAIAssistant();
                  setShowMoreMenu(false);
                }}
                className="more-menu-item"
              >
                <span className="more-menu-icon">✨</span>
                <span>Ask AI</span>
              </button>
              <div className="more-menu-divider"></div>
              <button
                onClick={handleSignOut}
                className="more-menu-item more-menu-danger"
              >
                <span className="more-menu-icon">🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
