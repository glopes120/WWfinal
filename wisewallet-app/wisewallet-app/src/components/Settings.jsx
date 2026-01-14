// Note: This component requires a Supabase bucket named "avatars" with public access.
// You also need to configure RLS policies to allow authenticated users to upload and update their own avatars.
// Example RLS policy for insert:
// (bucket_id = 'avatars'::text) AND (auth.uid() = (storage.foldername(name))[1])
// Example RLS policy for update:
// (bucket_id = 'avatars'::text) AND (auth.uid() = (storage.foldername(name))[1])
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../contexts/AppContext';
import './Settings.css';
import countries from '../countries.json';
import Categories from './Categories.jsx';

export default function Settings({ user, setView, refreshSession }) {
  const { theme, toggleTheme, hideBalances, setHideBalances } = useAppContext();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Profile data
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    bio: ''
  });
  const [editData, setEditData] = useState({ ...profileData });
  const [phonePrefix, setPhonePrefix] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      const userProfile = {
        full_name: user.user_metadata?.full_name || '',
        email: user.email,
        phone: user.user_metadata?.phone || '',
        location: user.user_metadata?.location || '',
        bio: user.user_metadata?.bio || ''
      };
      setProfileData(userProfile);
      setEditData(userProfile);
      setAvatarUrl(user.user_metadata?.avatar_url);

      if (userProfile.phone) {
        const phoneStr = userProfile.phone.toString();
        const country = countries.find(c => phoneStr.startsWith(`+${c.phone}`));
        if (country) {
          setPhonePrefix(country.phone);
          const numberPart = phoneStr.substring(`+${country.phone}`.length);
          setPhoneNumber(numberPart || '');
        } else {
          setPhoneNumber(phoneStr.replace(/^\+/, '') || '');
        }
      } else {
        setPhonePrefix('');
        setPhoneNumber('');
      }
    }
  }, [user]);

  const handleResetData = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
        // Delete all data related to the user in parallel
        await Promise.all([
            supabase.from('expenses').delete().eq('user_id', user.id),
            supabase.from('accounts').delete().eq('user_id', user.id),
            supabase.from('financial_goals').delete().eq('user_id', user.id),
            supabase.from('portfolio_investments').delete().eq('user_id', user.id),
            supabase.from('budgets').delete().eq('user_id', user.id),
            // Add other tables if necessary
        ]);
        alert('All data reset successfully!');
        setShowResetModal(false);
        refreshSession(); // Reload data
    } catch (error) {
        console.error('Error resetting data:', error);
        alert('Failed to reset data: ' + error.message);
    } finally {
        setIsResetting(false);
    }
  };

  const handleCleanupCategories = async () => {
    if (!confirm('This will delete all categories with Portuguese names (e.g., Comida, Casa). Continue?')) return;
    
    const portugueseNames = [
        'Comida', 'Alimentação', 'Casa', 'Habitação', 'Transporte', 'Lazer', 'Entretenimento', 
        'Saúde', 'Educação', 'Compras', 'Investimentos', 'Salário', 'Outros', 'Despesas', 'Renda', 'Geral'
    ];

    try {
        // 1. Fetch all categories
        const { data: allCategories, error: fetchError } = await supabase.from('categories').select('id, name');
        if (fetchError) throw fetchError;

        // 2. Filter for Portuguese ones
        const toDelete = allCategories.filter(c => portugueseNames.includes(c.name) || portugueseNames.includes(c.name.trim()));
        
        if (toDelete.length === 0) {
            alert('No Portuguese categories found.');
            return;
        }

        const ids = toDelete.map(c => c.id);

        // 3. Delete them
        // Note: This might fail if transactions are linked.
        const { error: deleteError } = await supabase.from('categories').delete().in('id', ids);

        if (deleteError) {
             if (deleteError.code === '23503') {
                 alert('Could not delete some categories because they have transactions linked to them. Please delete the transactions first or reassign them.');
             } else {
                 throw deleteError;
             }
        } else {
            alert(`Successfully deleted ${toDelete.length} categories: ${toDelete.map(c => c.name).join(', ')}`);
            refreshSession();
        }

    } catch (error) {
        console.error('Error cleaning up:', error);
        alert('Error: ' + error.message);
    }
  };

  const handleResendConfirmation = async () => {
    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        redirectTo: 'http://localhost:3000/login'
      }
    });
    if (error) {
      alert('Error resending confirmation email: ' + error.message);
    } else {
      alert('Confirmation email sent successfully!');
    }
    setIsResending(false);
  };

  const handleSaveProfile = async () => {
    const fullPhoneNumber = (phonePrefix && phoneNumber) ? `+${phonePrefix}${phoneNumber}` : '';
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: editData.full_name,
        phone: fullPhoneNumber || null,
        location: editData.location,
        bio: editData.bio
      }
    })

    if (error) {
      console.error('Error updating profile:', error);
      alert('Error updating the profile: ' + error.message)
    } else {
        setProfileData({ ...editData, phone: fullPhoneNumber });
        alert('Profile updated successfully!')
        refreshSession(); // Refresh session after successful update
    }
    setShowEditProfile(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${fileName}`;

    let { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert('Error uploading avatar: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl }, error: urlError } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (urlError) {
      alert('Error getting avatar URL: ' + urlError.message);
      setUploading(false);
      return;
    }
    
    const { data, error: updateUserError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
    })

    if(updateUserError){
        console.error('Error updating avatar url in user_metadata:', updateUserError);
        alert('Error updating avatar url: ' + updateUserError.message);
        setUploading(false);
        return;
    }

    setAvatarUrl(publicUrl);
    setProfileImage(publicUrl);
    setUploading(false);
    alert('Avatar updated successfully!');
    refreshSession(); // Refresh session after successful update
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button 
          onClick={() => setView ? setView('Dashboard') : window.history.back()}
          className="settings-back-btn"
        >
          ←
        </button>
        <h1 className="settings-title">Settings</h1>
        <div style={{ width: 'clamp(2rem, 2.5vw + 1rem, 2.5rem)' }}></div>
      </div>

      {/* Account Settings */}
      <h2 className="section-title">Account Settings</h2>
      <div className="settings-section">
        
        <div className="setting-item">
            <div className="profile-display">
              <div className="profile-avatar">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" />
                ) : (
                  <img src={avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${profileData.email}`} alt="Profile" />
                )}
              </div>
              <div className="profile-info">
                <p className="profile-name">{profileData.full_name || 'User'}</p>
                <p className="profile-email">{profileData.email}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowEditProfile(true)}
              className="button-secondary"
            >
              Edit Profile
            </button>
        </div>

        <div className="setting-item">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-blue"><span>🔒</span></div>
                <div className="setting-info">
                  <p className="setting-label">Password</p>
                  <p className="setting-description">Last changed 3 months ago</p>
                </div>
            </div>
            <button className="button-secondary">
              Change
            </button>
        </div>

        <div className="setting-item">
          <div className="setting-content">
              <div className="setting-icon-wrapper icon-teal"><span>📧</span></div>
              <div className="setting-info">
                <p className="setting-label">Resend Confirmation</p>
                <p className="setting-description">
                  {user?.email_confirmed_at ? 'Email confirmed' : 'Email not confirmed'}
                </p>
              </div>
          </div>
          <button 
            onClick={handleResendConfirmation}
            className="button-secondary"
            disabled={isResending || !!user?.email_confirmed_at}
          >
            {isResending ? 'Resending...' : 'Resend'}
          </button>
        </div>

        <div className="setting-item">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-purple"><span>🛡️</span></div>
                <div className="setting-info">
                  <p className="setting-label">Two-Factor Auth</p>
                  <p className="setting-description">Add extra security</p>
                </div>
            </div>
            <button className="button-primary">
              Enable
            </button>
        </div>
      </div>

      {/* Preferences */}
      <h2 className="section-title">Preferences</h2>
      <div className="settings-section">
        
        <div className="setting-item">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-indigo"><span>🌙</span></div>
                <div className="setting-info">
                  <p className="setting-label">Dark Mode</p>
                  <p className="setting-description">Toggle dark theme</p>
                </div>
            </div>
            <button 
              onClick={toggleTheme}
              className={`toggle-button ${theme === 'dark' ? 'toggle-button-active' : ''}`}
            >
              {theme === 'dark' ? 'On' : 'Off'}
            </button>
        </div>

        <div className="setting-item">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-gray"><span>👁️</span></div>
                <div className="setting-info">
                  <p className="setting-label">Hide Balances</p>
                  <p className="setting-description">Hide sensitive info</p>
                </div>
            </div>
            <button 
              onClick={() => setHideBalances(!hideBalances)}
              className={`toggle-button ${hideBalances ? 'toggle-button-active' : ''}`}
            >
              {hideBalances ? 'On' : 'Off'}
            </button>
        </div>

        <div className="setting-item">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-orange"><span>🔔</span></div>
                <div className="setting-info">
                  <p className="setting-label">Notifications</p>
                  <p className="setting-description">Manage alerts</p>
                </div>
            </div>
            <button className="button-secondary">
              Configure
            </button>
        </div>

        <div className="setting-item">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-pink"><span>🏷️</span></div>
                <div className="setting-info">
                  <p className="setting-label">Categories</p>
                  <p className="setting-description">Manage categories</p>
                </div>
            </div>
            <button 
              onClick={() => setShowCategoriesModal(true)}
              className="button-secondary"
            >
              Manage
            </button>
        </div>
      </div>

      {/* Data & Privacy */}
      <h2 className="section-title">Data & Privacy</h2>
      <div className="settings-section">
        
        <div className="setting-item">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-green"><span>📥</span></div>
                <div className="setting-info">
                  <p className="setting-label">Data Export</p>
                  <p className="setting-description">Download your data</p>
                </div>
            </div>
            <button className="button-secondary button-icon">
              Export
            </button>
        </div>

        <div className="setting-item setting-item-danger">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-red"><span>🔄</span></div>
                <div className="setting-info">
                  <p className="setting-label">Reset Data</p>
                  <p className="setting-description">Clear all data</p>
                </div>
            </div>
            <button 
              onClick={() => setShowResetModal(true)}
              className="button-danger button-icon"
            >
              Reset
            </button>
        </div>

        <div className="setting-item">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-yellow"><span>🧹</span></div>
                <div className="setting-info">
                  <p className="setting-label">Cleanup Categories</p>
                  <p className="setting-description">Remove defaults</p>
                </div>
            </div>
            <button 
              onClick={handleCleanupCategories}
              className="button-secondary button-icon"
            >
              Cleanup
            </button>
        </div>

        <div className="setting-item setting-item-danger">
            <div className="setting-content">
                <div className="setting-icon-wrapper icon-red"><span>⚠️</span></div>
                <div className="setting-info">
                  <p className="setting-label">Delete Account</p>
                  <p className="setting-description">Permanently delete</p>
                </div>
            </div>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="button-danger button-icon"
            >
              Delete
            </button>
        </div>
      </div>



      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-backdrop" onClick={() => setShowEditProfile(false)}>
          <div className="edit-profile-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Profile</h2>
              <button onClick={() => setShowEditProfile(false)} className="modal-close-button">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="profile-picture-section">
                <div className="profile-picture-wrapper">
                  <div className="profile-avatar profile-avatar-large">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" />
                    ) : (
                      <img src={avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${profileData.email}`} alt="Profile" />
                    )}
                  </div>
                </div>
                <label className="change-photo-button">
                  {uploading ? 'Uploading...' : 'Change Photo'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="file-input-hidden" disabled={uploading} />
                </label>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    value={editData.full_name}
                    onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email"
                    value={editData.email}
                    disabled
                    className="form-input" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="phone-input-group">
                  <select
                    className="select-dropdown phone-prefix"
                    onChange={e => setPhonePrefix(e.target.value)}
                    value={phonePrefix || ''}
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country.code} value={country.phone}>
                        {country.flag} {country.name} (+{country.phone})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber || ''}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="form-input phone-number"
                    placeholder="Enter phone number"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <select 
                  className="select-dropdown" 
                  value={editData.location} 
                  onChange={e => setEditData({...editData, location: e.target.value})}
                >
                  {countries.map(country => (
                    <option key={country.code} value={country.name}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea 
                  value={editData.bio}
                  onChange={(e) => setEditData({...editData, bio: e.target.value})}
                  rows={4}
                  className="form-textarea" 
                  placeholder="Tell us about yourself..."
                />
                <p className="character-count">{editData.bio ? editData.bio.length : 0}/200 characters</p>
              </div>

              <div className="modal-actions">
                <button 
                  onClick={() => setShowEditProfile(false)}
                  className="modal-button-cancel"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="modal-button-submit"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Categories Modal */}
      {showCategoriesModal && (
        <div className="modal-backdrop" onClick={() => setShowCategoriesModal(false)}>
           <div className="edit-profile-modal categories-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                 <h2 className="modal-title">Manage Categories</h2>
                 <button onClick={() => setShowCategoriesModal(false)} className="modal-close-button">✕</button>
              </div>
              <div className="modal-body">
                 <Categories />
              </div>
           </div>
        </div>
      )}

      {/* Reset Data Modal */}
      {showResetModal && (
        <div className="modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-content">
              <div className="delete-icon-wrapper">
                <span className="delete-icon">🔄</span>
              </div>
              <h2 className="delete-title">Reset All Data?</h2>
              <p className="delete-description">This will delete all your transactions, accounts, budgets, goals, and portfolio items. Your user account and settings will remain. This cannot be undone.</p>
            </div>
            <div className="delete-actions">
              <button onClick={() => setShowResetModal(false)} className="delete-button-cancel">Cancel</button>
              <button onClick={handleResetData} className="delete-button-confirm" disabled={isResetting}>
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-content">
              <div className="delete-icon-wrapper">
                <span className="delete-icon">⚠️</span>
              </div>
              <h2 className="delete-title">Delete Account?</h2>
              <p className="delete-description">This action cannot be undone. All your data, including financial records, goals, and settings will be permanently deleted.</p>
            </div>
            <div className="delete-actions">
              <button onClick={() => setShowDeleteModal(false)} className="delete-button-cancel">Cancel</button>
              <button className="delete-button-confirm">Delete Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
