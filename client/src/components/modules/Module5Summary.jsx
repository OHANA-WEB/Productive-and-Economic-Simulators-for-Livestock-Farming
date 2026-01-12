import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';

function Module5Summary({ user }) {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios');
      setScenarios(response.data);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  };

  const handleCompare = async () => {
    if (selectedScenarios.length < 2) {
      alert('Selecciona al menos 2 escenarios para comparar');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/scenarios/compare', {
        scenarioIds: selectedScenarios,
      });
      setComparison(response.data);
    } catch (error) {
      alert(error.response?.data?.error || 'Error al comparar escenarios');
    } finally {
      setLoading(false);
    }
  };

  const comparisonData = comparison ? comparison.map(item => ({
    name: item.scenario.name,
    Ingresos: item.results.totalRevenue,
    Costos: item.results.totalCosts,
    Margen: item.results.grossMargin,
    'Margen %': item.results.marginPercentage,
  })) : [];

  const revenueData = comparison ? comparison.map(item => ({
    name: item.scenario.name,
    Ingresos: item.results.totalRevenue,
  })) : [];

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Volver al Dashboard
        </button>
        <h1 style={{ marginTop: '20px' }}>Módulo 5: Resumen/Dashboard</h1>
      </header>

      <div className="card">
        <h2>Comparar Escenarios</h2>
        <p style={{ marginBottom: '15px' }}>
          Selecciona múltiples escenarios para comparar sus resultados lado a lado.
        </p>

        <div style={{ marginBottom: '20px' }}>
          {scenarios.map(scenario => (
            <label
              key={scenario.id}
              style={{
                display: 'block',
                padding: '10px',
                marginBottom: '10px',
                background: selectedScenarios.includes(scenario.id) ? '#e3f2fd' : '#f5f5f5',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedScenarios.includes(scenario.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedScenarios([...selectedScenarios, scenario.id]);
                  } else {
                    setSelectedScenarios(selectedScenarios.filter(id => id !== scenario.id));
                  }
                }}
                style={{ marginRight: '10px' }}
              />
              {scenario.name} ({scenario.type})
            </label>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCompare}
          disabled={loading || selectedScenarios.length < 2}
        >
          {loading ? 'Comparando...' : 'Comparar Escenarios'}
        </button>
      </div>

      {comparison && (
        <>
          <div className="card">
            <h2>Comparación de Resultados</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Escenario</th>
                  <th>Producción (L)</th>
                  <th>Ingresos</th>
                  <th>Costos</th>
                  <th>Margen Bruto</th>
                  <th>Margen %</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((item, index) => (
                  <tr key={index}>
                    <td><strong>{item.scenario.name}</strong></td>
                    <td>{item.results.totalProductionLiters?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    <td>${item.results.totalRevenue?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    <td>${item.results.totalCosts?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    <td>${item.results.grossMargin?.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
                    <td>{item.results.marginPercentage?.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Visualización Comparativa</h2>
            <h3 style={{ marginBottom: '15px' }}>Ingresos, Costos y Márgenes</h3>
            <ResponsiveContainer width="100%" height={400}>
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

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Comparación de Ingresos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString('es-ES')}`} />
                <Legend />
                <Line type="monotone" dataKey="Ingresos" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Márgenes por Escenario</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                <Legend />
                <Bar dataKey="Margen %" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2>Resumen Ejecutivo</h2>
            {comparison.length > 0 && (
              <div>
                <p><strong>Mejor Escenario por Ingresos:</strong> {
                  comparison.reduce((best, current) => 
                    current.results.totalRevenue > best.results.totalRevenue ? current : best
                  ).scenario.name
                }</p>
                <p><strong>Mejor Escenario por Margen:</strong> {
                  comparison.reduce((best, current) => 
                    current.results.grossMargin > best.results.grossMargin ? current : best
                  ).scenario.name
                }</p>
                <p><strong>Mejor Escenario por Margen %:</strong> {
                  comparison.reduce((best, current) => 
                    current.results.marginPercentage > best.results.marginPercentage ? current : best
                  ).scenario.name
                }</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Module5Summary;
