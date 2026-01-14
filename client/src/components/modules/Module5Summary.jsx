import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';

function Module5Summary({ user }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios');
      setScenarios(response.data);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  };

  const handleCompare = async () => {
    if (selectedScenarios.length < 2) {
      setAlertModal({
        isOpen: true,
        message: t('selectAtLeast2'),
        type: 'info'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/scenarios/compare', {
        scenarioIds: selectedScenarios,
      });
      setComparison(response.data);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorComparing'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const comparisonData = comparison ? comparison.map(item => ({
    name: item.scenario.name,
    [t('income')]: Number(item.results.totalRevenue || 0),
    [t('totalCosts')]: Number(item.results.totalCosts || 0),
    [t('margin')]: Number(item.results.grossMargin || 0),
    [t('marginPercentage')]: Number(item.results.marginPercentage || 0),
  })) : [];

  const revenueData = comparison ? comparison.map(item => ({
    name: item.scenario.name,
    [t('income')]: Number(item.results.totalRevenue || 0),
  })) : [];

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          {t('backToDashboard')}
        </button>
        <h1 style={{ marginTop: '20px' }}>{t('module5Title')}</h1>
      </header>

      <div className="card">
        <h2>{t('compareScenarios')}</h2>
        <p style={{ marginBottom: '15px' }}>
          {t('selectMultipleScenarios')}
        </p>

        <div style={{ marginBottom: '20px' }}>
          {scenarios.map(scenario => (
            <label
              key={scenario.id}
              style={{
                display: 'block',
                padding: '10px',
                marginBottom: '10px',
                background: selectedScenarios.includes(scenario.id) ? '#e3f2fd' : '#f5f5f5',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedScenarios.includes(scenario.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedScenarios([...selectedScenarios, scenario.id]);
                  } else {
                    setSelectedScenarios(selectedScenarios.filter(id => id !== scenario.id));
                  }
                }}
                style={{ marginRight: '10px' }}
              />
              {scenario.name} ({t(`moduleTypes.${scenario.type}`) || scenario.type})
            </label>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCompare}
          disabled={loading || selectedScenarios.length < 2}
        >
          {loading ? t('comparing') : t('compareScenarios')}
        </button>
      </div>

      {comparison && (
        <>
          <div className="card">
            <h2>{t('comparisonResults')}</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('scenario')}</th>
                  <th>{t('productionL')}</th>
                  <th>{t('income')}</th>
                  <th>{t('totalCosts')}</th>
                  <th>{t('grossMargin')}</th>
                  <th>{t('marginPercentage')}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((item, index) => (
                  <tr key={index}>
                    <td><strong>{item.scenario.name}</strong></td>
                    <td>{Number(item.results.totalProductionLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>${Number(item.results.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>${Number(item.results.totalCosts || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>${Number(item.results.grossMargin || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{Number(item.results.marginPercentage || 0).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>{t('comparativeVisualization')}</h2>
            <h3 style={{ marginBottom: '15px' }}>{t('incomeCostsAndMargins')}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value || 0).toLocaleString(undefined)}`} />
                <Legend />
                <Bar dataKey={t('income')} fill="#8884d8" />
                <Bar dataKey={t('totalCosts')} fill="#ffc658" />
                <Bar dataKey={t('margin')} fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('incomeComparison')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value || 0).toLocaleString(undefined)}`} />
                <Legend />
                <Line type="monotone" dataKey={t('income')} stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('marginsByScenario')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value || 0).toFixed(2)}%`} />
                <Legend />
                <Bar dataKey={t('marginPercentage')} fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2>{t('executiveSummary')}</h2>
            {comparison.length > 0 && (
              <div>
                <p><strong>{t('bestScenarioByIncome')}:</strong> {
                  comparison.reduce((best, current) => 
                    Number(current.results.totalRevenue || 0) > Number(best.results.totalRevenue || 0) ? current : best
                  ).scenario.name
                }</p>
                <p><strong>{t('bestScenarioByMargin')}:</strong> {
                  comparison.reduce((best, current) => 
                    Number(current.results.grossMargin || 0) > Number(best.results.grossMargin || 0) ? current : best
                  ).scenario.name
                }</p>
                <p><strong>{t('bestScenarioByMarginPercent')}:</strong> {
                  comparison.reduce((best, current) => 
                    Number(current.results.marginPercentage || 0) > Number(best.results.marginPercentage || 0) ? current : best
                  ).scenario.name
                }</p>
              </div>
            )}
          </div>
        </>
      )}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.type === 'success' ? t('success') : alertModal.type === 'error' ? t('error') : t('information') || 'Information'}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

export default Module5Summary;
