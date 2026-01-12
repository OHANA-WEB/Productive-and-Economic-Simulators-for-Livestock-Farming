import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

function Dashboard({ user, onLogout }) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioType, setNewScenarioType] = useState('milk_sale');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios');
      setScenarios(response.data);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async (e) => {
    e.preventDefault();
    try {
      await api.post('/scenarios', {
        name: newScenarioName,
        type: newScenarioType,
      });
      setNewScenarioName('');
      setShowCreateForm(false);
      loadScenarios();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al crear escenario');
    }
  };

  const handleDuplicateScenario = async (scenarioId) => {
    try {
      await api.post(`/scenarios/${scenarioId}/duplicate`);
      loadScenarios();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al duplicar escenario');
    }
  };

  const handleDeleteScenario = async (scenarioId) => {
    if (!confirm('¿Estás seguro de eliminar este escenario?')) return;

    try {
      await api.delete(`/scenarios/${scenarioId}`);
      loadScenarios();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al eliminar escenario');
    }
  };

  const getModulePath = (type) => {
    const typeMap = {
      milk_sale: '/module1',
      transformation: '/module2',
      lactation: '/module3',
      yield: '/module4',
      summary: '/module5',
    };
    return typeMap[type] || '/dashboard';
  };

  const getModuleName = (type) => {
    const nameMap = {
      milk_sale: 'Producción y Venta de Leche',
      transformation: 'Transformación Láctea',
      lactation: 'Lactancia y Vida Productiva',
      yield: 'Rendimiento/Conversión',
      summary: 'Resumen/Dashboard',
    };
    return nameMap[type] || type;
  };

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>MVP Web - Simuladores Ganadería</h1>
        <div>
          <span style={{ marginRight: '15px' }}>Hola, {user?.name || user?.email}</span>
          <button className="btn btn-secondary" onClick={onLogout}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Mis Escenarios</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancelar' : '+ Nuevo Escenario'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateScenario} style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
            <div className="form-group">
              <label>Nombre del Escenario</label>
              <input
                type="text"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                required
                placeholder="Ej: Venta de Leche - Escenario 1"
              />
            </div>
            <div className="form-group">
              <label>Tipo de Módulo</label>
              <select value={newScenarioType} onChange={(e) => setNewScenarioType(e.target.value)}>
                <option value="milk_sale">Producción y Venta de Leche</option>
                <option value="transformation">Transformación Láctea</option>
                <option value="lactation">Lactancia y Vida Productiva</option>
                <option value="yield">Rendimiento/Conversión</option>
                <option value="summary">Resumen/Dashboard</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Crear Escenario
            </button>
          </form>
        )}

        {loading ? (
          <p>Cargando escenarios...</p>
        ) : scenarios.length === 0 ? (
          <p>No tienes escenarios aún. Crea uno para comenzar.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => (
                <tr key={scenario.id}>
                  <td>{scenario.name}</td>
                  <td>{getModuleName(scenario.type)}</td>
                  <td>{new Date(scenario.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link
                      to={getModulePath(scenario.type)}
                      state={{ scenarioId: scenario.id }}
                      className="btn btn-primary"
                      style={{ marginRight: '5px', textDecoration: 'none', display: 'inline-block' }}
                    >
                      Abrir
                    </Link>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDuplicateScenario(scenario.id)}
                      style={{ marginRight: '5px' }}
                    >
                      Duplicar
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteScenario(scenario.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
