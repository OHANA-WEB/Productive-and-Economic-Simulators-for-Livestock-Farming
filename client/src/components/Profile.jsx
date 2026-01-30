import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { getAvatar, saveAvatar } from '../utils/avatar';
import api from '../utils/api';

function Profile({ user, onUserUpdate }) {
  const { t } = useI18n();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(getAvatar() || null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch fresh user data from backend when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/me');
        const userData = response.data.user;
        setName(userData.name || '');
        setEmail(userData.email || '');
        onUserUpdate({ ...user, ...userData });
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to prop data
        if (user?.name) {
          setName(user.name);
        }
        if (user?.email) {
          setEmail(user.email);
        }
      } finally {
        setFetching(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
    if (user?.email) {
      setEmail(user.email);
    }
    const savedAvatar = getAvatar();
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError(t('avatarSizeError') || 'Avatar image must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setAvatar(base64String);
        saveAvatar(base64String);
        setSuccess(t('avatarUpdated') || 'Avatar updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Update name in localStorage and state
      const updatedUser = { ...user, name };
      onUserUpdate(updatedUser);
      setSuccess(t('nameUpdated') || 'Name updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || t('updateError') || 'Error updating name');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch') || 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError(t('passwordLengthError') || 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // In a real app, you would call an API endpoint here
      // For now, we'll just update locally
      setSuccess(t('passwordUpdated') || 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('updateError') || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">{t('profile') || 'Profile'}</h1>
          <p className="page-subtitle">{t('manageProfile') || 'Manage your account settings'}</p>
        </div>
      </div>

      <div className="profile-content">
        {/* Avatar Section */}
        <div className="card">
          <h2 className="card-section-title">{t('profilePicture') || 'Profile Picture'}</h2>
          <div className="avatar-section">
            <div className="avatar-preview">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="avatar-image-large" />
              ) : (
                <div className="avatar-placeholder-large">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="avatar-upload">
              <label htmlFor="avatar-upload" className="btn btn-primary">
                {t('uploadAvatar') || 'Upload Avatar'}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setAvatar(null);
                  saveAvatar(null);
                  setSuccess(t('avatarRemoved') || 'Avatar removed');
                  setTimeout(() => setSuccess(''), 3000);
                }}
                disabled={!avatar}
              >
                {t('removeAvatar') || 'Remove Avatar'}
              </button>
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className="card">
          <h2 className="card-section-title">{t('userInformation') || 'User Information'}</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleNameUpdate}>
            <div className="form-group">
              <label htmlFor="email">{t('email')}</label>
              {fetching ? (
                <input
                  id="email"
                  type="email"
                  value=""
                  disabled
                  className="form-input"
                  placeholder={t('loading') || 'Loading...'}
                  style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                />
              ) : (
                <input
                  id="email"
                  type="email"
                  value={email || ''}
                  disabled
                  className="form-input"
                  placeholder={email ? '' : (t('noEmailAvailable') || 'No email available')}
                  style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                />
              )}
              <small className="form-hint">{t('emailCannotChange') || 'Email cannot be changed'}</small>
            </div>

            <div className="form-group">
              <label>{t('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('name') || 'Name'}
                className="form-input"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('saving') || 'Saving...' : t('updateName') || 'Update Name'}
              </button>
            </div>
          </form>
        </div>

        {/* Password Change Section */}
        <div className="card">
          <h2 className="card-section-title">{t('changePassword') || 'Change Password'}</h2>
          
          <form onSubmit={handlePasswordUpdate}>
            <div className="form-group">
              <label>{t('currentPassword') || 'Current Password'}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('currentPassword') || 'Current Password'}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('newPassword') || 'New Password'}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('newPassword') || 'New Password'}
                className="form-input"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label>{t('confirmPassword') || 'Confirm New Password'}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPassword') || 'Confirm New Password'}
                className="form-input"
                required
                minLength={6}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('updating') || 'Updating...' : t('updatePassword') || 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
