import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useI18n } from '../i18n/I18nContext';

function Login({ onLogin }) {
  const { t, language, changeLanguage } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister
        ? { email, password, name }
        : { email, password };

      const response = await api.post(endpoint, payload);
      onLogin(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || t('loginError');
      setError(typeof errorMessage === 'string' ? errorMessage : t('loginError'));
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-header">
        <Link to="/" className="login-logo-link">
          <div className="login-logo-container">
            <img src="/logo.png" alt="Livestock Simulators Logo" className="login-logo-image" />
          </div>
          <h1 className="login-title">{t('appTitle')}</h1>
        </Link>
        <div className="login-language-switcher">
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="login-language-select"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">
              {isRegister ? t('register') : t('login')}
            </h2>
            <p className="login-card-subtitle">
              {isRegister 
                ? t('noAccount')?.replace('¿No tienes cuenta? ', '') || 'Create your account'
                : t('alreadyHaveAccount')?.replace('¿Ya tienes cuenta? ', '') || 'Welcome back'
              }
            </p>
          </div>

          {error && (
            <div className="login-error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {isRegister && (
              <div className="form-group">
                <label>{t('name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('name')}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label>{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email')}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="login-loading">
                  <span className="login-spinner"></span>
                  {isRegister ? t('registering') : t('signingIn')}
                </span>
              ) : (
                isRegister ? t('register') : t('login')
              )}
            </button>
          </form>

          <div className="login-card-footer">
            <button
              type="button"
              className="login-toggle-btn"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setEmail('');
                setPassword('');
                setName('');
              }}
              disabled={loading}
            >
              {isRegister ? t('alreadyHaveAccount') : t('noAccount')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
