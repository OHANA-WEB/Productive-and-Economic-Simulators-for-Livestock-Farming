import { useI18n } from '../i18n/I18nContext';
import { Link } from 'react-router-dom';
import { getAuthToken } from '../utils/auth';

function Header({ user, onLogout }) {
  const { t, language, changeLanguage } = useI18n();
  const isAuthenticated = !!getAuthToken();

  return (
    <header className="site-header">
      <div className="header-content">
        <div className="header-left">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo-link">
            <div className="logo-container">
              <img src="/logo.png" alt="MVP Web Logo" className="logo-image" />
            </div>
            <h1 className="site-title">{t('appTitle')}</h1>
          </Link>
        </div>
        <nav className="header-nav">
          {isAuthenticated && (
            <>
              <Link to="/dashboard" className="nav-link">
                {t('dashboard')}
              </Link>
            </>
          )}
        </nav>
        <div className="header-right">
          {isAuthenticated && user && (
            <span className="user-greeting">
              {t('hello')}, {user?.name || user?.email}
            </span>
          )}
          <div className="language-switcher">
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="language-select"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          {isAuthenticated && (
            <button className="btn btn-secondary" onClick={onLogout}>
              {t('logout')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section">
          <p className="footer-text">{t('footerText')}</p>
        </div>
        <div className="footer-links">
          <Link to="/about" className="footer-link">{t('about')}</Link>
          <Link to="/contact" className="footer-link">{t('contact')}</Link>
          <Link to="/privacy" className="footer-link">{t('privacy')}</Link>
          <Link to="/terms" className="footer-link">{t('terms')}</Link>
        </div>
      </div>
    </footer>
  );
}

function Layout({ children, user, onLogout }) {
  return (
    <div className="site-wrapper">
      <Header user={user} onLogout={onLogout} />
      <main className="site-main">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
