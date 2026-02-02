import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';
import { useChartColors } from '../../hooks/useDarkMode';

function Module4Yield({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;
  const chartColors = useChartColors();

  const [productionData, setProductionData] = useState({
    daily_production_liters: 0,
    production_days: 0,
    animals_count: 0,
  });

  const [yieldData, setYieldData] = useState({
    conversion_rate: 0,
    efficiency_percentage: 100,
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
      const response = await api.get('/scenarios?type=yield');
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
      if (scenario.yieldData) {
        setYieldData(scenario.yieldData);
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

  const handleYieldChange = (e) => {
    const { name, value } = e.target;
    
    // Handle empty string
    if (value === '' || value === null || value === undefined) {
      setYieldData(prev => ({
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
    setYieldData(prev => ({
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
      await api.post(`/modules/yield/${selectedScenario.id}`, yieldData);
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
    const dailyProduction = Number(productionData.daily_production_liters) || 0;
    const productionDays = Number(productionData.production_days) || 0;
    const animalsCount = Number(productionData.animals_count) || 0;
    const efficiency = Number(yieldData.efficiency_percentage) || 0;
    const conversionRate = Number(yieldData.conversion_rate) || 0;
    
    const totalLiters = dailyProduction * productionDays * animalsCount;
    const effectiveLiters = totalLiters * (efficiency / 100);
    const convertedProduct = effectiveLiters * conversionRate;
    const wasteLiters = totalLiters - effectiveLiters;

    setResults({
      totalLiters,
      effectiveLiters,
      convertedProduct,
      conversionRate,
      efficiencyPercentage: efficiency,
      wasteLiters,
    });
  };

  const conversionData = results ? [
    { name: t('totalLiters'), value: Number(results.totalLiters || 0) },
    { name: t('effectiveLiters'), value: Number(results.effectiveLiters || 0) },
    { name: t('convertedProduct'), value: Number(results.convertedProduct || 0) },
    { name: t('wasteLiters'), value: Number(results.wasteLiters || 0) },
  ].filter(item => !isNaN(item.value)) : [];

  const efficiencyData = results ? [
    { name: t('efficiencyPercentage'), value: Number(results.efficiencyPercentage || 0) },
    { name: t('conversionRate'), value: Number(results.conversionRate || 0) * 100 },
  ].filter(item => !isNaN(item.value)) : [];

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ marginTop: '20px' }}>{t('module4Title')}</h1>
      </header>

      <div className="card">
        <h2>{t('selectScenario')}</h2>
        <select
          value={selectedScenario?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (id) {
              navigate(`/module4`, { state: { scenarioId: id }, replace: true });
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
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('yieldData')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('conversionRateDescription')}</label>
                <input
                  type="number"
                  name="conversion_rate"
                  value={yieldData.conversion_rate}
                  onChange={handleYieldChange}
                  onFocus={handleInputFocus}
                  step="0.0001"
                  placeholder={t('conversionRate')}
                />
              </div>
              <div className="form-group">
                <label>{t('efficiencyPercentage')}</label>
                <input
                  type="number"
                  name="efficiency_percentage"
                  value={yieldData.efficiency_percentage}
                  onChange={handleYieldChange}
                  onFocus={handleInputFocus}
                  step="0.1"
                  min="0"
                  max="100"
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
              {/* Key Metrics Cards */}
              <div className="metrics-grid">
                <div className="metric-card info">
                  <div className="metric-label">{t('totalLiters') || 'Total Liters'}</div>
                  <div className="metric-value">
                    {Number(results.totalLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                  </div>
                </div>
                <div className="metric-card success">
                  <div className="metric-label">{t('effectiveLiters') || 'Effective Liters'}</div>
                  <div className="metric-value success">
                    {Number(results.effectiveLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">{t('convertedProduct') || 'Converted Product'}</div>
                  <div className="metric-value">
                    {Number(results.convertedProduct || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={`metric-card ${results.efficiencyPercentage >= 90 ? 'success' : results.efficiencyPercentage >= 70 ? 'warning' : 'error'}`}>
                  <div className="metric-label">{t('efficiencyPercentage') || 'Efficiency'}</div>
                  <div className={`metric-value ${results.efficiencyPercentage >= 90 ? 'success' : results.efficiencyPercentage >= 70 ? '' : 'error'}`}>
                    {Number(results.efficiencyPercentage || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Results Table Card */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h2 className="chart-title">
                      <span className="chart-title-icon">📋</span>
                      {t('results')}
                    </h2>
                    <p className="chart-subtitle">Detailed yield and conversion metrics</p>
                  </div>
                </div>
                <div className="chart-container">
                  <table className="table">
                    <tbody>
                      <tr>
                        <td><strong>{t('totalLiters')}</strong></td>
                        <td>{Number(results.totalLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                      </tr>
                      <tr>
                        <td><strong>{t('effectiveLiters')}</strong></td>
                        <td style={{ color: '#16a34a', fontWeight: '600' }}>{Number(results.effectiveLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                      </tr>
                      <tr>
                        <td><strong>{t('convertedProduct')}</strong></td>
                        <td>{Number(results.convertedProduct || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('units')}</td>
                      </tr>
                      <tr>
                        <td><strong>{t('conversionRate')}</strong></td>
                        <td>{Number(results.conversionRate || 0).toFixed(4)}</td>
                      </tr>
                      <tr>
                        <td><strong>{t('efficiencyPercentage')}</strong></td>
                        <td style={{ color: results.efficiencyPercentage >= 90 ? '#16a34a' : results.efficiencyPercentage >= 70 ? '#ca8a04' : '#dc2626', fontWeight: '600' }}>
                          {Number(results.efficiencyPercentage || 0).toFixed(2)}%
                        </td>
                      </tr>
                      <tr>
                        <td><strong>{t('wasteLiters')}</strong></td>
                        <td style={{ color: '#dc2626' }}>{Number(results.wasteLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                      </tr>
                      <tr>
                        <td><strong>{t('wastePercentage')}</strong></td>
                        <td style={{ color: '#dc2626' }}>
                          {Number(results.totalLiters || 0) > 0 ? ((Number(results.wasteLiters || 0) / Number(results.totalLiters || 0)) * 100).toFixed(2) : 0}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charts Card */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h2 className="chart-title">
                      <span className="chart-title-icon">📊</span>
                      {t('visualization')}
                    </h2>
                    <p className="chart-subtitle">Visual breakdown of conversion and efficiency metrics</p>
                  </div>
                </div>
                
                <div className="chart-container">
                  <h3 className="chart-section-title">{t('milkToProductConversion')}</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={conversionData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke={chartColors.axis.tick}
                        tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke={chartColors.axis.tick}
                        tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        formatter={(value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        contentStyle={{ 
                          backgroundColor: chartColors.tooltip.bg, 
                          border: `1px solid ${chartColors.tooltip.border}`,
                          borderRadius: '12px',
                          boxShadow: chartColors.tooltip.shadow,
                          padding: '12px 16px'
                        }}
                        cursor={{ fill: chartColors.background.hover }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="roundRect" />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {conversionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-container" style={{ marginTop: '24px' }}>
                  <h3 className="chart-section-title">{t('efficiencyAndConversion')}</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={efficiencyData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke={chartColors.axis.tick}
                        tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke={chartColors.axis.tick}
                        tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip 
                        formatter={(value) => `${Number(value).toFixed(2)}%`}
                        contentStyle={{ 
                          backgroundColor: chartColors.tooltip.bg, 
                          border: `1px solid ${chartColors.tooltip.border}`,
                          borderRadius: '12px',
                          boxShadow: chartColors.tooltip.shadow,
                          padding: '12px 16px'
                        }}
                        cursor={{ fill: chartColors.background.hover }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="roundRect" />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {efficiencyData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.value >= 90 ? chartColors.margin : entry.value >= 70 ? chartColors.quaternary : chartColors.costs} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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

export default Module4Yield;
