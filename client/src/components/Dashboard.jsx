import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useI18n } from '../i18n/I18nContext';

function Dashboard({ user, onLogout }) {
  const { t } = useI18n();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioType, setNewScenarioType] = useState('milk_sale');
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  const handleDeleteScenario = async (scenarioId) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await api.delete(`/scenarios/${scenarioId}`);
      loadScenarios();
    } catch (error) {
      alert(error.response?.data?.error || t('errorDeletingScenario'));
    }
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

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{t('myScenarios')}</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? t('cancel') : `+ ${t('newScenario')}`}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateScenario} style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
            <div className="form-group">
              <label>{t('scenarioName')}</label>
              <input
                type="text"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                required
                placeholder={t('scenarioNamePlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('moduleType')}</label>
              <select value={newScenarioType} onChange={(e) => setNewScenarioType(e.target.value)}>
                <option value="milk_sale">{t('moduleTypes.milk_sale')}</option>
                <option value="transformation">{t('moduleTypes.transformation')}</option>
                <option value="lactation">{t('moduleTypes.lactation')}</option>
                <option value="yield">{t('moduleTypes.yield')}</option>
                <option value="summary">{t('moduleTypes.summary')}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              {t('createScenario')}
            </button>
          </form>
        )}

        {loading ? (
          <p>{t('loadingScenarios')}</p>
        ) : scenarios.length === 0 ? (
          <p>{t('noScenarios')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('scenarioName')}</th>
                <th>{t('moduleType')}</th>
                <th>{t('creationDate')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => (
                <tr key={scenario.id}>
                  <td>{scenario.name}</td>
                  <td>{getModuleName(scenario.type)}</td>
                  <td>{new Date(scenario.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link
                      to={getModulePath(scenario.type)}
                      state={{ scenarioId: scenario.id }}
                      className="btn btn-primary"
                      style={{ marginRight: '5px', textDecoration: 'none', display: 'inline-block' }}
                    >
                      {t('open')}
                    </Link>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDuplicateScenario(scenario.id)}
                      style={{ marginRight: '5px' }}
                    >
                      {t('duplicate')}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteScenario(scenario.id)}
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
