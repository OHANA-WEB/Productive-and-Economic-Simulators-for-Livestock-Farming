import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';

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

  useEffect(() => {
    loadScenarios();
    if (scenarioId) {
      loadScenario(scenarioId);
    }
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
      if (scenario.productionData) {
        // Normalize all numeric values to ensure no leading zeros
        // Ensure all production data fields are loaded (for proper data propagation)
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
      }
      if (scenario.transformationData) {
        // Ensure all transformation data fields are set with defaults
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
    // Select all text when focused if value is 0, so user can immediately type to replace it
    if (parseFloat(e.target.value) === 0) {
      e.target.select();
    }
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
      alert(t('pleaseSelectScenario'));
      return;
    }

    setLoading(true);
    try {
      // Save production data first
      await api.post(`/modules/production/${selectedScenario.id}`, productionData);
      // Then save transformation data
      await api.post(`/modules/transformation/${selectedScenario.id}`, transformationData);
      await loadScenario(selectedScenario.id);
      alert(t('dataSaved'));
    } catch (error) {
      alert(error.response?.data?.error || t('errorSaving'));
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    const totalLiters = productionData.daily_production_liters * productionData.production_days * productionData.animals_count;
    const totalProductKg = totalLiters / (transformationData.liters_per_kg_product || 1);
    const processingCost = transformationData.processing_cost_per_liter * totalLiters;
    const productRevenue = transformationData.product_price_per_kg * totalProductKg;
    
    // Compare with direct milk sale
    const milkRevenue = productionData.milk_price_per_liter * totalLiters;
    const costPerLiter = 0.5; // Simplified - should come from production costs
    const milkCosts = costPerLiter * totalLiters;
    const milkMargin = milkRevenue - milkCosts;
    const transformationMargin = productRevenue - processingCost - milkCosts;

    setResults({
      total_liters: totalLiters,
      total_product_kg: totalProductKg,
      product_revenue: productRevenue,
      processing_cost: processingCost,
      milk_revenue: milkRevenue,
      milk_margin: milkMargin,
      transformation_margin: transformationMargin,
      better_option: transformationMargin > milkMargin ? 'transformación' : 'venta_directa',
    });
  };

  const comparisonData = results ? [
    { name: t('directSale'), Ingresos: results.milk_revenue, Costos: results.milk_revenue - results.milk_margin, Margen: results.milk_margin },
    { name: t('transformation'), Ingresos: results.product_revenue, Costos: results.product_revenue - results.transformation_margin, Margen: results.transformation_margin },
  ] : [];

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
                <label>{t('milkPriceForComparison')}</label>
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
                  <option value="queso_madurado">{t('productTypes.queso_madurado')}</option>
                  <option value="yogurt">{t('productTypes.yogurt')}</option>
                  <option value="mantequilla">{t('productTypes.mantequilla')}</option>
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
                  {t('productPrice')} (legacy - used as fallback if channel prices not set)
                </small>
              </div>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('salesChannels')}</h3>
            {(() => {
              const totalPercentage = parseFloat(transformationData.sales_channel_direct_percentage || 0) + 
                                      parseFloat(transformationData.sales_channel_distributors_percentage || 0) + 
                                      parseFloat(transformationData.sales_channel_third_percentage || 0);
              return (
                <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#666' }}>
                    Configure the distribution across 3 sales channels. Percentages must sum to 100%.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong>Total:</strong>
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
                <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>Auto-calculated</small>
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
              <div className="card">
                <h2>{t('comparison')}</h2>
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="#8884d8" />
                    <Bar dataKey="Costos" fill="#ffc658" />
                    <Bar dataKey="Margen" fill="#82ca9d" />
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

export default Module2Transformation;
