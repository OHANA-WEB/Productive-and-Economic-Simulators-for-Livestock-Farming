import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';

function Module2Transformation({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

  const [productionData, setProductionData] = useState({
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

  const [transformationData, setTransformationData] = useState({
    product_type: 'queso_fresco',
    liters_per_kg_product: 0,
    processing_cost_per_liter: 0,
    product_price_per_kg: 0, // Legacy field for backward compatibility
    // Sales channels (3 channels)
    sales_channel_direct_percentage: 100,
    sales_channel_distributors_percentage: 0,
    sales_channel_third_percentage: 0,
    direct_sale_price_per_kg: 0,
    distributors_price_per_kg: 0,
    third_channel_price_per_kg: 0,
  });

  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });

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
      const response = await api.get('/scenarios?type=transformation');
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
      
      // ALWAYS load production data from Module 1 (read-only inheritance)
      if (scenario.productionData) {
        const normalizedData = {
          daily_production_liters: 0,
          production_days: 0,
          animals_count: 0,
          feed_cost_per_liter: 0,
          labor_cost_per_liter: 0,
          health_cost_per_liter: 0,
          infrastructure_cost_per_liter: 0,
          other_costs_per_liter: 0,
          milk_price_per_liter: 0,
        };
        Object.keys(scenario.productionData).forEach(key => {
          const value = scenario.productionData[key];
          if (typeof value === 'number') {
            normalizedData[key] = value;
          } else if (typeof value === 'string') {
            const numValue = parseFloat(value);
            normalizedData[key] = isNaN(numValue) ? 0 : numValue;
          } else if (value !== null && value !== undefined) {
            normalizedData[key] = value;
          }
        });
        setProductionData(normalizedData);
      } else {
        // If no production data exists, show warning
        setAlertModal({
          isOpen: true,
          message: t('module1DataRequired'),
          type: 'info'
        });
      }
      
      if (scenario.transformationData) {
        setTransformationData({
          product_type: 'queso_fresco',
          liters_per_kg_product: 0,
          processing_cost_per_liter: 0,
          product_price_per_kg: 0,
          sales_channel_direct_percentage: 100,
          sales_channel_distributors_percentage: 0,
          sales_channel_third_percentage: 0,
          direct_sale_price_per_kg: 0,
          distributors_price_per_kg: 0,
          third_channel_price_per_kg: 0,
          ...scenario.transformationData,
        });
      }
      if (scenario.results) {
        setResults(scenario.results);
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  // Production data is now read-only and inherited from Module 1
  // No need for handleProductionChange anymore

  const handleInputFocus = (e) => {
    // Always select all text when focused for easy replacement
    e.target.select();
  };

  const handleTransformationChange = (e) => {
    const { name, value } = e.target;
    
    // Handle product_type (string field)
    if (name === 'product_type') {
      setTransformationData(prev => ({
        ...prev,
        [name]: value,
      }));
      return;
    }
    
    // Handle empty string
    if (value === '' || value === null || value === undefined) {
      setTransformationData(prev => ({
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
    
    // Handle sales channel percentages - ensure they sum to 100
    if (name.includes('_percentage')) {
      setTransformationData(prev => {
        const updated = { ...prev, [name]: isNaN(numValue) ? 0 : numValue };
        
        // Calculate the third percentage to ensure sum is 100
        if (name === 'sales_channel_direct_percentage') {
          const remaining = 100 - (isNaN(numValue) ? 0 : numValue) - (prev.sales_channel_distributors_percentage || 0);
          updated.sales_channel_third_percentage = Math.max(0, Math.min(100, remaining));
        } else if (name === 'sales_channel_distributors_percentage') {
          const remaining = 100 - (prev.sales_channel_direct_percentage || 0) - (isNaN(numValue) ? 0 : numValue);
          updated.sales_channel_third_percentage = Math.max(0, Math.min(100, remaining));
        } else if (name === 'sales_channel_third_percentage') {
          const remaining = 100 - (prev.sales_channel_direct_percentage || 0) - (prev.sales_channel_distributors_percentage || 0);
          // If user sets third, adjust direct to maintain sum
          if (remaining < 0) {
            updated.sales_channel_direct_percentage = Math.max(0, (prev.sales_channel_direct_percentage || 0) + remaining);
          }
        }
        
        return updated;
      });
    } else {
      // Update numeric fields
      setTransformationData(prev => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : numValue,
      }));
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
      // Only save transformation data (production data is inherited from Module 1)
      await api.post(`/modules/transformation/${selectedScenario.id}`, transformationData);
      await loadScenario(selectedScenario.id);
      // Trigger calculation after save
      handleCalculate();
      setAlertModal({
        isOpen: true,
        message: t('dataSavedAndCalculated') || 'Saved and calculated successfully',
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
    const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);
    const litersPerKg = transformationData.liters_per_kg_product || 1;
    const totalProductKg = litersPerKg > 0 ? totalLiters / litersPerKg : 0;
    const processingCost = (transformationData.processing_cost_per_liter || 0) * totalLiters;
    
    // Calculate weighted average price across channels
    const directPrice = (transformationData.direct_sale_price_per_kg || 0);
    const distPrice = (transformationData.distributors_price_per_kg || 0);
    const thirdPrice = (transformationData.third_channel_price_per_kg || 0);
    const directPct = (transformationData.sales_channel_direct_percentage || 0) / 100;
    const distPct = (transformationData.sales_channel_distributors_percentage || 0) / 100;
    const thirdPct = (transformationData.sales_channel_third_percentage || 0) / 100;
    
    const avgPrice = (directPrice * directPct) + (distPrice * distPct) + (thirdPrice * thirdPct);
    const productRevenue = avgPrice * totalProductKg;
    
    // Compare with direct milk sale
    const milkRevenue = (productionData.milk_price_per_liter || 0) * totalLiters;
    const milkCost = (productionData.milk_price_per_liter || 0) * totalLiters; // Cost of milk itself
    const milkMargin = milkRevenue - milkCost;
    const transformationMargin = productRevenue - processingCost - milkCost;

    setResults({
      total_liters: totalLiters || 0,
      total_product_kg: totalProductKg || 0,
      product_revenue: productRevenue || 0,
      processing_cost: processingCost || 0,
      milk_revenue: milkRevenue || 0,
      milk_margin: milkMargin || 0,
      transformation_margin: transformationMargin || 0,
      better_option: transformationMargin > milkMargin ? 'transformación' : 'venta_directa',
    });
  };

  const comparisonData = results ? [
    { 
      name: t('directSale'), 
      [t('income')]: Number(results.milk_revenue) || 0, 
      [t('totalCosts')]: Number(results.milk_revenue - results.milk_margin) || 0, 
      [t('margin')]: Number(results.milk_margin) || 0 
    },
    { 
      name: t('transformation'), 
      [t('income')]: Number(results.product_revenue) || 0, 
      [t('totalCosts')]: Number(results.product_revenue - results.transformation_margin) || 0, 
      [t('margin')]: Number(results.transformation_margin) || 0 
    },
  ].filter(item => !isNaN(item[t('income')]) && !isNaN(item[t('totalCosts')]) && !isNaN(item[t('margin')])) : [];

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          {t('backToDashboard')}
        </button>
        <h1 style={{ marginTop: '20px' }}>{t('module2Title')}</h1>
      </header>

      <div className="card">
        <h2>{t('selectScenario')}</h2>
        <select
          value={selectedScenario?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (id) {
              navigate(`/module2`, { state: { scenarioId: id }, replace: true });
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
            <div style={{ marginBottom: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
              <p style={{ margin: 0, fontSize: '0.9em', color: '#2e7d32', fontWeight: '500' }}>
                📊 <strong>{t('note')}:</strong> {t('inheritedDataNote')}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('dailyProduction')} 🔒</label>
                <input
                  type="number"
                  name="daily_production_liters"
                  value={productionData.daily_production_liters}
                  readOnly
                  disabled
                  style={{ background: '#f5f5f5', cursor: 'not-allowed', color: '#666' }}
                  step="0.01"
                />
                <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                  {t('inheritedFromModule1')}
                </small>
              </div>
              <div className="form-group">
                <label>{t('productionDays')} 🔒</label>
                <input
                  type="number"
                  name="production_days"
                  value={productionData.production_days}
                  readOnly
                  disabled
                  style={{ background: '#f5f5f5', cursor: 'not-allowed', color: '#666' }}
                />
                <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                  {t('inheritedFromModule1')}
                </small>
              </div>
              <div className="form-group">
                <label>{t('animalsCount')} 🔒</label>
                <input
                  type="number"
                  name="animals_count"
                  value={productionData.animals_count}
                  readOnly
                  disabled
                  style={{ background: '#f5f5f5', cursor: 'not-allowed', color: '#666' }}
                />
                <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                  {t('inheritedFromModule1')}
                </small>
              </div>
              <div className="form-group">
                <label>{t('milkPriceForComparison')} 🔒</label>
                <input
                  type="number"
                  name="milk_price_per_liter"
                  value={productionData.milk_price_per_liter}
                  readOnly
                  disabled
                  style={{ background: '#f5f5f5', cursor: 'not-allowed', color: '#666' }}
                  step="0.01"
                />
                <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                  {t('inheritedFromModule1')}
                </small>
              </div>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('transformationData')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('productType')}</label>
                <select
                  name="product_type"
                  value={transformationData.product_type}
                  onChange={handleTransformationChange}
                >
                  <option value="queso_fresco">{t('productTypes.queso_fresco')}</option>
                  <option value="queso_crema">{t('productTypes.queso_crema')}</option>
                  <option value="queso_semimadurado">{t('productTypes.queso_semimadurado')}</option>
                  <option value="queso_madurado">{t('productTypes.queso_madurado')}</option>
                  <option value="yogurt">{t('productTypes.yogurt')}</option>
                  <option value="otro">{t('productTypes.otro')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('litersPerKg')}</label>
                <input
                  type="number"
                  name="liters_per_kg_product"
                  value={transformationData.liters_per_kg_product}
                  onChange={handleTransformationChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('processingCost')}</label>
                <input
                  type="number"
                  name="processing_cost_per_liter"
                  value={transformationData.processing_cost_per_liter}
                  onChange={handleTransformationChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('productPrice')}</label>
                <input
                  type="number"
                  name="product_price_per_kg"
                  value={transformationData.product_price_per_kg}
                  onChange={handleTransformationChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
                <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>
                  {t('legacyFallback')}
                </small>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', background: '#f0f7ff', borderRadius: '8px', border: '1px solid #bde0ff' }}>
              <p style={{ margin: 0, fontSize: '0.9em', color: '#0066cc' }}>
                <strong>{t('note')}:</strong> {t('productMixNote')}
              </p>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('salesChannels')}</h3>
            {(() => {
              const totalPercentage = parseFloat(transformationData.sales_channel_direct_percentage || 0) + 
                                      parseFloat(transformationData.sales_channel_distributors_percentage || 0) + 
                                      parseFloat(transformationData.sales_channel_third_percentage || 0);
              return (
                <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#666' }}>
                    {t('configureChannels')}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong>{t('total')}:</strong>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: totalPercentage === 100 ? 'green' : 'red'
                    }}>
                      {totalPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('directSalePercentage')}</label>
                <input
                  type="number"
                  name="sales_channel_direct_percentage"
                  value={transformationData.sales_channel_direct_percentage}
                  onChange={handleTransformationChange}
                  onFocus={handleInputFocus}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('directSalePrice')}</label>
                <input
                  type="number"
                  name="direct_sale_price_per_kg"
                  value={transformationData.direct_sale_price_per_kg}
                  onChange={handleTransformationChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('distributorsPercentage')}</label>
                <input
                  type="number"
                  name="sales_channel_distributors_percentage"
                  value={transformationData.sales_channel_distributors_percentage}
                  onChange={handleTransformationChange}
                  onFocus={handleInputFocus}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('distributorsPrice')}</label>
                <input
                  type="number"
                  name="distributors_price_per_kg"
                  value={transformationData.distributors_price_per_kg}
                  onChange={handleTransformationChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{t('thirdChannelPercentage')}</label>
                <input
                  type="number"
                  name="sales_channel_third_percentage"
                  value={transformationData.sales_channel_third_percentage}
                  onChange={handleTransformationChange}
                  onFocus={handleInputFocus}
                  min="0"
                  max="100"
                  step="0.01"
                  readOnly
                  style={{ background: '#f0f0f0' }}
                />
                <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>{t('autoCalculated')}</small>
              </div>
              <div className="form-group">
                <label>{t('thirdChannelPrice')}</label>
                <input
                  type="number"
                  name="third_channel_price_per_kg"
                  value={transformationData.third_channel_price_per_kg}
                  onChange={handleTransformationChange}
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
              {/* Cost Breakdown Section */}
              <div className="card">
                <h2>{t('productionCostBreakdown')}</h2>
                {(() => {
                  const litersPerKg = Number(transformationData.liters_per_kg_product) || 0;
                  const milkPrice = Number(productionData.milk_price_per_liter) || 0;
                  const processingCost = Number(transformationData.processing_cost_per_liter) || 0;
                  
                  const milkCostPerKg = milkPrice * litersPerKg;
                  const processingCostPerKg = processingCost * litersPerKg;
                  const totalCostPerKg = milkCostPerKg + processingCostPerKg;
                  
                  return (
                    <div style={{ marginBottom: '20px' }}>
                      <table className="table">
                        <tbody>
                          <tr>
                            <td><strong>{t('milkCostPerKg')}</strong></td>
                            <td>${milkCostPerKg.toFixed(2)} ({litersPerKg.toFixed(2)} L × ${milkPrice.toFixed(2)}/L)</td>
                          </tr>
                          <tr>
                            <td><strong>{t('processingCostPerKg')}</strong></td>
                            <td>${processingCostPerKg.toFixed(2)} ({litersPerKg.toFixed(2)} L × ${processingCost.toFixed(2)}/L)</td>
                          </tr>
                          <tr style={{ borderTop: '2px solid #333' }}>
                            <td><strong>{t('totalCostPerKg')}</strong></td>
                            <td><strong>${totalCostPerKg.toFixed(2)}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Channel Margins Section */}
              <div className="card">
                <h2>{t('channelMargins')}</h2>
                {(() => {
                  const litersPerKg = Number(transformationData.liters_per_kg_product) || 0;
                  const milkPrice = Number(productionData.milk_price_per_liter) || 0;
                  const processingCost = Number(transformationData.processing_cost_per_liter) || 0;
                  
                  const milkCostPerKg = milkPrice * litersPerKg;
                  const processingCostPerKg = processingCost * litersPerKg;
                  const totalCostPerKg = milkCostPerKg + processingCostPerKg;
                  
                  const channels = [
                    {
                      name: t('salesChannelDirect'),
                      percentage: Number(transformationData.sales_channel_direct_percentage) || 0,
                      price: Number(transformationData.direct_sale_price_per_kg) || 0
                    },
                    {
                      name: t('salesChannelDistributors'),
                      percentage: Number(transformationData.sales_channel_distributors_percentage) || 0,
                      price: Number(transformationData.distributors_price_per_kg) || 0
                    },
                    {
                      name: t('salesChannelThird'),
                      percentage: Number(transformationData.sales_channel_third_percentage) || 0,
                      price: Number(transformationData.third_channel_price_per_kg) || 0
                    }
                  ];
                  
                  return (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>{t('concept')}</th>
                          <th>% {t('salesChannels')}</th>
                          <th>{t('salesPrice')}</th>
                          <th>{t('productionCost')}</th>
                          <th>{t('marginPerKg')}</th>
                          <th>{t('marginPercent')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {channels.map((channel, idx) => {
                          const margin = channel.price - totalCostPerKg;
                          const marginPercent = channel.price > 0 ? (margin / channel.price) * 100 : 0;
                          return (
                            <tr key={idx} style={{ opacity: channel.percentage === 0 ? 0.5 : 1 }}>
                              <td><strong>{channel.name}</strong></td>
                              <td>{channel.percentage.toFixed(1)}%</td>
                              <td>${channel.price.toFixed(2)}</td>
                              <td>${totalCostPerKg.toFixed(2)}</td>
                              <td style={{ color: margin >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                                ${margin.toFixed(2)}
                              </td>
                              <td style={{ color: marginPercent >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                                {marginPercent.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              <div className="card">
                <h2>{t('comparison')}</h2>
                <div style={{ marginBottom: '20px', padding: '15px', background: '#fff9e6', borderRadius: '8px', border: '1px solid #ffe066' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.95em', fontWeight: 'bold', color: '#996600' }}>
                    📊 {t('note')}: {t('whatAreWeComparing')}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em', color: '#666' }}>
                    <li><strong>{t('directSale')}:</strong> {t('directSaleExplanation')}</li>
                    <li><strong>{t('transformation')}:</strong> {t('transformationExplanation')}</li>
                    <li><strong>{t('assumptions')}:</strong> {t('assumptionsExplanation')}</li>
                    <li><strong>{t('costsIncluded')}:</strong> {t('costsIncludedExplanation')}</li>
                  </ul>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('concept')}</th>
                      <th>{t('directSale')}</th>
                      <th>{t('transformation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>{t('income')}</strong></td>
                      <td>${results.milk_revenue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>${results.product_revenue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('margin')}</strong></td>
                      <td>${results.milk_margin?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>${results.transformation_margin?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('difference')}</strong></td>
                      <td colSpan="2">
                        ${Math.abs(results.transformation_margin - results.milk_margin)?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        {' '}({results.better_option === 'transformación' ? t('betterTransform') : t('betterSellDirect')})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>{t('visualization')}</h2>
                <h3 style={{ marginBottom: '15px' }}>{t('optionsComparison')}</h3>
                {comparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
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
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p style={{ color: '#666', margin: 0 }}>{t('noDataToShow')}</p>
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

export default Module2Transformation;
