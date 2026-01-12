import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';

function Module1Production({ user }) {
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
        setFormData(scenario.productionData);
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
    setFormData(prev => ({
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
      await api.post(`/modules/production/${selectedScenario.id}`, formData);
      await loadScenario(selectedScenario.id);
      alert('Datos guardados y resultados calculados');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
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
          ← Volver al Dashboard
        </button>
        <h1 style={{ marginTop: '20px' }}>Módulo 1: Producción y Venta de Leche</h1>
      </header>

      <div className="card">
        <h2>Seleccionar Escenario</h2>
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
          <option value="">-- Selecciona un escenario --</option>
          {scenarios.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedScenario && (
        <>
          <div className="card">
            <h2>Datos de Producción</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>Producción Diaria (litros)</label>
                <input
                  type="number"
                  name="daily_production_liters"
                  value={formData.daily_production_liters}
                  onChange={handleInputChange}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Días de Producción</label>
                <input
                  type="number"
                  name="production_days"
                  value={formData.production_days}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Número de Animales</label>
                <input
                  type="number"
                  name="animals_count"
                  value={formData.animals_count}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Precio Leche (por litro)</label>
                <input
                  type="number"
                  name="milk_price_per_liter"
                  value={formData.milk_price_per_liter}
                  onChange={handleInputChange}
                  step="0.01"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Costos (por litro)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>Costo Alimento</label>
                <input
                  type="number"
                  name="feed_cost_per_liter"
                  value={formData.feed_cost_per_liter}
                  onChange={handleInputChange}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Costo Mano de Obra</label>
                <input
                  type="number"
                  name="labor_cost_per_liter"
                  value={formData.labor_cost_per_liter}
                  onChange={handleInputChange}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Costo Salud</label>
                <input
                  type="number"
                  name="health_cost_per_liter"
                  value={formData.health_cost_per_liter}
                  onChange={handleInputChange}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Costo Infraestructura</label>
                <input
                  type="number"
                  name="infrastructure_cost_per_liter"
                  value={formData.infrastructure_cost_per_liter}
                  onChange={handleInputChange}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Otros Costos</label>
                <input
                  type="number"
                  name="other_costs_per_liter"
                  value={formData.other_costs_per_liter}
                  onChange={handleInputChange}
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
                <h2>Resultados</h2>
                <table className="table">
                  <tbody>
                    <tr>
                      <td><strong>Producción Total (litros)</strong></td>
                      <td>{results.total_production_liters?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Ingresos Totales</strong></td>
                      <td>${results.total_revenue?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Costos Totales</strong></td>
                      <td>${results.total_costs?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Margen Bruto</strong></td>
                      <td>${results.gross_margin?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Margen (%)</strong></td>
                      <td>{results.margin_percentage?.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td><strong>Ingreso por Litro</strong></td>
                      <td>${results.revenue_per_liter?.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td><strong>Costo por Litro</strong></td>
                      <td>${results.cost_per_liter?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>Visualización</h2>
                <h3 style={{ marginBottom: '15px' }}>Ingresos vs Costos vs Margen</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString('es-ES')}`} />
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
