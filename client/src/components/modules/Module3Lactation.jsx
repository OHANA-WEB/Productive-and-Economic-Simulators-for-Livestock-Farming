import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';

function Module3Lactation({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

  const [productionData, setProductionData] = useState({
    daily_production_liters: 0,
    production_days: 0,
    animals_count: 0,
    milk_price_per_liter: 0,
  });

  const [lactationData, setLactationData] = useState({
    lactation_days: 0,
    dry_days: 0,
    productive_life_years: 0,
    replacement_rate: 0,
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
      const response = await api.get('/scenarios?type=lactation');
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
      if (scenario.lactationData) {
        setLactationData(scenario.lactationData);
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

  const handleLactationChange = (e) => {
    const { name, value } = e.target;
    
    // Handle empty string
    if (value === '' || value === null || value === undefined) {
      setLactationData(prev => ({
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
    setLactationData(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue,
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
      await api.post(`/modules/lactation/${selectedScenario.id}`, lactationData);
      await loadScenario(selectedScenario.id);
      alert('Datos guardados y resultados calculados');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    const cycleDays = lactationData.lactation_days + lactationData.dry_days;
    const cyclesPerYear = cycleDays > 0 ? 365 / cycleDays : 0;
    const productiveDays = lactationData.productive_life_years * 365;
    const effectiveProductionDays = productiveDays * (lactationData.lactation_days / (cycleDays || 1));
    
    const baseProduction = productionData.daily_production_liters * productionData.animals_count;
    const adjustedProduction = baseProduction * (effectiveProductionDays / productiveDays);
    const totalProductionLiters = adjustedProduction * productionData.production_days;
    
    const totalRevenue = productionData.milk_price_per_liter * totalProductionLiters;
    const costPerLiter = 0.5; // Simplified
    const totalCosts = costPerLiter * totalProductionLiters;
    const grossMargin = totalRevenue - totalCosts;
    const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    setResults({
      cycleDays,
      cyclesPerYear,
      productiveDays,
      effectiveProductionDays,
      totalProductionLiters,
      totalRevenue,
      totalCosts,
      grossMargin,
      marginPercentage,
      replacementRate: lactationData.replacement_rate,
    });
  };

  const cycleData = results ? [
    { name: 'Días Lactancia', value: lactationData.lactation_days },
    { name: 'Días Secos', value: lactationData.dry_days },
  ] : [];

  const productionImpact = results ? [
    { name: 'Producción Base', value: productionData.daily_production_liters * productionData.animals_count * productionData.production_days },
    { name: 'Producción Ajustada', value: results.totalProductionLiters },
  ] : [];

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Volver al Dashboard
        </button>
        <h1 style={{ marginTop: '20px' }}>Módulo 3: Lactancia y Vida Productiva</h1>
      </header>

      <div className="card">
        <h2>Seleccionar Escenario</h2>
        <select
          value={selectedScenario?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (id) {
              navigate(`/module3`, { state: { scenarioId: id }, replace: true });
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
                  onFocus={handleInputFocus}
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
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>Número de Animales</label>
                <input
                  type="number"
                  name="animals_count"
                  value={productionData.animals_count}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>Precio Leche (por litro)</label>
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

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Datos de Lactancia</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>Días de Lactancia</label>
                <input
                  type="number"
                  name="lactation_days"
                  value={lactationData.lactation_days}
                  onChange={handleLactationChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>Días Secos</label>
                <input
                  type="number"
                  name="dry_days"
                  value={lactationData.dry_days}
                  onChange={handleLactationChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>Vida Productiva (años)</label>
                <input
                  type="number"
                  name="productive_life_years"
                  value={lactationData.productive_life_years}
                  onChange={handleLactationChange}
                  onFocus={handleInputFocus}
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label>Tasa de Reemplazo (%)</label>
                <input
                  type="number"
                  name="replacement_rate"
                  value={lactationData.replacement_rate}
                  onChange={handleLactationChange}
                  onFocus={handleInputFocus}
                  step="0.1"
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
                      <td><strong>Días del Ciclo</strong></td>
                      <td>{results.cycleDays?.toFixed(0)} días</td>
                    </tr>
                    <tr>
                      <td><strong>Ciclos por Año</strong></td>
                      <td>{results.cyclesPerYear?.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td><strong>Días Productivos Totales</strong></td>
                      <td>{results.productiveDays?.toFixed(0)} días</td>
                    </tr>
                    <tr>
                      <td><strong>Días Efectivos de Producción</strong></td>
                      <td>{results.effectiveProductionDays?.toFixed(0)} días</td>
                    </tr>
                    <tr>
                      <td><strong>Producción Total Ajustada (litros)</strong></td>
                      <td>{results.totalProductionLiters?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Ingresos Totales</strong></td>
                      <td>${results.totalRevenue?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Costos Totales</strong></td>
                      <td>${results.totalCosts?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Margen Bruto</strong></td>
                      <td>${results.grossMargin?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td><strong>Margen (%)</strong></td>
                      <td>{results.marginPercentage?.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td><strong>Tasa de Reemplazo</strong></td>
                      <td>{results.replacementRate?.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h2>Visualización</h2>
                <h3 style={{ marginBottom: '15px' }}>Ciclo de Lactancia</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cycleData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>

                <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Impacto en Producción</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionImpact}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString('es-ES')} litros`} />
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

export default Module3Lactation;
