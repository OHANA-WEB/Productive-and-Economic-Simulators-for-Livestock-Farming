import { useState, useEffect, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Area } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';
import { useChartColors } from '../../hooks/useDarkMode';

function Module2Transformation({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;
  const chartColors = useChartColors();

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

  // Product Mix: Support multiple products with distribution percentages
  const [products, setProducts] = useState([
    {
      id: Date.now(), // Temporary ID for React key
      product_type: 'queso_fresco',
      product_type_custom: '',
      distribution_percentage: '100',
      liters_per_kg_product: '',
      processing_cost_per_liter: '',
      processing_cost_per_kg: '',
      processing_cost_unit: 'liter', // 'liter' or 'kg'
      packaging_cost_per_liter: '',
      packaging_cost_per_kg: '',
      packaging_cost_unit: 'kg', // 'liter' or 'kg'
      sales_channel_direct_percentage: '100',
      sales_channel_distributors_percentage: '',
      sales_channel_third_percentage: '',
      direct_sale_price_per_kg: '',
      distributors_price_per_kg: '',
      third_channel_price_per_kg: '',
    }
  ]);
  
  // Legacy single product state (for backward compatibility during migration)
  const [transformationData, setTransformationData] = useState({
    product_type: 'queso_fresco',
    product_type_custom: '',
    liters_per_kg_product: '',
    processing_cost_per_liter: '',
    packaging_cost_per_kg: '',
    product_price_per_kg: '',
    sales_channel_direct_percentage: '100',
    sales_channel_distributors_percentage: '',
    sales_channel_third_percentage: '',
    direct_sale_price_per_kg: '',
    distributors_price_per_kg: '',
    third_channel_price_per_kg: '',
  });

  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [chartViewType, setChartViewType] = useState('grouped'); // 'grouped', 'donut', 'stacked', 'waterfall'
  const [expandedChannels, setExpandedChannels] = useState({}); // Track which channels have expanded product details
  const [marginViewMode, setMarginViewMode] = useState('dollars'); // 'dollars' or 'percent' for charts

  useEffect(() => {
    const initialize = async () => {
      await loadScenarios();
      if (scenarioId) {
        await loadScenario(scenarioId);
      }
    };
    initialize();
  }, [scenarioId]);

  // Auto-calculate results when data is loaded and we have products
  // But only if results are not already loaded from saved scenario
  useEffect(() => {
    if (selectedScenario && products.length > 0 && productionData.daily_production_liters > 0) {
      // Only calculate if we don't have results yet
      // Results should be loaded from scenario.results in loadScenario
      if (!results) {
        handleCalculate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenario, products, productionData.daily_production_liters]);

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
      
      // Load transformation products (Product Mix) or fall back to legacy single product
      const convertToInputValue = (value) => {
        if (value === null || value === undefined || value === '') return '';
        const num = typeof value === 'number' ? value : parseFloat(value);
        return isNaN(num) || num === 0 ? '' : num.toString();
      };
      
      if (scenario.transformationProducts && scenario.transformationProducts.length > 0) {
        // New Product Mix format
        const loadedProducts = scenario.transformationProducts.map((product, index) => ({
          id: product.id || Date.now() + index,
          product_type: product.product_type || 'queso_fresco',
          product_type_custom: product.product_type_custom || '',
          distribution_percentage: convertToInputValue(product.distribution_percentage) || '',
          liters_per_kg_product: convertToInputValue(product.liters_per_kg_product),
          processing_cost_per_liter: convertToInputValue(product.processing_cost_per_liter),
          processing_cost_per_kg: convertToInputValue(product.processing_cost_per_kg),
          processing_cost_unit: product.processing_cost_unit || 'liter',
          packaging_cost_per_liter: convertToInputValue(product.packaging_cost_per_liter),
          packaging_cost_per_kg: convertToInputValue(product.packaging_cost_per_kg),
          packaging_cost_unit: product.packaging_cost_unit || 'kg',
          sales_channel_direct_percentage: convertToInputValue(product.sales_channel_direct_percentage) || '100',
          sales_channel_distributors_percentage: convertToInputValue(product.sales_channel_distributors_percentage),
          sales_channel_third_percentage: convertToInputValue(product.sales_channel_third_percentage),
          direct_sale_price_per_kg: convertToInputValue(product.direct_sale_price_per_kg),
          distributors_price_per_kg: convertToInputValue(product.distributors_price_per_kg),
          third_channel_price_per_kg: convertToInputValue(product.third_channel_price_per_kg),
        }));
        setProducts(loadedProducts);
      } else if (scenario.transformationData) {
        // Legacy single product format - convert to Product Mix format
        setProducts([{
          id: Date.now(),
          product_type: scenario.transformationData.product_type || 'queso_fresco',
          product_type_custom: scenario.transformationData.product_type_custom || '',
          distribution_percentage: '100',
          liters_per_kg_product: convertToInputValue(scenario.transformationData.liters_per_kg_product),
          processing_cost_per_liter: convertToInputValue(scenario.transformationData.processing_cost_per_liter),
          packaging_cost_per_kg: convertToInputValue(scenario.transformationData.packaging_cost_per_kg),
          sales_channel_direct_percentage: convertToInputValue(scenario.transformationData.sales_channel_direct_percentage) || '100',
          sales_channel_distributors_percentage: convertToInputValue(scenario.transformationData.sales_channel_distributors_percentage),
          sales_channel_third_percentage: convertToInputValue(scenario.transformationData.sales_channel_third_percentage),
          direct_sale_price_per_kg: convertToInputValue(scenario.transformationData.direct_sale_price_per_kg),
          distributors_price_per_kg: convertToInputValue(scenario.transformationData.distributors_price_per_kg),
          third_channel_price_per_kg: convertToInputValue(scenario.transformationData.third_channel_price_per_kg),
        }]);
        
        // Also set legacy state for backward compatibility
        setTransformationData({
          product_type: scenario.transformationData.product_type || 'queso_fresco',
          product_type_custom: scenario.transformationData.product_type_custom || '',
          liters_per_kg_product: convertToInputValue(scenario.transformationData.liters_per_kg_product),
          processing_cost_per_liter: convertToInputValue(scenario.transformationData.processing_cost_per_liter),
          packaging_cost_per_kg: convertToInputValue(scenario.transformationData.packaging_cost_per_kg),
          product_price_per_kg: convertToInputValue(scenario.transformationData.product_price_per_kg),
          sales_channel_direct_percentage: convertToInputValue(scenario.transformationData.sales_channel_direct_percentage) || '100',
          sales_channel_distributors_percentage: convertToInputValue(scenario.transformationData.sales_channel_distributors_percentage),
          sales_channel_third_percentage: convertToInputValue(scenario.transformationData.sales_channel_third_percentage),
          direct_sale_price_per_kg: convertToInputValue(scenario.transformationData.direct_sale_price_per_kg),
          distributors_price_per_kg: convertToInputValue(scenario.transformationData.distributors_price_per_kg),
          third_channel_price_per_kg: convertToInputValue(scenario.transformationData.third_channel_price_per_kg),
        });
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
        if (normalizedResults.product_revenue || normalizedResults.transformation_margin) {
          // Silently load results - user will see them in the UI
        }
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  // Production data is now read-only and inherited from Module 1
  // No need for handleProductionChange anymore

  const handleInputFocus = (e) => {
    // Only select all text if field has a value, otherwise allow typing from scratch
    if (e.target.value && e.target.value !== '') {
      e.target.select();
    }
  };

  const handleTransformationChange = (e) => {
    const { name, value } = e.target;
    
    // Handle string fields (product_type, product_type_custom)
    if (name === 'product_type' || name === 'product_type_custom') {
      setTransformationData(prev => ({
        ...prev,
        [name]: value,
      }));
      return;
    }
    
    // Handle empty string - keep as empty string for free typing
    if (value === '' || value === null || value === undefined) {
      setTransformationData(prev => ({
        ...prev,
        [name]: '',
      }));
      return;
    }
    
    // Allow valid numeric input (including decimals)
    // Keep as string to allow free typing
    const validNumberPattern = /^-?\d*\.?\d*$/;
    if (!validNumberPattern.test(value)) {
      return; // Ignore invalid input
    }
    
    // Handle sales channel percentages - ensure they sum to 100
    if (name.includes('_percentage')) {
      const numValue = parseFloat(value) || 0;
      setTransformationData(prev => {
        const updated = { ...prev, [name]: value };
        
        // Calculate the third percentage to ensure sum is 100
        const directPct = name === 'sales_channel_direct_percentage' ? numValue : parseFloat(prev.sales_channel_direct_percentage) || 0;
        const distPct = name === 'sales_channel_distributors_percentage' ? numValue : parseFloat(prev.sales_channel_distributors_percentage) || 0;
        const thirdPct = name === 'sales_channel_third_percentage' ? numValue : parseFloat(prev.sales_channel_third_percentage) || 0;
        
        if (name === 'sales_channel_direct_percentage') {
          const remaining = 100 - numValue - distPct;
          updated.sales_channel_third_percentage = remaining >= 0 ? remaining.toString() : '0';
        } else if (name === 'sales_channel_distributors_percentage') {
          const remaining = 100 - directPct - numValue;
          updated.sales_channel_third_percentage = remaining >= 0 ? remaining.toString() : '0';
        } else if (name === 'sales_channel_third_percentage') {
          // If user sets third, adjust direct to maintain sum
          const remaining = 100 - directPct - distPct;
          if (remaining < 0) {
            const adjusted = Math.max(0, directPct + remaining);
            updated.sales_channel_direct_percentage = adjusted.toString();
          }
        }
        
        return updated;
      });
    } else {
      // Update numeric fields - keep as string
      setTransformationData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Product Mix handlers
  const handleAddProduct = () => {
    setProducts(prev => [...prev, {
      id: Date.now() + Math.random(),
      product_type: 'queso_fresco',
      product_type_custom: '',
      distribution_percentage: '',
      liters_per_kg_product: '',
      processing_cost_per_liter: '',
      processing_cost_per_kg: '',
      processing_cost_unit: 'liter',
      packaging_cost_per_liter: '',
      packaging_cost_per_kg: '',
      packaging_cost_unit: 'kg',
      sales_channel_direct_percentage: '100',
      sales_channel_distributors_percentage: '',
      sales_channel_third_percentage: '',
      direct_sale_price_per_kg: '',
      distributors_price_per_kg: '',
      third_channel_price_per_kg: '',
    }]);
  };

  const handleRemoveProduct = (productId) => {
    if (products.length <= 1) {
      setAlertModal({
        isOpen: true,
        message: t('atLeastOneProductRequired'),
        type: 'info'
      });
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleProductChange = (productId, fieldName, value) => {
    // Handle string fields (product_type, product_type_custom, unit fields) - no validation needed
    if (fieldName === 'product_type' || fieldName === 'product_type_custom' || 
        fieldName === 'processing_cost_unit' || fieldName === 'packaging_cost_unit') {
      setProducts(prev => prev.map(product => 
        product.id === productId ? { ...product, [fieldName]: value } : product
      ));
      return;
    }
    
    // Handle empty string - keep as empty string for free typing
    if (value === '' || value === null || value === undefined) {
      setProducts(prev => prev.map(product => 
        product.id === productId ? { ...product, [fieldName]: '' } : product
      ));
      return;
    }
    
    // Allow valid numeric input (including decimals)
    const validNumberPattern = /^-?\d*\.?\d*$/;
    if (!validNumberPattern.test(value)) {
      return; // Ignore invalid input
    }
    
    setProducts(prev => prev.map(product => {
      if (product.id !== productId) return product;
      
      const updated = { ...product, [fieldName]: value };
      
      // Handle sales channel percentages per product - auto-adjust third channel
      if (fieldName.includes('_percentage') && fieldName.startsWith('sales_channel_')) {
        const numValue = parseFloat(value) || 0;
        const directPct = fieldName === 'sales_channel_direct_percentage' ? numValue : parseFloat(product.sales_channel_direct_percentage) || 0;
        const distPct = fieldName === 'sales_channel_distributors_percentage' ? numValue : parseFloat(product.sales_channel_distributors_percentage) || 0;
        
        if (fieldName === 'sales_channel_direct_percentage') {
          const remaining = 100 - numValue - distPct;
          updated.sales_channel_third_percentage = remaining >= 0 ? remaining.toString() : '0';
        } else if (fieldName === 'sales_channel_distributors_percentage') {
          const remaining = 100 - directPct - numValue;
          updated.sales_channel_third_percentage = remaining >= 0 ? remaining.toString() : '0';
        } else if (fieldName === 'sales_channel_third_percentage') {
          // If user manually sets third, adjust direct to maintain sum
          const remaining = 100 - directPct - distPct;
          if (remaining < 0) {
            const adjusted = Math.max(0, directPct + remaining);
            updated.sales_channel_direct_percentage = adjusted.toString();
          }
        }
      }
      
      return updated;
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

    // Validate distribution percentages sum to 100%
    const totalPercentage = products.reduce((sum, p) => sum + (parseFloat(p.distribution_percentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      setAlertModal({
        isOpen: true,
        message: t('distributionMustSum100').replace('{total}', totalPercentage.toFixed(2)),
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      // Convert products array to numbers before sending to API
      const productsToSave = products.map(product => ({
        product_type: product.product_type,
        product_type_custom: product.product_type_custom || null,
        distribution_percentage: parseFloat(product.distribution_percentage) || 0,
        liters_per_kg_product: parseFloat(product.liters_per_kg_product) || 0,
        processing_cost_per_liter: parseFloat(product.processing_cost_per_liter) || 0,
        processing_cost_per_kg: parseFloat(product.processing_cost_per_kg) || 0,
        processing_cost_unit: product.processing_cost_unit || 'liter',
        packaging_cost_per_liter: parseFloat(product.packaging_cost_per_liter) || 0,
        packaging_cost_per_kg: parseFloat(product.packaging_cost_per_kg) || 0,
        packaging_cost_unit: product.packaging_cost_unit || 'kg',
        sales_channel_direct_percentage: parseFloat(product.sales_channel_direct_percentage) || 100,
        sales_channel_distributors_percentage: parseFloat(product.sales_channel_distributors_percentage) || 0,
        sales_channel_third_percentage: parseFloat(product.sales_channel_third_percentage) || 0,
        direct_sale_price_per_kg: parseFloat(product.direct_sale_price_per_kg) || null,
        distributors_price_per_kg: parseFloat(product.distributors_price_per_kg) || null,
        third_channel_price_per_kg: parseFloat(product.third_channel_price_per_kg) || null,
      }));
      
      // Send as Product Mix format (array of products)
      await api.post(`/modules/transformation/${selectedScenario.id}`, { products: productsToSave });
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
    // Calculate total milk production cost per liter (inherited from Module 1)
    const feedCost = Number(productionData.feed_cost_per_liter) || 0;
    const laborCost = Number(productionData.labor_cost_per_liter) || 0;
    const healthCost = Number(productionData.health_cost_per_liter) || 0;
    const infrastructureCost = Number(productionData.infrastructure_cost_per_liter) || 0;
    const otherCost = Number(productionData.other_costs_per_liter) || 0;
    const totalMilkProductionCostPerLiter = feedCost + laborCost + healthCost + infrastructureCost + otherCost;
    
    const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);
    
    // Calculate for Product Mix (multiple products)
    let totalProductRevenue = 0;
    let totalProcessingCost = 0;
    let totalPackagingCost = 0;
    let totalProductKg = 0;
    
    for (const product of products) {
      const distributionPct = parseFloat(product.distribution_percentage) || 0;
      const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;
      
      // Unit selection: processing and packaging costs can be per liter or per kg
      const processingCostUnit = product.processing_cost_unit || 'liter';
      const packagingCostUnit = product.packaging_cost_unit || 'kg';
      const processingCostPerLiter = parseFloat(product.processing_cost_per_liter) || 0;
      const processingCostPerKg = parseFloat(product.processing_cost_per_kg) || 0;
      const packagingCostPerLiter = parseFloat(product.packaging_cost_per_liter) || 0;
      const packagingCostPerKg = parseFloat(product.packaging_cost_per_kg) || 0;
      
      // Calculate liters allocated to this product
      const productLiters = totalLiters * (distributionPct / 100);
      const productKg = productLiters / litersPerKg;
      
      // Calculate costs based on unit selection
      let productProcessingCost = 0;
      if (processingCostUnit === 'liter') {
        productProcessingCost = processingCostPerLiter * productLiters;
      } else if (processingCostUnit === 'kg') {
        productProcessingCost = processingCostPerKg * productKg;
      }
      
      let productPackagingCost = 0;
      if (packagingCostUnit === 'liter') {
        productPackagingCost = packagingCostPerLiter * productLiters;
      } else if (packagingCostUnit === 'kg') {
        productPackagingCost = packagingCostPerKg * productKg;
      }
      
      // Calculate revenue by sales channel for this product
      const directPct = (parseFloat(product.sales_channel_direct_percentage) || 0) / 100;
      const distPct = (parseFloat(product.sales_channel_distributors_percentage) || 0) / 100;
      const thirdPct = (parseFloat(product.sales_channel_third_percentage) || 0) / 100;
      
      const directPrice = parseFloat(product.direct_sale_price_per_kg) || 0;
      const distPrice = parseFloat(product.distributors_price_per_kg) || 0;
      const thirdPrice = parseFloat(product.third_channel_price_per_kg) || 0;
      
      const directKg = productKg * directPct;
      const distKg = productKg * distPct;
      const thirdKg = productKg * thirdPct;
      
      const directRevenue = directPrice * directKg;
      const distRevenue = distPrice * distKg;
      const thirdRevenue = thirdPrice * thirdKg;
      const productRevenue = directRevenue + distRevenue + thirdRevenue;
      
      totalProductRevenue += productRevenue;
      totalProcessingCost += productProcessingCost;
      totalPackagingCost += productPackagingCost;
      totalProductKg += productKg;
    }
    
    // Compare with direct milk sale
    const milkRevenue = (productionData.milk_price_per_liter || 0) * totalLiters;
    const milkProductionCost = totalMilkProductionCostPerLiter * totalLiters;
    const milkMargin = milkRevenue - milkProductionCost;
    const transformationMargin = totalProductRevenue - totalProcessingCost - totalPackagingCost - milkProductionCost;

    setResults({
      total_liters: totalLiters || 0,
      total_product_kg: totalProductKg || 0,
      product_revenue: totalProductRevenue || 0,
      processing_cost: totalProcessingCost || 0,
      packaging_cost: totalPackagingCost || 0,
      milk_revenue: milkRevenue || 0,
      milk_margin: milkMargin || 0,
      transformation_margin: transformationMargin || 0,
      better_option: transformationMargin > milkMargin ? 'transformación' : 'venta_directa',
    });
  };

  const comparisonData = results ? [
    { 
      name: t('rawMilkSale'), 
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
        <h1 style={{ marginTop: '20px' }}>{t('module2Title')}</h1>
        <div style={{ 
          marginTop: '16px', 
          padding: '18px 24px', 
          background: 'var(--bg-tertiary)', 
          borderRadius: '12px',
          borderLeft: '4px solid var(--accent-info)',
          boxShadow: '0 2px 8px var(--shadow-color)'
        }}>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
            ℹ️ {t('module2Explanation')}
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
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(22, 163, 74, 0.1)', borderRadius: '8px', border: '1px solid var(--accent-success)' }}>
              <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--accent-success)', fontWeight: '500' }}>
                📊 <strong>{t('note')}:</strong> {t('inheritedDataNote')}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <div className="form-group" style={{ display: 'grid', gridTemplateRows: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
                <label style={{ gridRow: '1', alignSelf: 'start' }}>{t('dailyProduction')} 🔒</label>
                <input
                  type="number"
                  name="daily_production_liters"
                  value={productionData.daily_production_liters}
                  readOnly
                  disabled
                  style={{ gridRow: '2', background: 'var(--bg-tertiary)', cursor: 'not-allowed', color: 'var(--text-tertiary)', width: '100%', height: '40px' }}
                  step="0.01"
                />
                <small style={{ gridRow: '3', color: 'var(--text-tertiary)', fontSize: '0.85em', height: '20px' }}>
                  {t('inheritedFromModule1')}
                </small>
              </div>
              <div className="form-group" style={{ display: 'grid', gridTemplateRows: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
                <label style={{ gridRow: '1', alignSelf: 'start' }}>{t('productionDays')} 🔒</label>
                <input
                  type="number"
                  name="production_days"
                  value={productionData.production_days}
                  readOnly
                  disabled
                  style={{ gridRow: '2', background: 'var(--bg-tertiary)', cursor: 'not-allowed', color: 'var(--text-tertiary)', width: '100%', height: '40px' }}
                />
                <small style={{ gridRow: '3', color: 'var(--text-tertiary)', fontSize: '0.85em', height: '20px' }}>
                  {t('inheritedFromModule1')}
                </small>
              </div>
              <div className="form-group" style={{ display: 'grid', gridTemplateRows: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
                <label style={{ gridRow: '1', alignSelf: 'start' }}>{t('animalsCount')} 🔒</label>
                <input
                  type="number"
                  name="animals_count"
                  value={productionData.animals_count}
                  readOnly
                  disabled
                  style={{ gridRow: '2', background: 'var(--bg-tertiary)', cursor: 'not-allowed', color: 'var(--text-tertiary)', width: '100%', height: '40px' }}
                />
                <small style={{ gridRow: '3', color: 'var(--text-tertiary)', fontSize: '0.85em', height: '20px' }}>
                  {t('inheritedFromModule1')}
                </small>
              </div>
              <div className="form-group" style={{ display: 'grid', gridTemplateRows: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
                <label style={{ gridRow: '1', alignSelf: 'start' }}>{t('milkPriceForComparison')} 🔒</label>
                <input
                  type="number"
                  name="milk_price_per_liter"
                  value={productionData.milk_price_per_liter}
                  readOnly
                  disabled
                  style={{ gridRow: '2', background: 'var(--bg-tertiary)', cursor: 'not-allowed', color: 'var(--text-tertiary)', width: '100%', height: '40px' }}
                  step="0.01"
                />
                <small style={{ gridRow: '3', color: 'var(--text-tertiary)', fontSize: '0.85em', height: '20px' }}>
                  {t('inheritedFromModule1')}
                </small>
              </div>
              <div className="form-group" style={{ display: 'grid', gridTemplateRows: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
                <label style={{ gridRow: '1', alignSelf: 'start' }}>{t('milkProductionCostPerLiter')} 🔒</label>
                <input
                  type="number"
                  name="milk_production_cost_per_liter"
                  value={(() => {
                    const feedCost = Number(productionData.feed_cost_per_liter) || 0;
                    const laborCost = Number(productionData.labor_cost_per_liter) || 0;
                    const healthCost = Number(productionData.health_cost_per_liter) || 0;
                    const infrastructureCost = Number(productionData.infrastructure_cost_per_liter) || 0;
                    const otherCost = Number(productionData.other_costs_per_liter) || 0;
                    return feedCost + laborCost + healthCost + infrastructureCost + otherCost;
                  })()}
                  readOnly
                  disabled
                  style={{ gridRow: '2', background: 'var(--bg-tertiary)', cursor: 'not-allowed', color: 'var(--text-tertiary)', width: '100%', height: '40px' }}
                  step="0.01"
                />
                <small style={{ gridRow: '3', color: 'var(--text-tertiary)', fontSize: '0.85em', height: '20px' }}>
                  {t('inheritedFromModule1')}
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>{t('productMix')}</h3>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={handleAddProduct}
                style={{ padding: '8px 16px', fontSize: '0.9em' }}
              >
                + {t('addProduct')}
              </button>
            </div>
            
            {/* Total Distribution Validation */}
            {(() => {
              const totalDistribution = products.reduce((sum, p) => sum + (parseFloat(p.distribution_percentage) || 0), 0);
              return (
                <div style={{ marginBottom: '20px', padding: '12px', background: totalDistribution === 100 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', borderRadius: '8px', border: `1px solid ${totalDistribution === 100 ? 'var(--accent-success)' : 'var(--accent-error)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ color: totalDistribution === 100 ? 'var(--accent-success)' : 'var(--accent-error)' }}>
                      {t('totalDistribution')}:
                    </strong>
                    <span style={{ 
                      fontWeight: 'bold', 
                      fontSize: '1.1em',
                      color: totalDistribution === 100 ? 'var(--accent-success)' : 'var(--accent-error)'
                    }}>
                      {totalDistribution.toFixed(2)}%
                    </span>
                  </div>
                  {totalDistribution !== 100 && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.85em', color: 'var(--accent-error)' }}>
                      {t('distributionMustSum100').replace('{total}', totalDistribution.toFixed(2))}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Products List */}
            {products.map((product, index) => (
              <div 
                key={product.id} 
                style={{ 
                  marginBottom: '30px', 
                  padding: '20px', 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
                    {t('products')} #{index + 1}
                    {product.product_type_custom && (
                      <span style={{ marginLeft: '10px', color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.9em' }}>
                        ({product.product_type_custom})
                      </span>
                    )}
                  </h4>
                  {products.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleRemoveProduct(product.id)}
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '0.85em',
                        background: 'var(--accent-error)',
                        color: 'var(--text-inverse)',
                        border: 'none'
                      }}
                    >
                      {t('removeProduct')}
                    </button>
                  )}
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '15px' 
                }}>
                  <div className="form-group">
                    <label>{t('productType')}</label>
                    <select
                      value={product.product_type}
                      onChange={(e) => handleProductChange(product.id, 'product_type', e.target.value)}
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
                    <label>{t('distributionPercentage')}</label>
                    <input
                      type="number"
                      value={product.distribution_percentage}
                      onChange={(e) => handleProductChange(product.id, 'distribution_percentage', e.target.value)}
                      onFocus={handleInputFocus}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>

                  {product.product_type === 'otro' && (
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>{t('customProductName')}</label>
                      <input
                        type="text"
                        value={product.product_type_custom || ''}
                        onChange={(e) => handleProductChange(product.id, 'product_type_custom', e.target.value)}
                        placeholder={t('enterProductName')}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>{t('litersPerKg')}</label>
                    <input
                      type="number"
                      value={product.liters_per_kg_product}
                      onChange={(e) => handleProductChange(product.id, 'liters_per_kg_product', e.target.value)}
                      onFocus={handleInputFocus}
                      step="0.01"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                      {t('processingCost')}
                    </label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                        <label style={{ fontSize: '0.85em', color: 'var(--text-tertiary)', fontWeight: '500' }}>Unidad:</label>
                        <select
                          value={product.processing_cost_unit || 'liter'}
                          onChange={(e) => handleProductChange(product.id, 'processing_cost_unit', e.target.value)}
                          style={{ 
                            padding: '8px 12px', 
                            border: '2px solid var(--border-color)', 
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            fontWeight: '600',
                            background: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--accent-success)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        >
                          <option value="liter">$/L (por litro)</option>
                          <option value="kg">$/kg (por kilogramo)</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <label style={{ fontSize: '0.85em', color: '#666', fontWeight: '500' }}>
                          Costo {product.processing_cost_unit === 'liter' ? 'por litro' : 'por kg'}:
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={product.processing_cost_unit === 'kg' ? product.processing_cost_per_kg : product.processing_cost_per_liter}
                            onChange={(e) => {
                              const field = product.processing_cost_unit === 'kg' ? 'processing_cost_per_kg' : 'processing_cost_per_liter';
                              handleProductChange(product.id, field, e.target.value);
                            }}
                            onFocus={handleInputFocus}
                            step="0.01"
                            placeholder={product.processing_cost_unit === 'liter' ? t('processingCostPlaceholderLiter') : t('processingCostPlaceholderKg')}
                            style={{ 
                              padding: '8px 45px 8px 12px', 
                              border: '2px solid var(--border-color)', 
                              borderRadius: '6px',
                              fontSize: '0.95em',
                              width: '100%'
                            }}
                          />
                          <span style={{ 
                            position: 'absolute', 
                            right: '12px', 
                            color: 'var(--text-tertiary)', 
                            fontWeight: '600',
                            fontSize: '0.9em',
                            pointerEvents: 'none'
                          }}>
                            {product.processing_cost_unit === 'liter' ? '$/L' : '$/kg'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '10px 12px', 
                      background: 'rgba(37, 99, 235, 0.1)',
                      borderRadius: '6px', 
                      border: '1px solid var(--accent-info)',
                      fontSize: '0.85em',
                      color: 'var(--accent-info)'
                    }}>
                      <strong>ℹ️ {t('note')}:</strong> {product.processing_cost_unit === 'liter' 
                        ? t('processingCostHelpLiter') 
                        : t('processingCostHelpKg')}
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                      {t('packagingCost')}
                    </label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                        <label style={{ fontSize: '0.85em', color: 'var(--text-tertiary)', fontWeight: '500' }}>Unidad:</label>
                        <select
                          value={product.packaging_cost_unit || 'kg'}
                          onChange={(e) => handleProductChange(product.id, 'packaging_cost_unit', e.target.value)}
                          style={{ 
                            padding: '8px 12px', 
                            border: '2px solid var(--border-color)', 
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            fontWeight: '600',
                            background: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--accent-success)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        >
                          <option value="liter">$/L (por litro)</option>
                          <option value="kg">$/kg (por kilogramo)</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <label style={{ fontSize: '0.85em', color: '#666', fontWeight: '500' }}>
                          Costo {product.packaging_cost_unit === 'liter' ? 'por litro' : 'por kg'}:
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={product.packaging_cost_unit === 'liter' ? product.packaging_cost_per_liter : product.packaging_cost_per_kg}
                            onChange={(e) => {
                              const field = product.packaging_cost_unit === 'liter' ? 'packaging_cost_per_liter' : 'packaging_cost_per_kg';
                              handleProductChange(product.id, field, e.target.value);
                            }}
                            onFocus={handleInputFocus}
                            step="0.01"
                            placeholder={product.packaging_cost_unit === 'liter' ? t('packagingCostPlaceholderLiter') : t('packagingCostPlaceholderKg')}
                            style={{ 
                              padding: '8px 45px 8px 12px', 
                              border: '2px solid var(--border-color)', 
                              borderRadius: '6px',
                              fontSize: '0.95em',
                              width: '100%'
                            }}
                          />
                          <span style={{ 
                            position: 'absolute', 
                            right: '12px', 
                            color: 'var(--text-tertiary)', 
                            fontWeight: '600',
                            fontSize: '0.9em',
                            pointerEvents: 'none'
                          }}>
                            {product.packaging_cost_unit === 'liter' ? '$/L' : '$/kg'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '10px 12px', 
                      background: 'rgba(22, 163, 74, 0.1)', 
                      borderRadius: '6px', 
                      border: '1px solid var(--accent-success)',
                      fontSize: '0.85em',
                      color: 'var(--accent-success)'
                    }}>
                      <strong>ℹ️ {t('note')}:</strong> {product.packaging_cost_unit === 'liter' 
                        ? t('packagingCostHelpLiter') 
                        : t('packagingCostHelpKg')}
                    </div>
                  </div>
                </div>

                {/* Sales Channels for this product */}
                <h4 style={{ marginTop: '25px', marginBottom: '15px', fontSize: '1em', color: 'var(--text-secondary)' }}>
                  {t('salesChannels')}
                </h4>
                <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '6px', border: '1px solid var(--accent-warning)', fontSize: '0.9em' }}>
                  <strong>📌 {t('note')}:</strong> {t('salesChannelsNote')}
                </div>
                {(() => {
                  const totalChannelPct = parseFloat(product.sales_channel_direct_percentage || 0) + 
                                          parseFloat(product.sales_channel_distributors_percentage || 0) + 
                                          parseFloat(product.sales_channel_third_percentage || 0);
                  return (
                    <div style={{ marginBottom: '15px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong>{t('total')}:</strong>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: totalChannelPct === 100 ? 'green' : 'red'
                        }}>
                          {totalChannelPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })()}
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '15px' 
                }}>
                  <div className="form-group">
                    <label>{t('directSalePercentage')}</label>
                    <input
                      type="number"
                      value={product.sales_channel_direct_percentage}
                      onChange={(e) => handleProductChange(product.id, 'sales_channel_direct_percentage', e.target.value)}
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
                      value={product.direct_sale_price_per_kg}
                      onChange={(e) => handleProductChange(product.id, 'direct_sale_price_per_kg', e.target.value)}
                      onFocus={handleInputFocus}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('distributorsPercentage')}</label>
                    <input
                      type="number"
                      value={product.sales_channel_distributors_percentage}
                      onChange={(e) => handleProductChange(product.id, 'sales_channel_distributors_percentage', e.target.value)}
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
                      value={product.distributors_price_per_kg}
                      onChange={(e) => handleProductChange(product.id, 'distributors_price_per_kg', e.target.value)}
                      onFocus={handleInputFocus}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('thirdChannelPercentage')}</label>
                    <input
                      type="number"
                      value={product.sales_channel_third_percentage}
                      onChange={(e) => handleProductChange(product.id, 'sales_channel_third_percentage', e.target.value)}
                      onFocus={handleInputFocus}
                      min="0"
                      max="100"
                      step="0.01"
                      readOnly
                      style={{ background: 'var(--bg-tertiary)' }}
                    />
                    <small style={{ color: 'var(--text-tertiary)', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>{t('autoCalculated')}</small>
                  </div>
                  <div className="form-group">
                    <label>{t('thirdChannelPrice')}</label>
                    <input
                      type="number"
                      value={product.third_channel_price_per_kg}
                      onChange={(e) => handleProductChange(product.id, 'third_channel_price_per_kg', e.target.value)}
                      onFocus={handleInputFocus}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}

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
              {/* Results loaded indicator */}
              {selectedScenario?.results && (
                <div className="card" style={{ background: 'rgba(22, 163, 74, 0.1)', border: '1px solid var(--accent-success)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-success)' }}>
                    <span style={{ fontSize: '1.2em' }}>✓</span>
                    <strong>{t('autoLoadedResults')}</strong>
                  </div>
                </div>
              )}
              
              {/* Cost Breakdown Section */}
              <div className="card">
                <h2>{t('productionCostBreakdown')}</h2>
                {(() => {
                  const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);
                  
                  // Calculate total milk production cost per liter (sum of all costs from Module 1)
                  const feedCost = Number(productionData.feed_cost_per_liter) || 0;
                  const laborCost = Number(productionData.labor_cost_per_liter) || 0;
                  const healthCost = Number(productionData.health_cost_per_liter) || 0;
                  const infrastructureCost = Number(productionData.infrastructure_cost_per_liter) || 0;
                  const otherCost = Number(productionData.other_costs_per_liter) || 0;
                  const totalMilkProductionCostPerLiter = feedCost + laborCost + healthCost + infrastructureCost + otherCost;
                  
                  // Calculate aggregated totals across all products
                  let totalProductKg = 0;
                  let totalProductLiters = 0;
                  let totalProcessingCost = 0;
                  let totalPackagingCost = 0;
                  let totalMilkCost = 0;
                  
                  const productBreakdowns = products.map(product => {
                    const distributionPct = parseFloat(product.distribution_percentage) || 0;
                    const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;
                    
                    const processingCostUnit = product.processing_cost_unit || 'liter';
                    const packagingCostUnit = product.packaging_cost_unit || 'kg';
                    const processingCostPerLiter = parseFloat(product.processing_cost_per_liter) || 0;
                    const processingCostPerKg = parseFloat(product.processing_cost_per_kg) || 0;
                    const packagingCostPerLiter = parseFloat(product.packaging_cost_per_liter) || 0;
                    const packagingCostPerKg = parseFloat(product.packaging_cost_per_kg) || 0;
                    
                    const productLiters = totalLiters * (distributionPct / 100);
                    const productKg = productLiters / litersPerKg;
                    
                    let productProcessingCost = 0;
                    if (processingCostUnit === 'liter') {
                      productProcessingCost = processingCostPerLiter * productLiters;
                    } else if (processingCostUnit === 'kg') {
                      productProcessingCost = processingCostPerKg * productKg;
                    }
                    
                    let productPackagingCost = 0;
                    if (packagingCostUnit === 'liter') {
                      productPackagingCost = packagingCostPerLiter * productLiters;
                    } else if (packagingCostUnit === 'kg') {
                      productPackagingCost = packagingCostPerKg * productKg;
                    }
                    
                    const productMilkCost = totalMilkProductionCostPerLiter * productLiters;
                    const totalProductCost = productMilkCost + productProcessingCost + productPackagingCost;
                    const costPerKg = productKg > 0 ? totalProductCost / productKg : 0;
                    
                    totalProductKg += productKg;
                    totalProductLiters += productLiters;
                    totalProcessingCost += productProcessingCost;
                    totalPackagingCost += productPackagingCost;
                    totalMilkCost += productMilkCost;
                    
                    return {
                      product,
                      productLiters,
                      productKg,
                      productMilkCost,
                      productProcessingCost,
                      productPackagingCost,
                      totalProductCost,
                      costPerKg,
                    };
                  });
                  
                  const totalCosts = totalMilkCost + totalProcessingCost + totalPackagingCost;
                  const averageCostPerKg = totalProductKg > 0 ? totalCosts / totalProductKg : 0;
                  
                  return (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.1em', marginBottom: '15px' }}>{t('consolidatedSummary')}</h3>
                      <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table className="table" style={{ minWidth: '400px' }}>
                          <tbody>
                          <tr>
                            <td><strong>{t('milkProductionCostPerLiter')}</strong></td>
                            <td>${totalMilkProductionCostPerLiter.toFixed(2)} ({t('inheritedFromModule1')})</td>
                          </tr>
                          <tr>
                            <td><strong>{t('totalLitersTransformed')}</strong></td>
                            <td>{totalProductLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                          </tr>
                          <tr>
                            <td><strong>{t('totalKgProduced')}</strong></td>
                            <td>{totalProductKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</td>
                          </tr>
                          <tr>
                            <td><strong>{t('totalMilkCost')}</strong></td>
                            <td>${totalMilkCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td><strong>{t('totalProcessingCost')}</strong></td>
                            <td>${totalProcessingCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td><strong>{t('totalPackagingCost')}</strong></td>
                            <td>${totalPackagingCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                            <td><strong>{t('totalProductionCost')}</strong></td>
                            <td><strong>${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                      </div>
                      
                      {products.length > 1 && (
                        <div>
                          <h3 style={{ fontSize: '1.1em', marginTop: '25px', marginBottom: '15px' }}>{t('costPerKgByProduct')}</h3>
                          <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table className="table" style={{ minWidth: '700px' }}>
                              <thead>
                                <tr>
                                  <th>{t('product')}</th>
                                  <th>{t('productTableLiters')}</th>
                                  <th>{t('productTableKg')}</th>
                                  <th>{t('productTableMilkCost')}</th>
                                  <th>{t('productTableProcCost')}</th>
                                  <th>{t('productTablePackCost')}</th>
                                  <th>{t('productTableTotal')}</th>
                                  <th>{t('productTableCostPerKg')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {productBreakdowns.map((bd, idx) => (
                                  <tr key={idx}>
                                    <td>{bd.product.product_type_custom || t(`productTypes.${bd.product.product_type}`) || bd.product.product_type}</td>
                                    <td>{bd.productLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                                    <td>{bd.productKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</td>
                                    <td>${bd.productMilkCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td>${bd.productProcessingCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td>${bd.productPackagingCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td>${bd.totalProductCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td><strong>${bd.costPerKg.toFixed(2)}</strong></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div style={{ marginTop: '15px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.9em' }}>
                            <strong>{t('weightedAverageCostPerKg')}</strong>: ${averageCostPerKg.toFixed(2)} / kg
                            <br />
                            <small style={{ color: '#666' }}>{t('note')}: {t('weightedAverageCostPerKg')}</small>
                          </div>
                        </div>
                      )}
                      {products.length === 1 && (
                        <div style={{ marginTop: '15px', padding: '12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '0.9em' }}>
                          <strong>{t('weightedAverageCostPerKg')}</strong>: ${averageCostPerKg.toFixed(2)} / kg
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Channel Margins Section */}
              <div className="card">
                <h2>{t('channelMargins')}</h2>
                {(() => {
                  const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);
                  
                  // Calculate total milk production cost per liter (inherited from Module 1)
                  const feedCost = Number(productionData.feed_cost_per_liter) || 0;
                  const laborCost = Number(productionData.labor_cost_per_liter) || 0;
                  const healthCost = Number(productionData.health_cost_per_liter) || 0;
                  const infrastructureCost = Number(productionData.infrastructure_cost_per_liter) || 0;
                  const otherCost = Number(productionData.other_costs_per_liter) || 0;
                  const totalMilkProductionCostPerLiter = feedCost + laborCost + healthCost + infrastructureCost + otherCost;
                  
                  // Aggregate channel data across all products
                  const channelData = {
                    direct: { kg: 0, revenue: 0, percentage: 0 },
                    distributors: { kg: 0, revenue: 0, percentage: 0 },
                    third: { kg: 0, revenue: 0, percentage: 0 },
                  };
                  
                  let totalProductKg = 0;
                  let totalCosts = 0;
                  
                  products.forEach(product => {
                    const distributionPct = parseFloat(product.distribution_percentage) || 0;
                    const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;
                    
                    const processingCostUnit = product.processing_cost_unit || 'liter';
                    const packagingCostUnit = product.packaging_cost_unit || 'kg';
                    const processingCostPerLiter = parseFloat(product.processing_cost_per_liter) || 0;
                    const processingCostPerKg = parseFloat(product.processing_cost_per_kg) || 0;
                    const packagingCostPerLiter = parseFloat(product.packaging_cost_per_liter) || 0;
                    const packagingCostPerKg = parseFloat(product.packaging_cost_per_kg) || 0;
                    
                    const productLiters = totalLiters * (distributionPct / 100);
                    const productKg = productLiters / litersPerKg;
                    
                    let productProcessingCost = 0;
                    if (processingCostUnit === 'liter') {
                      productProcessingCost = processingCostPerLiter * productLiters;
                    } else if (processingCostUnit === 'kg') {
                      productProcessingCost = processingCostPerKg * productKg;
                    }
                    
                    let productPackagingCost = 0;
                    if (packagingCostUnit === 'liter') {
                      productPackagingCost = packagingCostPerLiter * productLiters;
                    } else if (packagingCostUnit === 'kg') {
                      productPackagingCost = packagingCostPerKg * productKg;
                    }
                    
                    const productMilkCost = totalMilkProductionCostPerLiter * productLiters;
                    const productTotalCost = productMilkCost + productProcessingCost + productPackagingCost;
                    
                    totalProductKg += productKg;
                    totalCosts += productTotalCost;
                    
                    // Distribute product across channels
                    const directPct = parseFloat(product.sales_channel_direct_percentage) || 0;
                    const distPct = parseFloat(product.sales_channel_distributors_percentage) || 0;
                    const thirdPct = parseFloat(product.sales_channel_third_percentage) || 0;
                    
                    const directKg = productKg * (directPct / 100);
                    const distKg = productKg * (distPct / 100);
                    const thirdKg = productKg * (thirdPct / 100);
                    
                    const directPrice = parseFloat(product.direct_sale_price_per_kg) || 0;
                    const distPrice = parseFloat(product.distributors_price_per_kg) || 0;
                    const thirdPrice = parseFloat(product.third_channel_price_per_kg) || 0;
                    
                    channelData.direct.kg += directKg;
                    channelData.direct.revenue += directPrice * directKg;
                    channelData.distributors.kg += distKg;
                    channelData.distributors.revenue += distPrice * distKg;
                    channelData.third.kg += thirdKg;
                    channelData.third.revenue += thirdPrice * thirdKg;
                  });
                  
                  // Calculate weighted average prices and percentages
                  channelData.direct.percentage = totalProductKg > 0 ? (channelData.direct.kg / totalProductKg) * 100 : 0;
                  channelData.distributors.percentage = totalProductKg > 0 ? (channelData.distributors.kg / totalProductKg) * 100 : 0;
                  channelData.third.percentage = totalProductKg > 0 ? (channelData.third.kg / totalProductKg) * 100 : 0;
                  
                  const averageCostPerKg = totalProductKg > 0 ? totalCosts / totalProductKg : 0;
                  
                  // Calculate product details per channel
                  const getProductDetailsPerChannel = (channelKey) => {
                    return products.map(product => {
                      const distributionPct = parseFloat(product.distribution_percentage) || 0;
                      const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;
                      const productLiters = totalLiters * (distributionPct / 100);
                      const productKg = productLiters / litersPerKg;
                      
                      const processingCostUnit = product.processing_cost_unit || 'liter';
                      const packagingCostUnit = product.packaging_cost_unit || 'kg';
                      const processingCostPerLiter = parseFloat(product.processing_cost_per_liter) || 0;
                      const processingCostPerKg = parseFloat(product.processing_cost_per_kg) || 0;
                      const packagingCostPerLiter = parseFloat(product.packaging_cost_per_liter) || 0;
                      const packagingCostPerKg = parseFloat(product.packaging_cost_per_kg) || 0;
                      
                      let productProcessingCost = 0;
                      if (processingCostUnit === 'liter') {
                        productProcessingCost = processingCostPerLiter * productLiters;
                      } else if (processingCostUnit === 'kg') {
                        productProcessingCost = processingCostPerKg * productKg;
                      }
                      
                      let productPackagingCost = 0;
                      if (packagingCostUnit === 'liter') {
                        productPackagingCost = packagingCostPerLiter * productLiters;
                      } else if (packagingCostUnit === 'kg') {
                        productPackagingCost = packagingCostPerKg * productKg;
                      }
                      
                      const productMilkCost = totalMilkProductionCostPerLiter * productLiters;
                      const productTotalCost = productMilkCost + productProcessingCost + productPackagingCost;
                      const productCostPerKg = productKg > 0 ? productTotalCost / productKg : 0;
                      
                      const directPct = parseFloat(product.sales_channel_direct_percentage) || 0;
                      const distPct = parseFloat(product.sales_channel_distributors_percentage) || 0;
                      const thirdPct = parseFloat(product.sales_channel_third_percentage) || 0;
                      
                      let channelKg = 0;
                      let channelPrice = 0;
                      
                      if (channelKey === 'direct') {
                        channelKg = productKg * (directPct / 100);
                        channelPrice = parseFloat(product.direct_sale_price_per_kg) || 0;
                      } else if (channelKey === 'distributors') {
                        channelKg = productKg * (distPct / 100);
                        channelPrice = parseFloat(product.distributors_price_per_kg) || 0;
                      } else if (channelKey === 'third') {
                        channelKg = productKg * (thirdPct / 100);
                        channelPrice = parseFloat(product.third_channel_price_per_kg) || 0;
                      }
                      
                      const unitMargin = channelPrice - productCostPerKg;
                      const unitMarginPercent = channelPrice > 0 ? (unitMargin / channelPrice) * 100 : 0;
                      const totalRevenue = channelPrice * channelKg;
                      const totalCost = productCostPerKg * channelKg;
                      const totalMarginDollars = totalRevenue - totalCost;
                      
                      return {
                        productName: product.product_type_custom || t(`productTypes.${product.product_type}`) || product.product_type,
                        kg: channelKg,
                        price: channelPrice,
                        unitCost: productCostPerKg,
                        unitMargin,
                        unitMarginPercent,
                        totalRevenue,
                        totalMarginDollars,
                      };
                    }).filter(detail => detail.kg > 0); // Only show products that have kg in this channel
                  };
                  
                  const channels = [
                    {
                      key: 'direct',
                      name: t('salesChannelDirect'),
                      percentage: channelData.direct.percentage,
                      price: channelData.direct.kg > 0 ? channelData.direct.revenue / channelData.direct.kg : 0,
                      kg: channelData.direct.kg,
                      revenue: channelData.direct.revenue,
                    },
                    {
                      key: 'distributors',
                      name: t('salesChannelDistributors'),
                      percentage: channelData.distributors.percentage,
                      price: channelData.distributors.kg > 0 ? channelData.distributors.revenue / channelData.distributors.kg : 0,
                      kg: channelData.distributors.kg,
                      revenue: channelData.distributors.revenue,
                    },
                    {
                      key: 'third',
                      name: t('salesChannelThird'),
                      percentage: channelData.third.percentage,
                      price: channelData.third.kg > 0 ? channelData.third.revenue / channelData.third.kg : 0,
                      kg: channelData.third.kg,
                      revenue: channelData.third.revenue,
                    }
                  ];
                  
                  return (
                    <>
                      <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '6px', border: '1px solid var(--accent-info)', fontSize: '0.9em' }}>
                        <strong>✅ {t('note')}:</strong> La tabla ahora muestra primero los datos reales por producto (precios, costos, márgenes), y el promedio ponderado del mix aparece como dato secundario. <strong>Los valores en negrita son los márgenes por producto</strong>, que son los datos accionables para decisiones de negocio.
                      </div>
                      <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table className="table" style={{ minWidth: '800px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30px' }}></th>
                            <th>{t('concept')}</th>
                            <th>% {t('salesChannels')}</th>
                            <th>{t('kgL')}</th>
                            <th>{t('salesPrice')}</th>
                            <th style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>{t('costAverage')}</th>
                            <th>{t('marginPerKg')}</th>
                            <th>{t('marginPercent')}</th>
                            <th>{t('totalIncome')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {channels.map((channel, idx) => {
                            const margin = channel.price - averageCostPerKg;
                            const marginPercent = channel.price > 0 ? (margin / channel.price) * 100 : 0;
                            const totalMargin = channel.revenue - (averageCostPerKg * channel.kg);
                            const isExpanded = expandedChannels[channel.key] ?? true; // Auto-expand by default
                            const productDetails = getProductDetailsPerChannel(channel.key);
                            
                            return (
                              <Fragment key={idx}>
                                <tr style={{ 
                                  opacity: channel.percentage === 0 ? 0.5 : 1,
                                  background: 'var(--bg-tertiary)',
                                  fontWeight: 'normal'
                                }}>
                                  <td style={{ cursor: 'pointer', textAlign: 'center' }}>
                                    {productDetails.length > 0 && (
                                      <button
                                        onClick={() => setExpandedChannels(prev => ({
                                          ...prev,
                                          [channel.key]: !prev[channel.key]
                                        }))}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          fontSize: '1.2em',
                                          cursor: 'pointer',
                                          padding: '0 5px'
                                        }}
                                      >
                                        {isExpanded ? '▼' : '▶'}
                                      </button>
                                    )}
                                  </td>
                                  <td><strong>{channel.name}</strong></td>
                                  <td>{channel.percentage.toFixed(1)}%</td>
                                  <td>{channel.kg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                  <td colSpan="5" style={{ fontStyle: 'italic', color: '#666' }}>
                                    {productDetails.length > 1 ? t('clickToSeeProductDetails') : t('seeProductDetailsBelow')}
                                  </td>
                                </tr>
                                {isExpanded && productDetails.length > 0 && productDetails.map((detail, detailIdx) => (
                                  <tr key={`${idx}-${detailIdx}`} style={{ 
                                    borderBottom: detailIdx === productDetails.length - 1 ? 'none' : '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)'
                                  }}>
                                    <td></td>
                                    <td style={{ paddingLeft: '30px' }}>{detail.productName}</td>
                                    <td>-</td>
                                    <td>{detail.kg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td style={{ fontWeight: 'bold' }}>${detail.price.toFixed(2)}</td>
                                    <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>${detail.unitCost.toFixed(2)}</td>
                                    <td style={{ 
                                      color: detail.unitMargin >= 0 ? 'green' : 'red',
                                      fontWeight: 'bold',
                                      fontSize: '1.05em'
                                    }}>
                                      ${detail.unitMargin.toFixed(2)}
                                    </td>
                                    <td style={{ 
                                      color: detail.unitMarginPercent >= 0 ? 'green' : 'red',
                                      fontWeight: 'bold',
                                      fontSize: '1.05em'
                                    }}>
                                      {detail.unitMarginPercent.toFixed(1)}%
                                    </td>
                                    <td>${detail.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                                {/* Weighted Average Summary Row (Secondary) */}
                                {isExpanded && productDetails.length > 1 && (
                                  <tr style={{ 
                                    background: 'var(--bg-tertiary)',
                                    borderTop: '1px dashed var(--border-color)',
                                    fontStyle: 'italic',
                                    fontSize: '0.95em'
                                  }}>
                                    <td></td>
                                    <td style={{ paddingLeft: '30px', color: '#666' }}>
                                      <small>📊 {t('weightedAverageMix')}</small>
                                    </td>
                                    <td>-</td>
                                    <td><small>{channel.kg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</small></td>
                                    <td style={{ color: '#666' }}>
                                      <small>${channel.price > 0 ? channel.price.toFixed(2) : '0.00'}</small>
                                    </td>
                                    <td style={{ color: '#666' }}>
                                      <small>${averageCostPerKg.toFixed(2)}</small>
                                    </td>
                                    <td style={{ color: '#666' }}>
                                      <small>${margin.toFixed(2)}</small>
                                    </td>
                                    <td style={{ color: '#666' }}>
                                      <small>{marginPercent.toFixed(1)}%</small>
                                    </td>
                                    <td style={{ color: '#666' }}>
                                      <small>${channel.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</small>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                          <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold', background: '#f5f5f5' }}>
                            <td colSpan="2"><strong>{t('total')}</strong></td>
                            <td>100%</td>
                            <td>{totalProductKg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td colSpan="4" style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9em' }}>
                              {t('totalAcrossAllChannels')}
                            </td>
                            <td>${(channels[0].revenue + channels[1].revenue + channels[2].revenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                        </tbody>
                      </table>
                      </div>
                    </>
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
                    <li><strong>{t('rawMilkSaleModule1')}</strong> {t('directSaleExplanation')}</li>
                    <li><strong>{t('transformationModule2')}</strong> {t('transformationExplanation')}</li>
                    <li><strong>{t('importantNote')}:</strong> {t('salesChannelsNote')}</li>
                    <li><strong>{t('assumptions')}:</strong> {t('assumptionsExplanation')}</li>
                    <li><strong>{t('costsIncluded')}:</strong> {t('costsIncludedExplanation')}</li>
                  </ul>
                </div>
                <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="table" style={{ minWidth: '500px' }}>
                    <thead>
                      <tr>
                        <th>{t('concept')}</th>
                        <th>{t('rawMilkSale')}</th>
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
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <h2 style={{ margin: 0, flex: '1 1 100%', minWidth: '200px' }}>{t('visualization')}</h2>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{t('marginViewMode')}:</label>
                    <select
                      value={marginViewMode}
                      onChange={(e) => setMarginViewMode(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9em' }}
                    >
                      <option value="dollars">{t('viewInDollars')}</option>
                      <option value="percent">{t('viewInPercent')}</option>
                    </select>
                    <select
                      value={chartViewType}
                      onChange={(e) => setChartViewType(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9em' }}
                    >
                      <option value="grouped">{t('chartViewGrouped')}</option>
                      <option value="donut">{t('chartViewDonut')}</option>
                      <option value="stacked">{t('chartViewStacked')}</option>
                      <option value="waterfall">{t('chartViewWaterfall')}</option>
                    </select>
                  </div>
                </div>
                {comparisonData.length > 0 ? (
                  <>
                    {chartViewType === 'grouped' && (() => {
                      // Transform data based on margin view mode
                      const chartData = marginViewMode === 'percent' ? comparisonData.map(item => {
                        const income = Number(item[t('income')]) || 0;
                        const costs = Number(item[t('totalCosts')]) || 0;
                        const margin = Number(item[t('margin')]) || 0;
                        return {
                          name: item.name,
                          [t('income')]: income > 0 ? ((margin / income) * 100) : 0,
                          [t('totalCosts')]: income > 0 ? ((costs / income) * 100) : 0,
                          [t('margin')]: income > 0 ? ((margin / income) * 100) : 0,
                        };
                      }) : comparisonData;
                      
                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
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
                            <Bar dataKey={t('income')} fill={chartColors.primary} />
                            <Bar dataKey={t('totalCosts')} fill={chartColors.tertiary} />
                            <Bar dataKey={t('margin')} fill={chartColors.secondary} />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                    {chartViewType === 'donut' && (() => {
                      const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);
                      const channelData = {
                        direct: { kg: 0, revenue: 0 },
                        distributors: { kg: 0, revenue: 0 },
                        third: { kg: 0, revenue: 0 },
                      };
                      let totalProductKg = 0;
                      products.forEach(product => {
                        const distributionPct = parseFloat(product.distribution_percentage) || 0;
                        const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;
                        const productLiters = totalLiters * (distributionPct / 100);
                        const productKg = productLiters / litersPerKg;
                        totalProductKg += productKg;
                        const directPct = parseFloat(product.sales_channel_direct_percentage) || 0;
                        const distPct = parseFloat(product.sales_channel_distributors_percentage) || 0;
                        const thirdPct = parseFloat(product.sales_channel_third_percentage) || 0;
                        channelData.direct.kg += productKg * (directPct / 100);
                        channelData.distributors.kg += productKg * (distPct / 100);
                        channelData.third.kg += productKg * (thirdPct / 100);
                      });
                      const donutData = [
                        { name: t('salesChannelDirect'), value: totalProductKg > 0 ? (channelData.direct.kg / totalProductKg) * 100 : 0 },
                        { name: t('salesChannelDistributors'), value: totalProductKg > 0 ? (channelData.distributors.kg / totalProductKg) * 100 : 0 },
                        { name: t('salesChannelThird'), value: totalProductKg > 0 ? (channelData.third.kg / totalProductKg) * 100 : 0 },
                      ].filter(item => item.value > 0);
                      const COLORS = [chartColors.primary, chartColors.secondary, chartColors.tertiary];
                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                              outerRadius={80}
                              fill={chartColors.primary}
                              dataKey="value"
                            >
                              {donutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => `${value.toFixed(1)}%`}
                              contentStyle={{ 
                                backgroundColor: chartColors.tooltip.bg, 
                                border: `1px solid ${chartColors.tooltip.border}`,
                                color: chartColors.tooltip.text
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                    {chartViewType === 'stacked' && (() => {
                      const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);
                      const productData = products.map(product => {
                        const distributionPct = parseFloat(product.distribution_percentage) || 0;
                        const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;
                        const productLiters = totalLiters * (distributionPct / 100);
                        const productKg = productLiters / litersPerKg;
                        return {
                          name: product.product_type_custom || t(`productTypes.${product.product_type}`) || product.product_type,
                          kg: productKg,
                        };
                      });
                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={productData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                            <XAxis dataKey="name" stroke={chartColors.axis.tick} />
                            <YAxis stroke={chartColors.axis.tick} />
                            <Tooltip 
                              formatter={(value) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`}
                              contentStyle={{ 
                                backgroundColor: chartColors.tooltip.bg, 
                                border: `1px solid ${chartColors.tooltip.border}`,
                                color: chartColors.tooltip.text
                              }}
                            />
                            <Legend />
                            <Bar dataKey="kg" stackId="a" fill={chartColors.primary} name={t('productMix')} />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                    {chartViewType === 'waterfall' && (() => {
                      // Transform data based on margin view mode
                      const chartData = marginViewMode === 'percent' ? comparisonData.map(item => {
                        const income = Number(item[t('income')]) || 0;
                        const costs = Number(item[t('totalCosts')]) || 0;
                        const margin = Number(item[t('margin')]) || 0;
                        return {
                          name: item.name,
                          [t('income')]: income > 0 ? ((margin / income) * 100) : 0,
                          [t('totalCosts')]: income > 0 ? ((costs / income) * 100) : 0,
                          [t('margin')]: income > 0 ? ((margin / income) * 100) : 0,
                        };
                      }) : comparisonData;
                      
                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={chartData}>
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
                            <Bar dataKey={t('income')} fill={chartColors.primary} />
                            <Bar dataKey={t('totalCosts')} fill={chartColors.tertiary} />
                            <Area type="monotone" dataKey={t('margin')} fill={chartColors.secondary} stroke={chartColors.secondary} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p style={{ color: '#666', margin: 0 }}>{t('noDataToShow')}</p>
                  </div>
                )}
              </div>

              {/* Integrated Dashboard View */}
              {results && (
                <div className="card" style={{ marginTop: '2rem' }}>
                  <h2 className="card-section-title">{t('integratedDashboard') || 'Integrated Dashboard'}</h2>
                  <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                    {t('dashboardDescription') || 'Comprehensive view of all metrics and charts for quick decision-making'}
                  </p>
                  
                  {/* Key Metrics Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
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
                        {t('totalProductKg') || 'Total Product (kg)'}
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {Number(results.total_product_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ 
                      padding: '1.5rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        {t('totalRevenue') || 'Total Revenue'}
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        ${Number(results.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
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
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: results.total_margin >= 0 ? 'var(--success-color)' : 'var(--error-color)' }}>
                        ${Number(results.total_margin || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    {comparisonData && comparisonData.length > 0 && (
                      <div>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                          {t('financialOverview') || 'Financial Overview'}
                        </h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={comparisonData}>
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
                            <Bar dataKey={t('income')} fill={chartColors.primary} />
                            <Bar dataKey={t('totalCosts')} fill={chartColors.tertiary} />
                            <Bar dataKey={t('margin')} fill={chartColors.secondary} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Product Mix Chart */}
                    {results.productsBreakdown && results.productsBreakdown.length > 0 && (() => {
                      const totalLiters = results.productsBreakdown.reduce((sum, p) => sum + (p.productLiters || 0), 0);
                      const productData = results.productsBreakdown.map(product => {
                        const distributionPct = product.distribution_percentage || 0;
                        const litersPerKg = product.litersPerKg || 1;
                        const productLiters = totalLiters * (distributionPct / 100);
                        const productKg = productLiters / litersPerKg;
                        return {
                          name: product.product_type_custom || t(`productTypes.${product.product_type}`) || product.product_type,
                          kg: productKg,
                        };
                      });
                      return (
                        <div>
                          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                            {t('productMix') || 'Product Mix'}
                          </h3>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={productData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                              <XAxis dataKey="name" stroke={chartColors.axis.tick} />
                              <YAxis stroke={chartColors.axis.tick} />
                              <Tooltip 
                                formatter={(value) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`}
                                contentStyle={{ 
                                  backgroundColor: chartColors.tooltip.bg, 
                                  border: `1px solid ${chartColors.tooltip.border}`,
                                  color: chartColors.tooltip.text
                                }}
                              />
                              <Legend />
                              <Bar dataKey="kg" fill={chartColors.primary} name={t('productMix')} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}

                    {/* Channel Mix Chart */}
                    {results.productsBreakdown && results.productsBreakdown.length > 0 && (() => {
                      const channelData = {
                        direct: { kg: 0 },
                        distributors: { kg: 0 },
                        third: { kg: 0 }
                      };
                      let totalProductKg = 0;
                      results.productsBreakdown.forEach(product => {
                        if (product.salesChannels && product.productKg) {
                          channelData.direct.kg += product.salesChannels.direct?.kg || 0;
                          channelData.distributors.kg += product.salesChannels.distributors?.kg || 0;
                          channelData.third.kg += product.salesChannels.third?.kg || 0;
                          totalProductKg += product.productKg;
                        }
                      });
                      const donutData = [
                        { name: t('salesChannelDirect'), value: totalProductKg > 0 ? (channelData.direct.kg / totalProductKg) * 100 : 0 },
                        { name: t('salesChannelDistributors'), value: totalProductKg > 0 ? (channelData.distributors.kg / totalProductKg) * 100 : 0 },
                        { name: t('salesChannelThird'), value: totalProductKg > 0 ? (channelData.third.kg / totalProductKg) * 100 : 0 },
                      ].filter(item => item.value > 0);
                      const COLORS = [chartColors.primary, chartColors.secondary, chartColors.tertiary];
                      return donutData.length > 0 ? (
                        <div>
                          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                            {t('channelMix') || 'Sales Channel Mix'}
                          </h3>
                          <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                              <Pie
                                data={donutData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                outerRadius={90}
                                fill={chartColors.primary}
                                dataKey="value"
                              >
                                {donutData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value) => `${value.toFixed(1)}%`}
                                contentStyle={{ 
                                  backgroundColor: chartColors.tooltip.bg, 
                                  border: `1px solid ${chartColors.tooltip.border}`,
                                  color: chartColors.tooltip.text
                                }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
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
