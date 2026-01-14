import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';

function Module1Production({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

  const [formData, setFormData] = useState({
    daily_production_liters: 0,
    production_days: 0,
    animals_count: 0,
    feed_cost_per_liter: 0,
    labor_cost_per_liter: 0,
    health_cost_per_liter: 0,
    infrastructure_cost_per_liter: 0,
    other_costs_per_liter: 0,
    milk_price_per_liter: 0,
  });

  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [viewPeriod, setViewPeriod] = useState('lactation'); // 'daily', 'monthly', 'lactation'

  useEffect(() => {
    const initialize = async () => {
      await loadScenarios();
      if (scenarioId) {
        await loadScenario(scenarioId);
      }
    };
    initialize();
  }, [scenarioId]);

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios?type=milk_sale');
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
        setFormData(normalizedData);
      }
      if (scenario.results) {
        // Normalize all numeric values in results to ensure they are numbers
        const normalizedResults = {};
        Object.keys(scenario.results).forEach(key => {
          const value = scenario.results[key];
          if (typeof value === 'number') {
            normalizedResults[key] = value;
          } else if (typeof value === 'string') {
            const numValue = parseFloat(value);
            normalizedResults[key] = isNaN(numValue) ? 0 : numValue;
          } else {
            normalizedResults[key] = value;
          }
        });
        setResults(normalizedResults);
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle empty string
    if (value === '' || value === null || value === undefined) {
      setFormData(prev => ({
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
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleInputFocus = (e) => {
    // Always select all text when focused for easy replacement
    e.target.select();
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
      await api.post(`/modules/production/${selectedScenario.id}`, formData);
      await loadScenario(selectedScenario.id);
      // Trigger calculation after save
      handleCalculate();
      setAlertModal({
        isOpen: true,
        message: t('dataSavedAndCalculated') || 'Data saved and results calculated',
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
    const totalLiters = formData.daily_production_liters * formData.production_days * formData.animals_count;
    const costPerLiter = 
      formData.feed_cost_per_liter +
      formData.labor_cost_per_liter +
      formData.health_cost_per_liter +
      formData.infrastructure_cost_per_liter +
      formData.other_costs_per_liter;
    const totalCosts = costPerLiter * totalLiters;
    const totalRevenue = formData.milk_price_per_liter * totalLiters;
    const grossMargin = totalRevenue - totalCosts;
    const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    setResults({
      total_production_liters: totalLiters,
      total_revenue: totalRevenue,
      total_costs: totalCosts,
      gross_margin: grossMargin,
      margin_percentage: marginPercentage,
      revenue_per_liter: formData.milk_price_per_liter,
      cost_per_liter: costPerLiter,
      // Store base values for period calculations
      daily_production: formData.daily_production_liters * formData.animals_count,
      production_days: formData.production_days,
    });
  };

  // Calculate values based on selected period
  const getDisplayValues = () => {
    if (!results) return null;
    
    const dailyProduction = results.daily_production || 0;
    const productionDays = results.production_days || 1;
    
    switch (viewPeriod) {
      case 'daily':
        return {
          production: dailyProduction,
          revenue: (results.total_revenue / productionDays) || 0,
          costs: (results.total_costs / productionDays) || 0,
          margin: (results.gross_margin / productionDays) || 0,
          label: t('daily')
        };
      case 'monthly':
        const daysInMonth = 30;
        return {
          production: dailyProduction * daysInMonth,
          revenue: (results.total_revenue / productionDays) * daysInMonth || 0,
          costs: (results.total_costs / productionDays) * daysInMonth || 0,
          margin: (results.gross_margin / productionDays) * daysInMonth || 0,
          label: t('monthly')
        };
      case 'lactation':
      default:
        return {
          production: results.total_production_liters,
          revenue: results.total_revenue,
          costs: results.total_costs,
          margin: results.gross_margin,
          label: t('perLactation')
        };
    }
  };

  const chartData = results ? [
    { name: t('income'), value: Number(results.total_revenue) || 0 },
    { name: t('totalCosts'), value: Number(results.total_costs) || 0 },
    { name: t('margin'), value: Number(results.gross_margin) || 0 },
  ].filter(item => !isNaN(item.value)) : [];

  const costBreakdown = formData ? [
    { name: t('feed'), value: Number(formData.feed_cost_per_liter) || 0 },
    { name: t('labor'), value: Number(formData.labor_cost_per_liter) || 0 },
    { name: t('health'), value: Number(formData.health_cost_per_liter) || 0 },
    { name: t('infrastructure'), value: Number(formData.infrastructure_cost_per_liter) || 0 },
    { name: t('other'), value: Number(formData.other_costs_per_liter) || 0 },
  ].filter(item => !isNaN(item.value)) : [];

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          {t('backToDashboard')}
        </button>
        <h1 style={{ marginTop: '20px' }}>{t('module1Title')}</h1>
      </header>

      <div className="card">
        <h2>{t('selectScenario')}</h2>
        <select
          value={selectedScenario?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (id) {
              navigate(`/module1`, { state: { scenarioId: id }, replace: true });
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
            <h2>{t('productionData')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('dailyProduction')}</label>
                <input
                  type="number"
                  name="daily_production_liters"
                  value={formData.daily_production_liters}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('productionDays')}</label>
                <input
                  type="number"
                  name="production_days"
                  value={formData.production_days}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>{t('animalsCount')}</label>
                <input
                  type="number"
                  name="animals_count"
                  value={formData.animals_count}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>{t('milkPrice')}</label>
                <input
                  type="number"
                  name="milk_price_per_liter"
                  value={formData.milk_price_per_liter}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('totalCosts')} (per liter)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('feedCost')}</label>
                <input
                  type="number"
                  name="feed_cost_per_liter"
                  value={formData.feed_cost_per_liter}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('laborCost')}</label>
                <input
                  type="number"
                  name="labor_cost_per_liter"
                  value={formData.labor_cost_per_liter}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('healthCost')}</label>
                <input
                  type="number"
                  name="health_cost_per_liter"
                  value={formData.health_cost_per_liter}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('infrastructureCost')}</label>
                <input
                  type="number"
                  name="infrastructure_cost_per_liter"
                  value={formData.infrastructure_cost_per_liter}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('otherCosts')}</label>
                <input
                  type="number"
                  name="other_costs_per_liter"
                  value={formData.other_costs_per_liter}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  step="0.01"
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>{t('results')}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold' }}>{t('viewPeriod')}:</label>
                    <select 
                      value={viewPeriod} 
                      onChange={(e) => setViewPeriod(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="daily">{t('daily')}</option>
                      <option value="monthly">{t('monthly')}</option>
                      <option value="lactation">{t('perLactation')}</option>
                    </select>
                  </div>
                </div>
                {(() => {
                  const displayValues = getDisplayValues();
                  return (
                    <>
                      <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f7ff', borderRadius: '4px' }}>
                        <p style={{ margin: 0, fontSize: '0.9em', color: '#0066cc' }}>
                          <strong>{t('note')}:</strong> Mostrando valores para período: <strong>{displayValues.label}</strong>
                        </p>
                      </div>
                            <table className="table">
                        <tbody>
                          <tr>
                            <td><strong>{t('totalProduction')}</strong></td>
                            <td>{displayValues.production?.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                          </tr>
                          <tr>
                            <td><strong>{t('totalRevenue')}</strong></td>
                            <td>${displayValues.revenue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td><strong>{t('totalCosts')}</strong></td>
                            <td>${displayValues.costs?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td><strong>{t('grossMargin')}</strong></td>
                            <td>${displayValues.margin?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td><strong>{t('marginPercentage')}</strong></td>
                            <td>{typeof results.margin_percentage === 'number' ? results.margin_percentage.toFixed(2) : '0.00'}%</td>
                          </tr>
                          <tr>
                            <td><strong>{t('revenuePerLiter')}</strong></td>
                            <td>${typeof results.revenue_per_liter === 'number' ? results.revenue_per_liter.toFixed(2) : '0.00'}</td>
                          </tr>
                          <tr>
                            <td><strong>{t('costPerLiter')}</strong></td>
                            <td>${typeof results.cost_per_liter === 'number' ? results.cost_per_liter.toFixed(2) : '0.00'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>

              <div className="card">
                <h2>{t('visualization')}</h2>
                <h3 style={{ marginBottom: '15px' }}>{t('income')} vs {t('totalCosts')} vs {t('grossMargin')}</h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value || 0).toLocaleString(undefined)}`} />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p style={{ color: '#666', margin: 0 }}>{t('noDataToShow')}</p>
                  </div>
                )}

                <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('costBreakdown')}</h3>
                {costBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p style={{ color: '#666', margin: 0 }}>{t('noCostDataToShow')}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.type === 'success' ? t('success') || 'Success' : alertModal.type === 'error' ? t('error') || 'Error' : t('information') || 'Information'}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

export default Module1Production;
