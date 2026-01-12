import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../utils/api';

function Module2Transformation({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

  const [productionData, setProductionData] = useState({
    daily_production_liters: 0,
    production_days: 0,
    animals_count: 0,
    milk_price_per_liter: 0,
  });

  const [transformationData, setTransformationData] = useState({
    product_type: 'queso_fresco',
    liters_per_kg_product: 0,
    processing_cost_per_liter: 0,
    product_price_per_kg: 0,
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
        setProductionData(scenario.productionData);
      }
      if (scenario.transformationData) {
        setTransformationData(scenario.transformationData);
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
    setProductionData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleTransformationChange = (e) => {
    const { name, value } = e.target;
    setTransformationData(prev => ({
      ...prev,
      [name]: name === 'product_type' ? value : (parseFloat(value) || 0),
    }));
  };

  const handleSave = async () => {
    if (!selectedScenario) {
      alert('Por favor selecciona un escenario primero');
      return;
    }

    setLoading(true);
    try {
      // Save production data first
      await api.post(`/modules/production/${selectedScenario.id}`, productionData);
      // Then save transformation data
      await api.post(`/modules/transformation/${selectedScenario.id}`, transformationData);
      await loadScenario(selectedScenario.id);
      alert('Datos guardados y resultados calculados');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
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
    { name: 'Venta Directa', Ingresos: results.milk_revenue, Costos: results.milk_revenue - results.milk_margin, Margen: results.milk_margin },
    { name: 'Transformación', Ingresos: results.product_revenue, Costos: results.product_revenue - results.transformation_margin, Margen: results.transformation_margin },
  ] : [];

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Volver al Dashboard
        </button>
        <h1 style={{ marginTop: '20px' }}>Módulo 2: Transformación Láctea</h1>
      </header>

      <div className="card">
        <h2>Seleccionar Escenario</h2>
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
          <option value="">-- Selecciona un escenario --</option>
          {scenarios.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedScenario && (
        <>
          <div className="card">
            <h2>Datos de Producción Base</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>Producción Diaria (litros)</label>
                <input
                  type="number"
                  name="daily_production_liters"
                  value={productionData.daily_production_liters}
                  onChange={handleProductionChange}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Días de Producción</label>
                <input
                  type="number"
                  name="production_days"
                  value={productionData.production_days}
                  onChange={handleProductionChange}
                />
              </div>
              <div className="form-group">
                <label>Número de Animales</label>
                <input
                  type="number"
                  name="animals_count"
                  value={productionData.animals_count}
                  onChange={handleProductionChange}
                />
              </div>
              <div className="form-group">
                <label>Precio Leche (por litro) - para comparación</label>
                <input
                  type="number"
                  name="milk_price_per_liter"
                  value={productionData.milk_price_per_liter}
                  onChange={handleProductionChange}
                  step="0.01"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Datos de Transformación</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>Tipo de Producto</label>
                <select
                  name="product_type"
                  value={transformationData.product_type}
                  onChange={handleTransformationChange}
                >
                  <option value="queso_fresco">Queso Fresco</option>
                  <option value="queso_madurado">Queso Madurado</option>
                  <option value="yogurt">Yogurt</option>
                  <option value="mantequilla">Mantequilla</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Litros por Kg de Producto</label>
                <input
                  type="number"
                  name="liters_per_kg_product"
                  value={transformationData.liters_per_kg_product}
                  onChange={handleTransformationChange}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Costo de Procesamiento (por litro)</label>
                <input
                  type="number"
                  name="processing_cost_per_liter"
                  value={transformationData.processing_cost_per_liter}
                  onChange={handleTransformationChange}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Precio Producto (por kg)</label>
                <input
                  type="number"
                  name="product_price_per_kg"
                  value={transformationData.product_price_per_kg}
                  onChange={handleTransformationChange}
                  step="0.01"
                />
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={handleCalculate} style={{ marginRight: '10px' }}>
                Calcular
              </button>
              <button className="btn btn-secondary" onClick={handleSave} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar y Calcular'}
              </button>
            </div>
          </div>

          {results && (
            <>
              <div className="card">
                <h2>Comparación: Venta Directa vs Transformación</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Venta Directa</th>
                      <th>Transformación</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Ingresos</strong></td>
                      <td>${results.milk_revenue?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                      <td>${results.product_revenue?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Margen</strong></td>
                      <td>${results.milk_margin?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                      <td>${results.transformation_margin?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Diferencia</strong></td>
                      <td colSpan="2">
                        ${Math.abs(results.transformation_margin - results.milk_margin)?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                        {' '}({results.better_option === 'transformación' ? 'Mejor transformar' : 'Mejor vender directo'})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>Visualización</h2>
                <h3 style={{ marginBottom: '15px' }}>Comparación de Opciones</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString('es-ES')}`} />
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
