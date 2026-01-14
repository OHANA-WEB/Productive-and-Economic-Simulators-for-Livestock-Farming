import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Link, useLocation } from 'react-router-dom';
import { getAuthToken } from '../utils/auth';

function Sidebar({ user, onLogout }) {
  const { t, language, changeLanguage } = useI18n();
  const location = useLocation();
  const isAuthenticated = !!getAuthToken();

  if (!isAuthenticated) return null;

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: t('dashboard') },
    { path: '/module1', icon: '🥛', label: t('moduleTypes.milk_sale') },
    { path: '/module2', icon: '🧀', label: t('moduleTypes.transformation') },
    { path: '/module3', icon: '🐄', label: t('moduleTypes.lactation') },
    { path: '/module4', icon: '📈', label: t('moduleTypes.yield') },
    { path: '/module5', icon: '📋', label: t('moduleTypes.summary') },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/dashboard" className="logo-link">
          <div className="logo-container">
            <img src="/logo.png" alt="Livestock Simulators Logo" className="logo-image" />
          </div>
          <h1 className="site-title">{t('appTitle')}</h1>
        </Link>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Settings({ showSidebar, setShowSidebar, showFooter, setShowFooter }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="settings-container" ref={settingsRef}>
      <button
        className="settings-button"
        onClick={() => setIsOpen(!isOpen)}
        title={t('settings') || 'Settings'}
      >
        ⚙️
      </button>
      {isOpen && (
        <div className="settings-dropdown">
          <div className="settings-header">
            <h3>{t('settings') || 'Settings'}</h3>
          </div>
          <div className="settings-content">
            <div className="settings-item">
              <label className="settings-label">
                <span>{t('showSidebar') || 'Show Sidebar'}</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showSidebar}
                    onChange={(e) => setShowSidebar(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
            <div className="settings-item">
              <label className="settings-label">
                <span>{t('showFooter') || 'Show Footer'}</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showFooter}
                    onChange={(e) => setShowFooter(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ user, onLogout, showSidebar, setShowSidebar, showFooter, setShowFooter }) {
  const { t, language, changeLanguage } = useI18n();
  const isAuthenticated = !!getAuthToken();
  const hasSidebar = isAuthenticated;

  return (
    <header className="site-header">
      <div className="header-content">
        {!hasSidebar && (
          <div className="header-left">
            <Link to="/" className="logo-link">
              <div className="logo-container">
                <img src="/logo.png" alt="Livestock Simulators Logo" className="logo-image" />
              </div>
              <h1 className="site-title">{t('appTitle')}</h1>
            </Link>
          </div>
        )}
        {hasSidebar && (
          <div className="header-left">
            <h1 className="site-title">{t('appTitle')}</h1>
          </div>
        )}
        <nav className="header-nav">
          {isAuthenticated && !hasSidebar && (
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
          {!isAuthenticated && (
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
          )}
          {isAuthenticated && (
            <>
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
              <Settings
                showSidebar={showSidebar}
                setShowSidebar={setShowSidebar}
                showFooter={showFooter}
                setShowFooter={setShowFooter}
              />
            </>
          )}
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
  const isAuthenticated = !!getAuthToken();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  
  // Load settings from localStorage
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem('showSidebar');
    return saved !== null ? saved === 'true' : true; // Default to true
  });
  
  const [showFooter, setShowFooter] = useState(() => {
    const saved = localStorage.getItem('showFooter');
    return saved !== null ? saved === 'true' : true; // Default to true
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('showSidebar', showSidebar.toString());
  }, [showSidebar]);

  useEffect(() => {
    localStorage.setItem('showFooter', showFooter.toString());
  }, [showFooter]);

  // Adjust grid layout based on sidebar and footer visibility
  let gridClass = isAuthenticated 
    ? showSidebar 
      ? 'site-wrapper with-sidebar' 
      : 'site-wrapper without-sidebar'
    : 'site-wrapper';
  
  if (!showFooter) {
    gridClass += ' no-footer';
  }
  
  if (isAuthenticated) {
    return (
      <div className={gridClass}>
        {showSidebar && <Sidebar user={user} onLogout={onLogout} />}
        <Header 
          user={user} 
          onLogout={onLogout}
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          showFooter={showFooter}
          setShowFooter={setShowFooter}
        />
        <main className="site-main">
          {children}
        </main>
        {showFooter && <Footer />}
      </div>
    );
  }
  
  // For login/registration page, don't show header and footer
  if (isLoginPage) {
    return (
      <div className="site-wrapper login-page">
        <main className="site-main">
          {children}
        </main>
      </div>
    );
  }
  
  return (
    <div className="site-wrapper">
      <Header 
        user={user} 
        onLogout={onLogout}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        showFooter={showFooter}
        setShowFooter={setShowFooter}
      />
      <main className="site-main">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

export default Layout;
