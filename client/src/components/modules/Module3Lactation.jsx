import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';

function Module3Lactation({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

  const [productionData, setProductionData] = useState({
    daily_production_liters: 0,
    production_days: 0,
    animals_count: 0,
    milk_price_per_liter: 0,
  });

  const [lactationData, setLactationData] = useState({
    lactation_days: 0,
    dry_days: 0,
    productive_life_years: 0,
    replacement_rate: 0,
  });

  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });

  useEffect(() => {
    loadScenarios();
    if (scenarioId) {
      loadScenario(scenarioId);
    }
  }, [scenarioId]);

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios?type=lactation');
      setScenarios(response.data);
      if (scenarioId) {
        const scenario = response.data.find(s => s.id === parseInt(scenarioId));
        setSelectedScenario(scenario);
      }
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  };

  const loadScenario = async (id) => {
    try {
      const response = await api.get(`/scenarios/${id}`);
      const scenario = response.data;
      setSelectedScenario(scenario);
      if (scenario.productionData) {
        // Normalize all numeric values to ensure no leading zeros
        const normalizedData = {};
        Object.keys(scenario.productionData).forEach(key => {
          const value = scenario.productionData[key];
          if (typeof value === 'number') {
            normalizedData[key] = value;
          } else if (typeof value === 'string') {
            const numValue = parseFloat(value);
            normalizedData[key] = isNaN(numValue) ? 0 : numValue;
          } else {
            normalizedData[key] = value;
          }
        });
        setProductionData(normalizedData);
      }
      if (scenario.lactationData) {
        setLactationData(scenario.lactationData);
      }
      if (scenario.results) {
        setResults(scenario.results);
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleProductionChange = (e) => {
    const { name, value } = e.target;
    
    // Handle empty string
    if (value === '' || value === null || value === undefined) {
      setProductionData(prev => ({
        ...prev,
        [name]: 0,
      }));
      return;
    }
    
    // Get the raw input value as string
    let stringValue = value.toString();
    
    // Remove leading zeros that appear before non-zero digits
    // Pattern: one or more zeros at the start, followed by a digit 1-9 (not 0, not decimal point)
    // This will convert "01234" -> "1234", "056" -> "56", "012" -> "12"
    // But will preserve "0", "0.5", "0.123" (since they have decimal point after the zero)
    if (stringValue.length > 1 && stringValue[0] === '0' && stringValue[1] !== '.' && stringValue[1] !== ',') {
      // Remove all leading zeros
      stringValue = stringValue.replace(/^0+/, '');
      // If we removed everything, set back to '0'
      if (stringValue === '') {
        stringValue = '0';
      }
    }
    
    // Parse the cleaned value to a number
    const numValue = parseFloat(stringValue);
    
    // Update state with the numeric value
    setProductionData(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleInputFocus = (e) => {
    // Always select all text when focused for easy replacement
    e.target.select();
  };

  const handleLactationChange = (e) => {
    const { name, value } = e.target;
    
    // Handle empty string
    if (value === '' || value === null || value === undefined) {
      setLactationData(prev => ({
        ...prev,
        [name]: 0,
      }));
      return;
    }
    
    // Get the raw input value as string
    let stringValue = value.toString();
    
    // Remove leading zeros that appear before non-zero digits
    // Pattern: one or more zeros at the start, followed by a digit 1-9 (not 0, not decimal point)
    // This will convert "01234" -> "1234", "056" -> "56", "012" -> "12"
    // But will preserve "0", "0.5", "0.123" (since they have decimal point after the zero)
    if (stringValue.length > 1 && stringValue[0] === '0' && stringValue[1] !== '.' && stringValue[1] !== ',') {
      // Remove all leading zeros
      stringValue = stringValue.replace(/^0+/, '');
      // If we removed everything, set back to '0'
      if (stringValue === '') {
        stringValue = '0';
      }
    }
    
    // Parse the cleaned value to a number
    const numValue = parseFloat(stringValue);
    
    // Update state with the numeric value
    setLactationData(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleSave = async () => {
    if (!selectedScenario) {
      setAlertModal({
        isOpen: true,
        message: t('pleaseSelectScenario'),
        type: 'info'
      });
      return;
    }

    setLoading(true);
    try {
      await api.post(`/modules/production/${selectedScenario.id}`, productionData);
      await api.post(`/modules/lactation/${selectedScenario.id}`, lactationData);
      await loadScenario(selectedScenario.id);
      // Trigger calculation after save
      handleCalculate();
      setAlertModal({
        isOpen: true,
        message: t('dataSavedAndCalculated'),
        type: 'success'
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorSaving'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    const lactationDays = Number(lactationData.lactation_days) || 0;
    const dryDays = Number(lactationData.dry_days) || 0;
    const productiveLifeYears = Number(lactationData.productive_life_years) || 0;
    const replacementRate = Number(lactationData.replacement_rate) || 0;
    
    const dailyProduction = Number(productionData.daily_production_liters) || 0;
    const animalsCount = Number(productionData.animals_count) || 0;
    const productionDays = Number(productionData.production_days) || 0;
    const milkPrice = Number(productionData.milk_price_per_liter) || 0;
    
    const cycleDays = lactationDays + dryDays;
    const cyclesPerYear = cycleDays > 0 ? 365 / cycleDays : 0;
    const productiveDays = productiveLifeYears * 365;
    const effectiveProductionDays = productiveDays * (lactationDays / (cycleDays || 1));
    
    const baseProduction = dailyProduction * animalsCount;
    const adjustedProduction = baseProduction * (effectiveProductionDays / (productiveDays || 1));
    const totalProductionLiters = adjustedProduction * productionDays;
    
    const totalRevenue = milkPrice * totalProductionLiters;
    const costPerLiter = 0.5; // Simplified
    const totalCosts = costPerLiter * totalProductionLiters;
    const grossMargin = totalRevenue - totalCosts;
    const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    setResults({
      cycleDays,
      cyclesPerYear,
      productiveDays,
      effectiveProductionDays,
      totalProductionLiters,
      totalRevenue,
      totalCosts,
      grossMargin,
      marginPercentage,
      replacementRate,
    });
  };

  const cycleData = results ? [
    { name: t('lactationDays'), value: Number(lactationData.lactation_days) || 0 },
    { name: t('dryDays'), value: Number(lactationData.dry_days) || 0 },
  ].filter(item => !isNaN(item.value)) : [];

  const productionImpact = results ? [
    { 
      name: t('baseProduction'), 
      value: Number(productionData.daily_production_liters || 0) * Number(productionData.animals_count || 0) * Number(productionData.production_days || 0) 
    },
    { name: t('adjustedProduction'), value: Number(results.totalProductionLiters) || 0 },
  ].filter(item => !isNaN(item.value)) : [];

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          {t('backToDashboard')}
        </button>
        <h1 style={{ marginTop: '20px' }}>{t('module3Title')}</h1>
      </header>

      <div className="card">
        <h2>{t('selectScenario')}</h2>
        <select
          value={selectedScenario?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (id) {
              navigate(`/module3`, { state: { scenarioId: id }, replace: true });
              loadScenario(id);
            }
          }}
          style={{ marginBottom: '20px' }}
        >
          <option value="">{t('selectScenarioPlaceholder')}</option>
          {scenarios.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedScenario && (
        <>
          <div className="card">
            <h2>{t('baseProductionData')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('dailyProduction')}</label>
                <input
                  type="number"
                  name="daily_production_liters"
                  value={productionData.daily_production_liters}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('productionDays')}</label>
                <input
                  type="number"
                  name="production_days"
                  value={productionData.production_days}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>{t('animalsCount')}</label>
                <input
                  type="number"
                  name="animals_count"
                  value={productionData.animals_count}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>{t('milkPrice')}</label>
                <input
                  type="number"
                  name="milk_price_per_liter"
                  value={productionData.milk_price_per_liter}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('lactationData')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('lactationDays')}</label>
                <input
                  type="number"
                  name="lactation_days"
                  value={lactationData.lactation_days}
                  onChange={handleLactationChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>{t('dryDays')}</label>
                <input
                  type="number"
                  name="dry_days"
                  value={lactationData.dry_days}
                  onChange={handleLactationChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>{t('productiveLifeYears')}</label>
                <input
                  type="number"
                  name="productive_life_years"
                  value={lactationData.productive_life_years}
                  onChange={handleLactationChange}
                  onFocus={handleInputFocus}
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label>{t('replacementRate')}</label>
                <input
                  type="number"
                  name="replacement_rate"
                  value={lactationData.replacement_rate}
                  onChange={handleLactationChange}
                  onFocus={handleInputFocus}
                  step="0.1"
                />
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={handleCalculate} style={{ marginRight: '10px' }}>
                {t('calculate')}
              </button>
              <button className="btn btn-secondary" onClick={handleSave} disabled={loading}>
                {loading ? t('saving') : t('saveAndCalculate')}
              </button>
            </div>
          </div>

          {results && (
            <>
              <div className="card">
                <h2>{t('results')}</h2>
                <table className="table">
                  <tbody>
                    <tr>
                      <td><strong>{t('cycleDays')}</strong></td>
                      <td>{Number(results.cycleDays || 0).toFixed(0)} {t('days')}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('cyclesPerYear')}</strong></td>
                      <td>{Number(results.cyclesPerYear || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('totalProductiveDays')}</strong></td>
                      <td>{Number(results.productiveDays || 0).toFixed(0)} {t('days')}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('effectiveProductionDays')}</strong></td>
                      <td>{Number(results.effectiveProductionDays || 0).toFixed(0)} {t('days')}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('totalAdjustedProduction')}</strong></td>
                      <td>{Number(results.totalProductionLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('totalRevenue')}</strong></td>
                      <td>${Number(results.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('totalCosts')}</strong></td>
                      <td>${Number(results.totalCosts || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('grossMargin')}</strong></td>
                      <td>${Number(results.grossMargin || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('marginPercentage')}</strong></td>
                      <td>{Number(results.marginPercentage || 0).toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td><strong>{t('replacementRate')}</strong></td>
                      <td>{Number(results.replacementRate || 0).toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>{t('visualization')}</h2>
                <h3 style={{ marginBottom: '15px' }}>{t('lactationCycleChart')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cycleData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>

                <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('productionImpact')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionImpact}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${Number(value || 0).toLocaleString(undefined)} ${t('liters')}`} />
                    <Legend />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
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

export default Module3Lactation;
