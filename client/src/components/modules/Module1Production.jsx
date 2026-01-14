import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';

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

  useEffect(() => {
    loadScenarios();
    if (scenarioId) {
      loadScenario(scenarioId);
    }
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
        setResults(scenario.results);
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
    // Select all text when focused if value is 0, so user can immediately type to replace it
    if (parseFloat(e.target.value) === 0) {
      e.target.select();
    }
  };

  const handleSave = async () => {
    if (!selectedScenario) {
      alert(t('pleaseSelectScenario'));
      return;
    }

    setLoading(true);
    try {
      await api.post(`/modules/production/${selectedScenario.id}`, formData);
      await loadScenario(selectedScenario.id);
      alert(t('dataSaved'));
    } catch (error) {
      alert(error.response?.data?.error || t('errorSaving'));
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
    });
  };

  const chartData = results ? [
    { name: 'Ingresos', value: results.total_revenue },
    { name: 'Costos', value: results.total_costs },
    { name: 'Margen', value: results.gross_margin },
  ] : [];

  const costBreakdown = formData ? [
    { name: 'Alimento', value: formData.feed_cost_per_liter },
    { name: 'Mano de Obra', value: formData.labor_cost_per_liter },
    { name: 'Salud', value: formData.health_cost_per_liter },
    { name: 'Infraestructura', value: formData.infrastructure_cost_per_liter },
    { name: 'Otros', value: formData.other_costs_per_liter },
  ] : [];

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
                <h2>{t('results')}</h2>
                <table className="table">
                  <tbody>
                    <tr>
                      <td><strong>{t('totalProduction')}</strong></td>
                      <td>{results.total_production_liters?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('totalRevenue')}</strong></td>
                      <td>${results.total_revenue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('totalCosts')}</strong></td>
                      <td>${results.total_costs?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('grossMargin')}</strong></td>
                      <td>${results.gross_margin?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('marginPercentage')}</strong></td>
                      <td>{results.margin_percentage?.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td><strong>{t('revenuePerLiter')}</strong></td>
                      <td>${results.revenue_per_liter?.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('costPerLiter')}</strong></td>
                      <td>${results.cost_per_liter?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>{t('visualization')}</h2>
                <h3 style={{ marginBottom: '15px' }}>{t('income')} vs {t('totalCosts')} vs {t('margin')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>

                <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Desglose de Costos</h3>
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
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Module1Production;
