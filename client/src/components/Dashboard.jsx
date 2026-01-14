import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useI18n } from '../i18n/I18nContext';
import Modal from './Modal';

function Dashboard({ user, onLogout }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioType, setNewScenarioType] = useState('milk_sale');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, scenarioId: null, scenarioName: '' });
  const menuRefs = useRef({});

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios');
      setScenarios(response.data);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async (e) => {
    e.preventDefault();
    try {
      await api.post('/scenarios', {
        name: newScenarioName,
        type: newScenarioType,
      });
      setNewScenarioName('');
      setShowCreateForm(false);
      loadScenarios();
    } catch (error) {
      alert(error.response?.data?.error || t('errorCreatingScenario'));
    }
  };

  const handleDuplicateScenario = async (scenarioId) => {
    try {
      await api.post(`/scenarios/${scenarioId}/duplicate`);
      loadScenarios();
    } catch (error) {
      alert(error.response?.data?.error || t('errorDuplicatingScenario'));
    }
  };

  const handleDeleteClick = (scenarioId, scenarioName) => {
    setDeleteModal({ isOpen: true, scenarioId, scenarioName });
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.scenarioId) return;

    try {
      await api.delete(`/scenarios/${deleteModal.scenarioId}`);
      loadScenarios();
      setDeleteModal({ isOpen: false, scenarioId: null, scenarioName: '' });
    } catch (error) {
      alert(error.response?.data?.error || t('errorDeletingScenario'));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, scenarioId: null, scenarioName: '' });
  };

  const getModulePath = (type) => {
    const typeMap = {
      milk_sale: '/module1',
      transformation: '/module2',
      lactation: '/module3',
      yield: '/module4',
      summary: '/module5',
    };
    return typeMap[type] || '/dashboard';
  };

  const getModuleName = (type) => {
    return t(`moduleTypes.${type}`) || type;
  };

  const getModuleColor = (type) => {
    const colorMap = {
      milk_sale: '#4CAF50',
      transformation: '#4a7c2a',
      lactation: '#FF9800',
      yield: '#9C27B0',
      summary: '#F44336'
    };
    return colorMap[type] || '#6c757d';
  };

  const getModuleIcon = (type) => {
    const iconMap = {
      milk_sale: '🥛',
      transformation: '🧀',
      lactation: '🐄',
      yield: '📊',
      summary: '📈'
    };
    return iconMap[type] || '📋';
  };

  // Configurable menu items - easily extendable
  const getMenuItems = (scenario) => {
    return [
      {
        id: 'duplicate',
        label: t('duplicate'),
        icon: '📋',
        action: 'duplicate',
        danger: false
      },
      {
        id: 'delete',
        label: t('delete'),
        icon: '🗑️',
        action: 'delete',
        danger: true
      }
      // Add more menu items here as needed
      // Example:
      // {
      //   id: 'edit',
      //   label: t('edit'),
      //   icon: '✏️',
      //   action: 'edit',
      //   danger: false
      // }
    ];
  };

  // Filter scenarios
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || scenario.type === filterType;
    return matchesSearch && matchesType;
  });

  // Handle card click
  const handleCardClick = (scenario) => {
    const path = getModulePath(scenario.type);
    navigate(path, { state: { scenarioId: scenario.id } });
  };

  // Handle menu toggle
  const handleMenuToggle = (e, scenarioId) => {
    e.stopPropagation(); // Prevent card click
    setOpenMenuId(openMenuId === scenarioId ? null : scenarioId);
  };

  // Handle menu action
  const handleMenuAction = (e, scenarioId, action) => {
    e.stopPropagation(); // Prevent card click
    setOpenMenuId(null);
    
    if (action === 'duplicate') {
      handleDuplicateScenario(scenarioId);
    } else if (action === 'delete') {
      const scenario = scenarios.find(s => s.id === scenarioId);
      handleDeleteClick(scenarioId, scenario?.name || '');
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  return (
    <div className="container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">{t('myScenarios')}</h1>
          <p className="page-subtitle">{scenarios.length} {scenarios.length === 1 ? t('scenarioSingular') : t('scenarios')}</p>
        </div>
        <button
          className="btn btn-primary btn-icon"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <span className="btn-icon-text">+</span>
          {showCreateForm ? t('cancel') : t('newScenario')}
        </button>
      </div>

      {showCreateForm && (
        <div className="card card-form">
          <h3 className="form-title">{t('createScenario')}</h3>
          <form onSubmit={handleCreateScenario}>
            <div className="form-group">
              <label>{t('scenarioName')}</label>
              <input
                type="text"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                required
                placeholder={t('scenarioNamePlaceholder')}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>{t('moduleType')}</label>
              <select 
                value={newScenarioType} 
                onChange={(e) => setNewScenarioType(e.target.value)}
                className="form-select"
              >
                <option value="milk_sale">{t('moduleTypes.milk_sale')}</option>
                <option value="transformation">{t('moduleTypes.transformation')}</option>
                <option value="lactation">{t('moduleTypes.lactation')}</option>
                <option value="yield">{t('moduleTypes.yield')}</option>
                <option value="summary">{t('moduleTypes.summary')}</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                {t('cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('createScenario')}
              </button>
            </div>
          </form>
        </div>
      )}

      {!showCreateForm && scenarios.length > 0 && (
        <div className="card card-filters">
          <div className="filters-container">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder={t('searchScenarios')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t('allTypes')}</option>
              <option value="milk_sale">{t('moduleTypes.milk_sale')}</option>
              <option value="transformation">{t('moduleTypes.transformation')}</option>
              <option value="lactation">{t('moduleTypes.lactation')}</option>
              <option value="yield">{t('moduleTypes.yield')}</option>
              <option value="summary">{t('moduleTypes.summary')}</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t('loadingScenarios')}</p>
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="card card-empty">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>{scenarios.length === 0 ? t('noScenarios') : t('noResults')}</h3>
            <p>{scenarios.length === 0 ? t('getStarted') : t('tryAdjustingSearch')}</p>
            {scenarios.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
                {t('createScenario')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="scenarios-grid">
          {filteredScenarios.map((scenario) => (
            <div 
              key={scenario.id} 
              className="scenario-card clickable-card"
              onClick={() => handleCardClick(scenario)}
            >
              <div className="scenario-header">
                <div className="scenario-icon" style={{ backgroundColor: `${getModuleColor(scenario.type)}20`, color: getModuleColor(scenario.type) }}>
                  {getModuleIcon(scenario.type)}
                </div>
                <div className="scenario-info">
                  <h3 className="scenario-name">{scenario.name}</h3>
                  <span className="scenario-badge" style={{ backgroundColor: `${getModuleColor(scenario.type)}15`, color: getModuleColor(scenario.type) }}>
                    {getModuleName(scenario.type)}
                  </span>
                </div>
                <div 
                  className="scenario-menu-container"
                  ref={el => menuRefs.current[scenario.id] = el}
                  onClick={(e) => handleMenuToggle(e, scenario.id)}
                >
                  <button className="scenario-menu-button" title="More options">
                    <span className="menu-dots">⋯</span>
                  </button>
                  {openMenuId === scenario.id && (
                    <div className="scenario-menu-dropdown">
                      {getMenuItems(scenario).map((item) => (
                        <button
                          key={item.id}
                          className={`menu-item ${item.danger ? 'menu-item-danger' : ''}`}
                          onClick={(e) => handleMenuAction(e, scenario.id, item.action)}
                        >
                          <span className="menu-icon">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="scenario-meta">
                <span className="meta-item">
                  <span className="meta-label">📅 {t('created')}:</span>
                  <span className="meta-value">{new Date(scenario.created_at).toLocaleDateString()}</span>
                </span>
                {scenario.updated_at && scenario.updated_at !== scenario.created_at && (
                  <span className="meta-item">
                    <span className="meta-label">🔄 {t('updated')}:</span>
                    <span className="meta-value">{new Date(scenario.updated_at).toLocaleDateString()}</span>
                  </span>
                )}
                <span className="meta-item">
                  <span className="meta-label">📝 {t('status')}:</span>
                  <span className="meta-value" style={{ 
                    color: scenario.updated_at && scenario.updated_at !== scenario.created_at ? '#059669' : '#6b7280',
                    fontWeight: '500'
                  }}>
                    {scenario.updated_at && scenario.updated_at !== scenario.created_at ? t('editableWithData') : t('new')}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('deleteScenario')}
        message={
          <>
            <strong>{t('deleteConfirm')}</strong>
            {deleteModal.scenarioName && (
              <span style={{ display: 'block', marginTop: '8px', fontWeight: '600', color: '#111827' }}>
                "{deleteModal.scenarioName}"
              </span>
            )}
            <span style={{ display: 'block', marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
              {t('deleteConfirmMessage')}
            </span>
          </>
        }
        confirmText={t('delete')}
        cancelText={t('cancel')}
        type="danger"
      />
    </div>
  );
}

export default Dashboard;
