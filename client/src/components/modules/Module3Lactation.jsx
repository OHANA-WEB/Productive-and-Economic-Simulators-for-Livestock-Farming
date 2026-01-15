import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';

function Module3Lactation({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

  // Scientific inputs (minimal)
  const [selectedBreed, setSelectedBreed] = useState('');
  const [managementLevel, setManagementLevel] = useState('medium');
  const [targetLactationDays, setTargetLactationDays] = useState('');
  
  // Available breeds from database
  const [breeds, setBreeds] = useState([]);
  const [breedDetails, setBreedDetails] = useState(null);
  
  // Simulation results
  const [simulation, setSimulation] = useState(null);
  const [comparisonBreeds, setComparisonBreeds] = useState([]);
  
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });

  useEffect(() => {
    loadScenarios();
    loadBreeds();
    if (scenarioId) {
      loadScenario(scenarioId);
    }
  }, [scenarioId]);

  const loadBreeds = async () => {
    try {
      const response = await api.get('/breeds');
      setBreeds(response.data);
    } catch (error) {
      console.error('Error loading breeds:', error);
    }
  };

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
      
      // Load saved lactation simulation if exists
      if (scenario.lactationSimulation) {
        const sim = scenario.lactationSimulation;
        setSelectedBreed(sim.selected_breed);
        setManagementLevel(sim.management_level);
        setTargetLactationDays(sim.target_lactation_days || '');
        
        // Load full simulation results
        if (sim.selected_breed) {
          await runSimulation(sim.selected_breed, sim.management_level, sim.target_lactation_days);
        }
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleBreedChange = async (breedName) => {
    setSelectedBreed(breedName);
    
    if (breedName) {
      // Load detailed breed information
      try {
        const response = await api.get(`/breeds/${breedName}`);
        setBreedDetails(response.data);
      } catch (error) {
        console.error('Error loading breed details:', error);
      }
    } else {
      setBreedDetails(null);
    }
  };

  const runSimulation = async (breed, management, targetDays) => {
    if (!breed || !management) return;
    
    try {
      setLoading(true);
      const response = await api.post(`/modules/lactation/${selectedScenario.id}`, {
        selected_breed: breed,
        management_level: management,
        target_lactation_days: targetDays || null
      });
      
      setSimulation(response.data.simulation);
      
      // Load comparison breeds
      await loadComparisonBreeds(breed);
      
    } catch (error) {
      console.error('Simulation error:', error);
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorSaving'),
        type: 'error'
      });
    } finally {
      setLoading(false);
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

    if (!selectedBreed) {
      setAlertModal({
        isOpen: true,
        message: t('pleaseSelectBreed'),
        type: 'info'
      });
      return;
    }

    await runSimulation(selectedBreed, managementLevel, targetLactationDays);
    
    setAlertModal({
      isOpen: true,
      message: t('simulationCompleted'),
      type: 'success'
    });
  };

  const loadComparisonBreeds = async (currentBreed) => {
    try {
      // Get top 4 breeds for comparison (excluding current breed)
      const otherBreeds = breeds
        .filter(b => b.breed_name !== currentBreed)
        .slice(0, 3);
      
      const comparisons = [];
      for (const breed of otherBreeds) {
        const response = await api.post(`/modules/lactation/${selectedScenario.id}`, {
          selected_breed: breed.breed_name,
          management_level: managementLevel,
          target_lactation_days: targetLactationDays || null
        });
        comparisons.push({
          breed_name: breed.breed_name,
          simulation: response.data.simulation
        });
      }
      
      setComparisonBreeds(comparisons);
    } catch (error) {
      console.error('Error loading comparisons:', error);
    }
  };

  const handleScenarioChange = (e) => {
    const id = parseInt(e.target.value);
    if (id) {
      loadScenario(id);
      navigate('/module3', { state: { scenarioId: id } });
    }
  };

  // Group breeds by category
  const breedsByCategory = {
    dairy: breeds.filter(b => b.breed_category === 'dairy'),
    dual_purpose: breeds.filter(b => b.breed_category === 'dual_purpose'),
    native: breeds.filter(b => b.breed_category === 'native')
  };

  // Prepare chart data for lactation curve
  const lactationCurveData = simulation?.lactation_curve 
    ? simulation.lactation_curve.filter((_, index) => index % 10 === 0) // Sample every 10 days
    : [];

  // Prepare comparison chart data
  const comparisonData = simulation ? [
    {
      breed: simulation.breed_name,
      [t('totalProduction')]: Number(simulation.total_lactation_liters || 0),
      [t('fat')]: Number(simulation.fat_percentage || 0),
      [t('protein')]: Number(simulation.protein_percentage || 0),
      [t('solids')]: Number(simulation.solids_percentage || 0),
      current: true
    },
    ...comparisonBreeds.map(c => ({
      breed: c.breed_name,
      [t('totalProduction')]: Number(c.simulation?.total_lactation_liters || 0),
      [t('fat')]: Number(c.simulation?.fat_percentage || 0),
      [t('protein')]: Number(c.simulation?.protein_percentage || 0),
      [t('solids')]: Number(c.simulation?.solids_percentage || 0),
      current: false
    }))
  ] : [];

  // Radar chart data for breed profile
  const radarData = simulation ? [
    { metric: t('volume'), value: (Number(simulation.total_lactation_liters || 0) / 100), fullMark: 100 },
    { metric: t('fat'), value: Number(simulation.fat_percentage || 0) * 10, fullMark: 60 },
    { metric: t('protein'), value: Number(simulation.protein_percentage || 0) * 10, fullMark: 45 },
    { metric: t('solids'), value: Number(simulation.solids_percentage || 0) * 4, fullMark: 60 },
    { metric: t('persistence'), value: 100 - (Number(simulation.persistence_rate || 0) * 5), fullMark: 100 }
  ] : [];

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-title-section">
          <h1 className="module-title">🔬 {t('module3Title')}</h1>
          <p className="module-subtitle">{t('module3ScientificSubtitle')}</p>
        </div>
        
        <div className="module-actions">
          <select 
            className="form-select scenario-select" 
            value={selectedScenario?.id || ''} 
            onChange={handleScenarioChange}
          >
            <option value="">{t('selectScenario')}</option>
            {scenarios.map(scenario => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedScenario ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>{t('noScenarioSelected')}</h3>
          <p>{t('selectScenarioToStart')}</p>
        </div>
      ) : (
        <>
          {/* Scientific Input Section */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">🐄 {t('selectBreedAndManagement')}</h2>
              <p className="card-subtitle">{t('scientificEngineDescription')}</p>
            </div>
            <div className="card-content">
              {/* Breed Selection */}
              <div className="form-section">
                <label className="form-label">{t('selectBreed')}</label>
                <select
                  className="form-select"
                  value={selectedBreed}
                  onChange={(e) => handleBreedChange(e.target.value)}
                >
                  <option value="">{t('chooseBreed')}</option>
                  
                  {breedsByCategory.dairy.length > 0 && (
                    <optgroup label={`🥛 ${t('dairyBreeds')}`}>
                      {breedsByCategory.dairy.map(breed => (
                        <option key={breed.id} value={breed.breed_name}>
                          {breed.breed_name} - {breed.total_lactation_liters}L / {breed.fat_percentage}% {t('fat')}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {breedsByCategory.dual_purpose.length > 0 && (
                    <optgroup label={`🌾 ${t('dualPurposeBreeds')}`}>
                      {breedsByCategory.dual_purpose.map(breed => (
                        <option key={breed.id} value={breed.breed_name}>
                          {breed.breed_name} - {breed.total_lactation_liters}L / {breed.fat_percentage}% {t('fat')}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {breedsByCategory.native.length > 0 && (
                    <optgroup label={`🌍 ${t('nativeBreeds')}`}>
                      {breedsByCategory.native.map(breed => (
                        <option key={breed.id} value={breed.breed_name}>
                          {breed.breed_name} - {breed.total_lactation_liters}L / {breed.fat_percentage}% {t('fat')}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Management Level Selection */}
              <div className="form-section">
                <label className="form-label">{t('managementLevel')}</label>
                <div className="radio-group">
                  <label className={`radio-card ${managementLevel === 'low' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="management"
                      value="low"
                      checked={managementLevel === 'low'}
                      onChange={(e) => setManagementLevel(e.target.value)}
                    />
                    <div className="radio-content">
                      <div className="radio-title">⭐ {t('lowManagement')}</div>
                      <div className="radio-description">{t('lowManagementDesc')}</div>
                    </div>
                  </label>
                  
                  <label className={`radio-card ${managementLevel === 'medium' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="management"
                      value="medium"
                      checked={managementLevel === 'medium'}
                      onChange={(e) => setManagementLevel(e.target.value)}
                    />
                    <div className="radio-content">
                      <div className="radio-title">⭐⭐ {t('mediumManagement')}</div>
                      <div className="radio-description">{t('mediumManagementDesc')}</div>
                    </div>
                  </label>
                  
                  <label className={`radio-card ${managementLevel === 'high' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="management"
                      value="high"
                      checked={managementLevel === 'high'}
                      onChange={(e) => setManagementLevel(e.target.value)}
                    />
                    <div className="radio-content">
                      <div className="radio-title">⭐⭐⭐ {t('highManagement')}</div>
                      <div className="radio-description">{t('highManagementDesc')}</div>
                    </div>
                  </label>
                  
                  <label className={`radio-card ${managementLevel === 'optimal' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="management"
                      value="optimal"
                      checked={managementLevel === 'optimal'}
                      onChange={(e) => setManagementLevel(e.target.value)}
                    />
                    <div className="radio-content">
                      <div className="radio-title">⭐⭐⭐⭐ {t('optimalManagement')}</div>
                      <div className="radio-description">{t('optimalManagementDesc')}</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Optional: Custom lactation days */}
              <div className="form-section">
                <label className="form-label">
                  {t('customLactationDays')} <span className="optional-label">({t('optional')})</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={targetLactationDays}
                  onChange={(e) => setTargetLactationDays(e.target.value)}
                  placeholder={t('useBreedDefault')}
                  min="150"
                  max="450"
                />
                <small className="input-hint">{t('lactationDaysHint')}</small>
              </div>

              <button 
                className="btn btn-primary btn-large" 
                onClick={handleSave}
                disabled={loading || !selectedBreed}
              >
                {loading ? t('calculating') : t('runSimulation')}
              </button>
            </div>
          </div>

          {/* Simulation Results */}
          {simulation && (
            <>
              {/* Breed Profile Panel */}
              <div className="card card-highlight">
                <div className="card-header">
                  <h2 className="card-title">📊 {simulation.breed_name} - {t('scientificProfile')}</h2>
                  <span className="badge badge-success">{t(managementLevel + 'Management')}</span>
                </div>
                <div className="card-content">
                  <div className="metrics-grid">
                    {/* Production Metrics */}
                    <div className="metric-card">
                      <div className="metric-icon">🥛</div>
                      <div className="metric-content">
                        <div className="metric-label">{t('expectedProduction')}</div>
                        <div className="metric-value">{Number(simulation.total_lactation_liters || 0).toLocaleString()} L</div>
                        <div className="metric-sub">
                          {t('lactationDays')}: {simulation.lactation_days} | 
                          {t('peak')}: {Number(simulation.peak_yield || 0).toFixed(1)} L/día ({t('day')} {simulation.peak_day})
                        </div>
                      </div>
                    </div>

                    {/* Composition */}
                    <div className="metric-card">
                      <div className="metric-icon">🧈</div>
                      <div className="metric-content">
                        <div className="metric-label">{t('milkComposition')}</div>
                        <div className="metric-value">{Number(simulation.solids_percentage || 0).toFixed(2)}% {t('solids')}</div>
                        <div className="metric-sub">
                          {t('fat')}: {Number(simulation.fat_percentage || 0).toFixed(2)}% ({Number(simulation.fat_kg || 0).toFixed(1)} kg) | 
                          {t('protein')}: {Number(simulation.protein_percentage || 0).toFixed(2)}% ({Number(simulation.protein_kg || 0).toFixed(1)} kg)
                        </div>
                      </div>
                    </div>

                    {/* Persistence */}
                    <div className="metric-card">
                      <div className="metric-icon">📉</div>
                      <div className="metric-content">
                        <div className="metric-label">{t('lactationPersistence')}</div>
                        <div className="metric-value">{Number(simulation.persistence_rate || 0).toFixed(2)}%</div>
                        <div className="metric-sub">{t('monthlyDecline')}</div>
                      </div>
                    </div>

                    {/* Reproductive Cycle */}
                    <div className="metric-card">
                      <div className="metric-icon">🔄</div>
                      <div className="metric-content">
                        <div className="metric-label">{t('reproductiveCycle')}</div>
                        <div className="metric-value">{Number(simulation.cycles_per_year || 0).toFixed(2)}</div>
                        <div className="metric-sub">
                          {t('calvingInterval')}: {simulation.calving_interval_days} días | 
                          {t('dryPeriod')}: {simulation.dry_period_days} días
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lactation Curve Chart */}
                  <div className="chart-section">
                    <h3 className="chart-title">{t('lactationCurve')}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={lactationCurveData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day" 
                          label={{ value: t('daysInMilk'), position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: t('dailyProduction') + ' (L)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value) => [Number(value).toFixed(2) + ' L', t('production')]}
                          labelFormatter={(label) => t('day') + ' ' + label}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="yield" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={false}
                          name={t('production')}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Radar Chart for Breed Profile */}
                  <div className="chart-section">
                    <h3 className="chart-title">{t('breedProfile')}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar 
                          name={simulation.breed_name}
                          dataKey="value" 
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.6} 
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Optimization Potential */}
              {simulation.optimization_potential?.has_potential && (
                <div className="card card-info">
                  <div className="card-header">
                    <h2 className="card-title">💡 {t('optimizationOpportunities')}</h2>
                  </div>
                  <div className="card-content">
                    <div className="alert alert-info">
                      <strong>{t('improvementPotential')}:</strong> +{Number(simulation.optimization_potential?.improvement_percentage || 0).toFixed(1)}% 
                      ({Number(simulation.optimization_potential?.improvement_liters || 0).toLocaleString()} L)
                    </div>
                    
                    <p>
                      {t('currentLevel')}: <strong>{t(managementLevel + 'Management')}</strong> → 
                      {t('nextLevel')}: <strong>{t(simulation.optimization_potential.next_level + 'Management')}</strong>
                    </p>

                    {simulation.optimization_potential.recommendations?.length > 0 && (
                      <div className="recommendations-list">
                        <h4>{t('recommendations')}:</h4>
                        <ul>
                          {simulation.optimization_potential.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Breed Comparison */}
              {comparisonBreeds.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">🔬 {t('breedComparison')}</h2>
                    <p className="card-subtitle">{t('compareAlternatives')}</p>
                  </div>
                  <div className="card-content">
                    {/* Comparison Table */}
                    <div className="table-container">
                      <table className="comparison-table">
                        <thead>
                          <tr>
                            <th>{t('breed')}</th>
                            <th>{t('totalProduction')} (L)</th>
                            <th>{t('fat')} (%)</th>
                            <th>{t('protein')} (%)</th>
                            <th>{t('solids')} (kg)</th>
                            <th>{t('persistence')} (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="current-breed">
                            <td><strong>{simulation.breed_name}</strong> ⭐</td>
                            <td><strong>{Number(simulation.total_lactation_liters || 0).toLocaleString()}</strong></td>
                            <td><strong>{Number(simulation.fat_percentage || 0).toFixed(2)}</strong></td>
                            <td><strong>{Number(simulation.protein_percentage || 0).toFixed(2)}</strong></td>
                            <td><strong>{Number(simulation.solids_kg || 0).toFixed(1)}</strong></td>
                            <td><strong>{Number(simulation.persistence_rate || 0).toFixed(2)}</strong></td>
                          </tr>
                          {comparisonBreeds.map((comp, index) => (
                            <tr key={index}>
                              <td>{comp.breed_name}</td>
                              <td>{Number(comp.simulation?.total_lactation_liters || 0).toLocaleString()}</td>
                              <td>{Number(comp.simulation?.fat_percentage || 0).toFixed(2)}</td>
                              <td>{Number(comp.simulation?.protein_percentage || 0).toFixed(2)}</td>
                              <td>{Number(comp.simulation?.solids_kg || 0).toFixed(1)}</td>
                              <td>{Number(comp.simulation?.persistence_rate || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Comparison Bar Chart */}
                    <div className="chart-section">
                      <h3 className="chart-title">{t('productionComparison')}</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparisonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="breed" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey={t('totalProduction')} 
                            fill="#10b981" 
                            name={t('production') + ' (L)'}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
    </div>
  );
}

export default Module3Lactation;
