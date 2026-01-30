import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';
import CostCalculatorModal from '../CostCalculatorModal';
import { useChartColors } from '../../hooks/useDarkMode';

function Module1Production({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;
  const chartColors = useChartColors();

  const [formData, setFormData] = useState({
    daily_production_liters: '',
    production_days: '',
    animals_count: '',
    feed_cost_per_liter: '',
    labor_cost_per_liter: '',
    health_cost_per_liter: '',
    infrastructure_cost_per_liter: '',
    other_costs_per_liter: '',
    milk_price_per_liter: '',
  });

  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [viewPeriod, setViewPeriod] = useState('lactation'); // 'daily', 'monthly', 'lactation'
  const [marginViewMode, setMarginViewMode] = useState('dollars'); // 'dollars' or 'percent' for charts
  
  // Module 4: Cost Calculator Modal State
  const [costCalculatorModal, setCostCalculatorModal] = useState({
    isOpen: false,
    calculatorType: null, // 'feed', 'labor', 'health', 'services', 'rearing'
    targetField: null // which formData field to update
  });

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
        // Convert numeric values to strings for input fields (empty string if 0 or null)
        const normalizedData = {};
        Object.keys(scenario.productionData).forEach(key => {
          const value = scenario.productionData[key];
          if (value === null || value === undefined || value === '') {
            normalizedData[key] = '';
          } else if (typeof value === 'number') {
            normalizedData[key] = value === 0 ? '' : value.toString();
          } else if (typeof value === 'string') {
            const numValue = parseFloat(value);
            normalizedData[key] = isNaN(numValue) || numValue === 0 ? '' : value;
          } else {
            normalizedData[key] = '';
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
        // Show notification that results were auto-loaded
        if (normalizedResults.total_revenue || normalizedResults.gross_margin) {
          // Silently load results - user will see them in the UI
        }
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Allow empty string, keep as string in state
    // Only update if the value is a valid number or empty
    if (value === '' || value === null || value === undefined) {
      setFormData(prev => ({
        ...prev,
        [name]: '',
      }));
      return;
    }
    
    // Allow valid numeric input (including decimals and negative numbers if needed)
    // Keep as string to allow free typing
    const validNumberPattern = /^-?\d*\.?\d*$/;
    if (validNumberPattern.test(value)) {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleInputFocus = (e) => {
    // Only select all text if field has a value, otherwise allow typing from scratch
    if (e.target.value && e.target.value !== '') {
      e.target.select();
    }
  };
  
  // Module 4: Open Cost Calculator Modal
  const openCostCalculator = (calculatorType, targetField) => {
    setCostCalculatorModal({
      isOpen: true,
      calculatorType,
      targetField
    });
  };
  
  // Module 4: Apply Calculated Cost to Form
  const applyCostToForm = (calculatedCost) => {
    if (costCalculatorModal.targetField) {
      setFormData(prev => ({
        ...prev,
        [costCalculatorModal.targetField]: calculatedCost.toFixed(4)
      }));
      
      setAlertModal({
        isOpen: true,
        message: `${t('costEstimator')}: ${t('estimatedCost')} $${calculatedCost.toFixed(4)} ${t('perLiter')} ${t('applyToModule1')} ✓`,
        type: 'success'
      });
    }
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
      // Convert string values to numbers before sending to API
      // Validate and clamp values to prevent overflow (DECIMAL(10,2) max: 99999999.99)
      const MAX_DECIMAL_VALUE = 99999999.99;
      const MIN_DECIMAL_VALUE = -99999999.99;
      
      const dataToSave = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value === '' || value === null || value === undefined) {
          dataToSave[key] = 0;
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || !isFinite(numValue)) {
            dataToSave[key] = 0;
          } else {
            // Clamp value to valid DECIMAL(10,2) range
            dataToSave[key] = Math.max(MIN_DECIMAL_VALUE, Math.min(MAX_DECIMAL_VALUE, numValue));
          }
        }
      });
      
      // For INTEGER fields, ensure they are integers and within valid range
      if (dataToSave.production_days !== undefined) {
        dataToSave.production_days = Math.max(0, Math.min(2147483647, Math.round(dataToSave.production_days)));
      }
      if (dataToSave.animals_count !== undefined) {
        dataToSave.animals_count = Math.max(0, Math.min(2147483647, Math.round(dataToSave.animals_count)));
      }
      
      await api.post(`/modules/production/${selectedScenario.id}`, dataToSave);
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
    // Convert string values to numbers for calculations
    const dailyProduction = parseFloat(formData.daily_production_liters) || 0;
    const productionDays = parseFloat(formData.production_days) || 0;
    const animalsCount = parseFloat(formData.animals_count) || 0;
    const feedCost = parseFloat(formData.feed_cost_per_liter) || 0;
    const laborCost = parseFloat(formData.labor_cost_per_liter) || 0;
    const healthCost = parseFloat(formData.health_cost_per_liter) || 0;
    const infrastructureCost = parseFloat(formData.infrastructure_cost_per_liter) || 0;
    const otherCost = parseFloat(formData.other_costs_per_liter) || 0;
    const milkPrice = parseFloat(formData.milk_price_per_liter) || 0;
    
    const totalLiters = dailyProduction * productionDays * animalsCount;
    const costPerLiter = feedCost + laborCost + healthCost + infrastructureCost + otherCost;
    const totalCosts = costPerLiter * totalLiters;
    const totalRevenue = milkPrice * totalLiters;
    const grossMargin = totalRevenue - totalCosts;
    const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    setResults({
      total_production_liters: totalLiters,
      total_revenue: totalRevenue,
      total_costs: totalCosts,
      gross_margin: grossMargin,
      margin_percentage: marginPercentage,
      revenue_per_liter: milkPrice,
      cost_per_liter: costPerLiter,
      // Store base values for period calculations
      daily_production: dailyProduction * animalsCount,
      production_days: productionDays,
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
        <h1 style={{ marginTop: '20px' }}>{t('module1Title')}</h1>
        <div style={{ 
          marginTop: '16px', 
          padding: '18px 24px', 
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', 
          borderRadius: '12px',
          borderLeft: '4px solid #2d5016',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: '#1565c0' }}>
            ℹ️ {t('module1Explanation')}
          </p>
        </div>
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="feed_cost_per_liter"
                    value={formData.feed_cost_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => openCostCalculator('feed', 'feed_cost_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                  >
                    📊 {t('estimateCost')}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>{t('laborCost')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="labor_cost_per_liter"
                    value={formData.labor_cost_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => openCostCalculator('labor', 'labor_cost_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                  >
                    📊 {t('estimateCost')}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>{t('healthCost')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="health_cost_per_liter"
                    value={formData.health_cost_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => openCostCalculator('health', 'health_cost_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                  >
                    📊 {t('estimateCost')}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>{t('infrastructureCost')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="infrastructure_cost_per_liter"
                    value={formData.infrastructure_cost_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => openCostCalculator('services', 'infrastructure_cost_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                  >
                    📊 {t('estimateCost')}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>{t('otherCosts')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="other_costs_per_liter"
                    value={formData.other_costs_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => openCostCalculator('rearing', 'other_costs_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                  >
                    📊 {t('estimateCost')}
                  </button>
                </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <h2 style={{ margin: 0, flex: '1 1 100%', minWidth: '200px' }}>{t('results')}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
                    {selectedScenario?.results && (
                      <div style={{ 
                        padding: '10px 16px', 
                        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', 
                        borderRadius: '8px', 
                        fontSize: '0.9em', 
                        color: '#1b5e20',
                        fontWeight: '600',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '1.2em' }}>✓</span> {t('autoLoadedResults')}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                      <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table className="table" style={{ minWidth: '400px' }}>
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
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>{t('visualization')}</h2>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{t('marginViewMode')}:</label>
                    <select
                      value={marginViewMode}
                      onChange={(e) => setMarginViewMode(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9em' }}
                    >
                      <option value="dollars">{t('viewInDollars')}</option>
                      <option value="percent">{t('viewInPercent')}</option>
                    </select>
                  </div>
                </div>
                <h3 style={{ marginBottom: '15px' }}>{t('income')} vs {t('totalCosts')} vs {t('grossMargin')}</h3>
                {chartData.length > 0 ? (() => {
                  // Transform data based on margin view mode
                  const displayChartData = marginViewMode === 'percent' ? chartData.map(item => {
                    const income = item.name === t('income') ? Number(item.value) : 0;
                    const costs = item.name === t('totalCosts') ? Number(item.value) : 0;
                    const margin = item.name === t('margin') ? Number(item.value) : 0;
                    const totalRevenue = results?.total_revenue || 1;
                    return {
                      ...item,
                      value: totalRevenue > 0 
                        ? (item.name === t('income') ? 100 : item.name === t('totalCosts') ? (costs / totalRevenue) * 100 : (margin / totalRevenue) * 100)
                        : 0
                    };
                  }) : chartData;
                  
                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={displayChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="name" stroke={chartColors.axis.tick} />
                        <YAxis stroke={chartColors.axis.tick} />
                        <Tooltip 
                          formatter={(value) => 
                            marginViewMode === 'percent' 
                              ? `${Number(value || 0).toFixed(1)}%`
                              : `$${Number(value || 0).toLocaleString(undefined)}`
                          }
                          contentStyle={{ 
                            backgroundColor: chartColors.tooltip.bg, 
                            border: `1px solid ${chartColors.tooltip.border}`,
                            color: chartColors.tooltip.text
                          }}
                        />
                        <Legend />
                        <Bar dataKey="value" fill={chartColors.primary} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })() : (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p style={{ color: '#666', margin: 0 }}>{t('noDataToShow')}</p>
                  </div>
                )}

                <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('costBreakdown')}</h3>
                {costBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="name" stroke={chartColors.axis.tick} />
                    <YAxis stroke={chartColors.axis.tick} />
                    <Tooltip 
                      formatter={(value) => `$${value.toFixed(2)}`}
                      contentStyle={{ 
                        backgroundColor: chartColors.tooltip.bg, 
                        border: `1px solid ${chartColors.tooltip.border}`,
                        color: chartColors.tooltip.text
                      }}
                    />
                    <Legend />
                    <Bar dataKey="value" fill={chartColors.secondary} />
                  </BarChart>
                </ResponsiveContainer>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p style={{ color: '#666', margin: 0 }}>{t('noCostDataToShow')}</p>
                  </div>
                )}
              </div>

              {/* Integrated Dashboard View */}
              <div className="card" style={{ marginTop: '2rem' }}>
                <h2 className="card-section-title">{t('integratedDashboard') || 'Integrated Dashboard'}</h2>
                <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                  {t('dashboardDescription') || 'Comprehensive view of all metrics and charts for quick decision-making'}
                </p>
                
                {/* Key Metrics Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem', 
                  marginBottom: '2rem' 
                }}>
                  <div style={{ 
                    padding: '1.5rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {t('totalRevenue') || 'Total Revenue'}
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      ${Number(results.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '1.5rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {t('totalCosts') || 'Total Costs'}
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      ${Number(results.total_costs || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '1.5rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {t('grossMargin') || 'Gross Margin'}
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: results.gross_margin >= 0 ? 'var(--success-color)' : 'var(--error-color)' }}>
                      ${Number(results.gross_margin || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {results.margin_percentage?.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                  gap: '2rem' 
                }}>
                  {/* Income/Costs/Margin Chart */}
                  <div>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                      {t('financialOverview') || 'Financial Overview'}
                    </h3>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis dataKey="name" stroke={chartColors.axis.tick} />
                          <YAxis stroke={chartColors.axis.tick} />
                          <Tooltip 
                            formatter={(value) => `$${Number(value || 0).toLocaleString(undefined)}`}
                            contentStyle={{ 
                              backgroundColor: chartColors.tooltip.bg, 
                              border: `1px solid ${chartColors.tooltip.border}`,
                              color: chartColors.tooltip.text
                            }}
                          />
                          <Legend />
                          <Bar dataKey="value" fill={chartColors.primary} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>

                  {/* Cost Breakdown Chart */}
                  <div>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                      {t('costBreakdown') || 'Cost Breakdown'}
                    </h3>
                    {costBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={costBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis dataKey="name" stroke={chartColors.axis.tick} />
                          <YAxis stroke={chartColors.axis.tick} />
                          <Tooltip 
                            formatter={(value) => `$${value.toFixed(2)}`}
                            contentStyle={{ 
                              backgroundColor: chartColors.tooltip.bg, 
                              border: `1px solid ${chartColors.tooltip.border}`,
                              color: chartColors.tooltip.text
                            }}
                          />
                          <Legend />
                          <Bar dataKey="value" fill={chartColors.secondary} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                </div>
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
      
      {/* Module 4: Cost Calculator Modal */}
      <CostCalculatorModal
        isOpen={costCalculatorModal.isOpen}
        onClose={() => setCostCalculatorModal({ isOpen: false, calculatorType: null, targetField: null })}
        calculatorType={costCalculatorModal.calculatorType}
        onApply={applyCostToForm}
        currentAnimals={parseFloat(formData.animals_count) || 1}
        currentDailyProduction={parseFloat(formData.daily_production_liters) || 1}
      />
    </div>
  );
}

export default Module1Production;
