import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';

function Module4Yield({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

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
        setProductionData(scenario.productionData);
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
    setProductionData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleYieldChange = (e) => {
    const { name, value } = e.target;
    setYieldData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSave = async () => {
    if (!selectedScenario) {
      alert('Por favor selecciona un escenario primero');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/modules/production/${selectedScenario.id}`, productionData);
      await api.post(`/modules/yield/${selectedScenario.id}`, yieldData);
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
    const effectiveLiters = totalLiters * (yieldData.efficiency_percentage / 100);
    const convertedProduct = effectiveLiters * yieldData.conversion_rate;
    const conversionEfficiency = yieldData.efficiency_percentage;
    const wasteLiters = totalLiters - effectiveLiters;

    setResults({
      totalLiters,
      effectiveLiters,
      convertedProduct,
      conversionRate: yieldData.conversion_rate,
      efficiencyPercentage: conversionEfficiency,
      wasteLiters,
    });
  };

  const conversionData = results ? [
    { name: 'Leche Total', value: results.totalLiters },
    { name: 'Leche Efectiva', value: results.effectiveLiters },
    { name: 'Producto Convertido', value: results.convertedProduct },
    { name: 'Pérdidas', value: results.wasteLiters },
  ] : [];

  const efficiencyData = results ? [
    { name: 'Eficiencia', value: results.efficiencyPercentage },
    { name: 'Tasa Conversión', value: results.conversionRate * 100 },
  ] : [];

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Volver al Dashboard
        </button>
        <h1 style={{ marginTop: '20px' }}>Módulo 4: Rendimiento/Conversión</h1>
      </header>

      <div className="card">
        <h2>Seleccionar Escenario</h2>
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
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Datos de Rendimiento/Conversión</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>Tasa de Conversión (producto por litro)</label>
                <input
                  type="number"
                  name="conversion_rate"
                  value={yieldData.conversion_rate}
                  onChange={handleYieldChange}
                  step="0.0001"
                  placeholder="Ej: 0.1 (kg producto por litro)"
                />
              </div>
              <div className="form-group">
                <label>Eficiencia (%)</label>
                <input
                  type="number"
                  name="efficiency_percentage"
                  value={yieldData.efficiency_percentage}
                  onChange={handleYieldChange}
                  step="0.1"
                  min="0"
                  max="100"
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
                <h2>Resultados</h2>
                <table className="table">
                  <tbody>
                    <tr>
                      <td><strong>Leche Total (litros)</strong></td>
                      <td>{results.totalLiters?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Leche Efectiva (litros)</strong></td>
                      <td>{results.effectiveLiters?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Producto Convertido</strong></td>
                      <td>{results.convertedProduct?.toLocaleString('es-ES', { maximumFractionDigits: 2 })} unidades</td>
                    </tr>
                    <tr>
                      <td><strong>Tasa de Conversión</strong></td>
                      <td>{results.conversionRate?.toFixed(4)}</td>
                    </tr>
                    <tr>
                      <td><strong>Eficiencia (%)</strong></td>
                      <td>{results.efficiencyPercentage?.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td><strong>Pérdidas (litros)</strong></td>
                      <td>{results.wasteLiters?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Pérdidas (%)</strong></td>
                      <td>{results.totalLiters > 0 ? ((results.wasteLiters / results.totalLiters) * 100).toFixed(2) : 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>Visualización</h2>
                <h3 style={{ marginBottom: '15px' }}>Conversión de Leche a Producto</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => value.toLocaleString('es-ES', { maximumFractionDigits: 2 })} />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>

                <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Eficiencia y Conversión</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={efficiencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
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

export default Module4Yield;
