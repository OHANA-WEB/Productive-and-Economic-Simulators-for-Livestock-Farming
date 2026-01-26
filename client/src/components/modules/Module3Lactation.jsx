import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, Area 
} from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';

/**
 * Module 3: Scientific Lactation Intelligence (MetaCaprine ECM Engine)
 * Breed comparison based on ECM (Energy Corrected Milk) lifetime production
 * 
 * Key Features:
 * - Automatic breed ranking by lifetime ECM
 * - Compare 2 breeds side-by-side
 * - Herd size scenarios (e.g., 2000 Malagueña vs 700 LaMancha)
 * - User can override base parameters per breed
 * - All calculations in kg (display note: ≈ L)
 */
function Module3Lactation({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

  // Available breeds from database
  const [breeds, setBreeds] = useState([]);
  
  // Comparison mode: single breed or A vs B
  const [viewMode, setViewMode] = useState('single'); // 'single', 'compare', 'ranking'
  
  // Single breed simulation
  const [selectedBreed, setSelectedBreed] = useState('');
  const [singleOverrides, setSingleOverrides] = useState({
    herd_size: 1,
    milk_kg_yr: '',
    fat_pct: '',
    protein_pct: '',
    lact_days_avg: '',
    lactations_lifetime_avg: ''
  });
  const [singleResult, setSingleResult] = useState(null);
  
  // Comparison: A vs B
  const [breedA, setBreedA] = useState('');
  const [breedB, setBreedB] = useState('');
  const [overridesA, setOverridesA] = useState({
    herd_size: 1,
    milk_kg_yr: '',
    fat_pct: '',
    protein_pct: '',
    lact_days_avg: '',
    lactations_lifetime_avg: ''
  });
  const [overridesB, setOverridesB] = useState({
    herd_size: 1,
    milk_kg_yr: '',
    fat_pct: '',
    protein_pct: '',
    lact_days_avg: '',
    lactations_lifetime_avg: ''
  });
  const [comparisonResult, setComparisonResult] = useState(null);
  
  // Ranking view
  const [rankingResults, setRankingResults] = useState(null);
  const [rankingMode, setRankingMode] = useState('per_head'); // 'per_head' or 'total'
  
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [expandedBreed, setExpandedBreed] = useState({});

  useEffect(() => {
    loadScenarios();
    loadBreeds();
    if (scenarioId) {
      loadScenario(scenarioId);
    }
  }, [scenarioId]);

  const loadBreeds = async () => {
    try {
      const response = await api.get('/module3/breeds');
      setBreeds(response.data.breeds || []);
      
      // Auto-load ranking on first load
      if (response.data.breeds && response.data.breeds.length > 0) {
        const topBreeds = response.data.breeds.slice(0, 10);
        setRankingResults({
          mode: 'per_head',
          count: topBreeds.length,
          scenarios: topBreeds
        });
      }
    } catch (error) {
      console.error('Error loading breeds:', error);
      setAlertModal({
        isOpen: true,
        message: t('errorLoadingBreeds') || 'Error loading breed data. Please ensure Module 3 migration has been run.',
        type: 'error'
      });
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
      
      // Load saved breed scenarios if exists
      const savedResponse = await api.get(`/module3/scenario/${id}/load`);
      if (savedResponse.data.scenarios && savedResponse.data.scenarios.length > 0) {
        const saved = savedResponse.data.scenarios[0];
        setSelectedBreed(saved.breed_key);
        setSingleOverrides({
          herd_size: saved.herd_size || 1,
          milk_kg_yr: saved.milk_kg_yr_override || '',
          fat_pct: saved.fat_pct_override || '',
          protein_pct: saved.protein_pct_override || '',
          lact_days_avg: saved.lact_days_avg_override || '',
          lactations_lifetime_avg: saved.lactations_lifetime_avg_override || ''
        });
        // Auto-calculate
        await handleSimulateSingle(saved.breed_key, {
          herd_size: saved.herd_size || 1,
          milk_kg_yr: saved.milk_kg_yr_override || '',
          fat_pct: saved.fat_pct_override || '',
          protein_pct: saved.protein_pct_override || '',
          lact_days_avg: saved.lact_days_avg_override || '',
          lactations_lifetime_avg: saved.lactations_lifetime_avg_override || ''
        });
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleSimulateSingle = async (breedKey = selectedBreed, overrides = singleOverrides) => {
    if (!breedKey) {
      setAlertModal({
        isOpen: true,
        message: t('pleaseSelectBreed') || 'Please select a breed',
        type: 'info'
      });
      return;
    }

    setLoading(true);
    try {
      // Clean overrides: only send non-empty values
      const cleanOverrides = {};
      Object.keys(overrides).forEach(key => {
        const value = overrides[key];
        if (value !== '' && value !== null && value !== undefined) {
          cleanOverrides[key] = Number(value);
        }
      });

      const response = await api.post('/module3/simulate', {
        breed_key: breedKey,
        overrides: cleanOverrides
      });
      
      setSingleResult(response.data.scenario);
    } catch (error) {
      console.error('Error simulating breed:', error);
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorCalculating') || 'Error calculating',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!breedA || !breedB) {
      setAlertModal({
        isOpen: true,
        message: t('pleaseSelectTwoBreedsForComparison') || 'Please select both breeds to compare',
        type: 'info'
      });
      return;
    }

    setLoading(true);
    try {
      const cleanOverridesA = {};
      const cleanOverridesB = {};
      
      Object.keys(overridesA).forEach(key => {
        const value = overridesA[key];
        if (value !== '' && value !== null && value !== undefined) {
          cleanOverridesA[key] = Number(value);
        }
      });
      
      Object.keys(overridesB).forEach(key => {
        const value = overridesB[key];
        if (value !== '' && value !== null && value !== undefined) {
          cleanOverridesB[key] = Number(value);
        }
      });

      const response = await api.post('/module3/compare', {
        a: { breed_key: breedA, overrides: cleanOverridesA },
        b: { breed_key: breedB, overrides: cleanOverridesB }
      });
      
      setComparisonResult(response.data.comparison);
    } catch (error) {
      console.error('Error comparing breeds:', error);
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorRunningComparison') || 'Error comparing breeds',
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
        message: t('pleaseSelectScenario') || 'Please select a scenario',
        type: 'info'
      });
      return;
    }

    if (!selectedBreed) {
      setAlertModal({
        isOpen: true,
        message: 'Please select a breed',
        type: 'info'
      });
      return;
    }

    setLoading(true);
    try {
      const cleanOverrides = {};
      Object.keys(singleOverrides).forEach(key => {
        const value = singleOverrides[key];
        if (value !== '' && value !== null && value !== undefined) {
          cleanOverrides[key] = Number(value);
        }
      });

      await api.post(`/module3/scenario/${selectedScenario.id}/save`, {
        breed_key: selectedBreed,
        overrides: cleanOverrides
      });
      
      setAlertModal({
        isOpen: true,
        message: t('dataSaved') || 'Data saved successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving breed scenario:', error);
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorSaving') || 'Error saving',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideChange = (field, value, target = 'single') => {
    if (target === 'single') {
      setSingleOverrides(prev => ({ ...prev, [field]: value }));
    } else if (target === 'A') {
      setOverridesA(prev => ({ ...prev, [field]: value }));
    } else if (target === 'B') {
      setOverridesB(prev => ({ ...prev, [field]: value }));
    }
  };

  const getBreedData = (breedKey) => {
    return breeds.find(b => b.breed_key === breedKey);
  };

  const formatNumber = (num, decimals = 1) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          {t('backToDashboard')}
        </button>
        <h1 style={{ marginTop: '20px' }}>{t('module3Title')}</h1>
        <p style={{ color: '#666', fontSize: '0.95em' }}>
          🧬 {t('module3ScientificSubtitle')}
        </p>
      </header>

      <div className="card">
        <h2>{t('selectScenario')}</h2>
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
          <option value="">{t('selectScenarioPlaceholder')}</option>
          {scenarios.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedScenario && (
        <>
          {/* View Mode Selector */}
          <div className="card">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className={`btn ${viewMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('single')}
              >
                📊 {t('singleBreedSimulation')}
              </button>
              <button
                className={`btn ${viewMode === 'compare' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('compare')}
              >
                ⚖️ {t('compareAvsB')}
              </button>
              <button
                className={`btn ${viewMode === 'ranking' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('ranking')}
              >
                🏆 {t('ranking')}
              </button>
            </div>
          </div>

          {/* Single Breed View */}
          {viewMode === 'single' && (
            <div className="card">
              <h2>🐐 {t('singleBreedSimulation')}</h2>
              
              <div className="form-group">
                <label>{t('selectBreed')}</label>
                <select
                  value={selectedBreed}
                  onChange={(e) => setSelectedBreed(e.target.value)}
                  style={{ marginBottom: '20px' }}
                >
                  <option value="">{t('chooseBreed')}</option>
                  {breeds.map(breed => (
                    <option key={breed.breed_key} value={breed.breed_key}>
                      {breed.breed_name} ({breed.country_or_system}) - {formatNumber(breed.ecm_kg_lifetime)} kg {t('ecmLifetime')}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBreed && getBreedData(selectedBreed) && (
                <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <h3 style={{ marginTop: 0 }}>{t('baseParameters')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div>
                      <strong>{t('milkKgPerYear')}:</strong> {formatNumber(getBreedData(selectedBreed).milk_kg_yr)}
                    </div>
                    <div>
                      <strong>{t('fatPercent')}:</strong> {formatNumber(getBreedData(selectedBreed).fat_pct, 2)}
                    </div>
                    <div>
                      <strong>{t('proteinPercent')}:</strong> {formatNumber(getBreedData(selectedBreed).protein_pct, 2)}
                    </div>
                    <div>
                      <strong>{t('lactationDaysAvg')}:</strong> {formatNumber(getBreedData(selectedBreed).lact_days_avg, 0)}
                    </div>
                    <div>
                      <strong>{t('lactationsPerLife')}:</strong> {formatNumber(getBreedData(selectedBreed).lactations_lifetime_avg, 1)}
                    </div>
                    <div>
                      <strong>{t('ecmLifetime')}:</strong> {formatNumber(getBreedData(selectedBreed).ecm_kg_lifetime, 1)} kg
                    </div>
                  </div>
                  <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                    {getBreedData(selectedBreed).notes}
                  </p>
                </div>
              )}

              <h3>{t('overridesOptional')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>{t('herdSize')}</label>
                  <input
                    type="number"
                    value={singleOverrides.herd_size}
                    onChange={(e) => handleOverrideChange('herd_size', e.target.value, 'single')}
                    min="1"
                    step="1"
                  />
                </div>
                <div className="form-group">
                  <label>{t('milkKgPerYear')}</label>
                  <input
                    type="number"
                    value={singleOverrides.milk_kg_yr}
                    onChange={(e) => handleOverrideChange('milk_kg_yr', e.target.value, 'single')}
                    placeholder={t('leaveEmptyForDefault')}
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>{t('fatPercent')}</label>
                  <input
                    type="number"
                    value={singleOverrides.fat_pct}
                    onChange={(e) => handleOverrideChange('fat_pct', e.target.value, 'single')}
                    placeholder={t('leaveEmptyForDefault')}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>{t('proteinPercent')}</label>
                  <input
                    type="number"
                    value={singleOverrides.protein_pct}
                    onChange={(e) => handleOverrideChange('protein_pct', e.target.value, 'single')}
                    placeholder={t('leaveEmptyForDefault')}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>{t('lactationDaysAvg')}</label>
                  <input
                    type="number"
                    value={singleOverrides.lact_days_avg}
                    onChange={(e) => handleOverrideChange('lact_days_avg', e.target.value, 'single')}
                    placeholder={t('leaveEmptyForDefault')}
                    step="1"
                  />
                </div>
                <div className="form-group">
                  <label>{t('lactationsPerLife')}</label>
                  <input
                    type="number"
                    value={singleOverrides.lactations_lifetime_avg}
                    onChange={(e) => handleOverrideChange('lactations_lifetime_avg', e.target.value, 'single')}
                    placeholder={t('leaveEmptyForDefault')}
                    step="0.1"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleSimulateSingle()}
                  disabled={loading}
                >
                  {loading ? t('calculating') : t('calculate')}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleSave}
                  disabled={loading || !singleResult}
                >
                  {t('save')}
                </button>
              </div>

              {singleResult && (
                <div style={{ marginTop: '30px' }}>
                  <h2>{t('results')}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
                      <h3 style={{ marginTop: 0 }}>{t('perAnimalAnnual')}</h3>
                      <p><strong>{t('milk')}:</strong> {formatNumber(singleResult.milk_kg_yr)} kg {singleResult.approx_liters_note}</p>
                      <p><strong>{t('fat')}:</strong> {formatNumber(singleResult.fat_kg_yr)} kg ({formatNumber(singleResult.fat_pct, 2)}%)</p>
                      <p><strong>{t('protein')}:</strong> {formatNumber(singleResult.protein_kg_yr)} kg ({formatNumber(singleResult.protein_pct, 2)}%)</p>
                      <p><strong>{t('fat')} + {t('protein')}:</strong> {formatNumber(singleResult.fat_plus_protein_kg_yr)} kg</p>
                      <p><strong>ECM:</strong> {formatNumber(singleResult.ecm_kg_yr)} kg</p>
                    </div>
                    <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
                      <h3 style={{ marginTop: 0 }}>{t('perAnimalLifetime')}</h3>
                      <p><strong>{t('milk')}:</strong> {formatNumber(singleResult.milk_kg_lifetime)} kg</p>
                      <p><strong>{t('fat')}:</strong> {formatNumber(singleResult.fat_kg_lifetime)} kg</p>
                      <p><strong>{t('protein')}:</strong> {formatNumber(singleResult.protein_kg_lifetime)} kg</p>
                      <p><strong>{t('fat')} + {t('protein')}:</strong> {formatNumber(singleResult.fat_plus_protein_kg_lifetime)} kg</p>
                      <p><strong>{t('ecmLifetime')}:</strong> {formatNumber(singleResult.ecm_kg_lifetime)} kg</p>
                      <p><small>({formatNumber(singleResult.lactations_lifetime_avg, 1)} {t('lactationsPerLife')} × {formatNumber(singleResult.lact_days_avg, 0)} {t('days')})</small></p>
                    </div>
                    <div style={{ padding: '15px', background: '#fff3e0', borderRadius: '8px' }}>
                      <h3 style={{ marginTop: 0 }}>{t('herdTotal')} ({formatNumber(singleResult.herd_size, 0)} {t('animals')})</h3>
                      <p><strong>{t('totalMilkPerYear')}:</strong> {formatNumber(singleResult.milk_kg_yr_total)} kg</p>
                      <p><strong>{t('totalFatPerYear')}:</strong> {formatNumber(singleResult.fat_kg_yr_total)} kg</p>
                      <p><strong>{t('totalProteinPerYear')}:</strong> {formatNumber(singleResult.protein_kg_yr_total)} kg</p>
                      <p><strong>{t('totalECMPerYear')}:</strong> {formatNumber(singleResult.ecm_kg_yr_total)} kg</p>
                      <p><strong>{t('totalECMLifetime')}:</strong> {formatNumber(singleResult.ecm_kg_lifetime_total)} kg</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compare A vs B View */}
          {viewMode === 'compare' && (
            <div className="card">
              <h2>⚖️ {t('compareTwoBreeds')}</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px', marginBottom: '20px' }}>
                {/* Breed A */}
                <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
                  <h3 style={{ marginTop: 0 }}>{t('breedA')}</h3>
                  <div className="form-group">
                    <label>{t('selectBreed')}</label>
                    <select
                      value={breedA}
                      onChange={(e) => setBreedA(e.target.value)}
                    >
                      <option value="">{t('chooseBreed')}</option>
                      {breeds.map(breed => (
                        <option key={breed.breed_key} value={breed.breed_key}>
                          {breed.breed_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {breedA && (
                    <>
                      <div className="form-group">
                        <label>{t('herdSize')}</label>
                        <input
                          type="number"
                          value={overridesA.herd_size}
                          onChange={(e) => handleOverrideChange('herd_size', e.target.value, 'A')}
                          min="1"
                        />
                      </div>
                      <details>
                        <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>{t('advancedOverrides')}</summary>
                        <div className="form-group">
                          <label>{t('milkKgPerYear')}</label>
                          <input
                            type="number"
                            value={overridesA.milk_kg_yr}
                            onChange={(e) => handleOverrideChange('milk_kg_yr', e.target.value, 'A')}
                            placeholder={t('leaveEmptyForDefault')}
                          />
                        </div>
                        <div className="form-group">
                          <label>{t('fatPercent')}</label>
                          <input
                            type="number"
                            value={overridesA.fat_pct}
                            onChange={(e) => handleOverrideChange('fat_pct', e.target.value, 'A')}
                            placeholder={t('leaveEmptyForDefault')}
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label>{t('proteinPercent')}</label>
                          <input
                            type="number"
                            value={overridesA.protein_pct}
                            onChange={(e) => handleOverrideChange('protein_pct', e.target.value, 'A')}
                            placeholder={t('leaveEmptyForDefault')}
                            step="0.01"
                          />
                        </div>
                      </details>
                    </>
                  )}
                </div>

                {/* Breed B */}
                <div style={{ padding: '20px', background: '#f3e5f5', borderRadius: '8px' }}>
                  <h3 style={{ marginTop: 0 }}>{t('breedB')}</h3>
                  <div className="form-group">
                    <label>{t('selectBreed')}</label>
                    <select
                      value={breedB}
                      onChange={(e) => setBreedB(e.target.value)}
                    >
                      <option value="">{t('chooseBreed')}</option>
                      {breeds.map(breed => (
                        <option key={breed.breed_key} value={breed.breed_key}>
                          {breed.breed_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {breedB && (
                    <>
                      <div className="form-group">
                        <label>{t('herdSize')}</label>
                        <input
                          type="number"
                          value={overridesB.herd_size}
                          onChange={(e) => handleOverrideChange('herd_size', e.target.value, 'B')}
                          min="1"
                        />
                      </div>
                      <details>
                        <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>{t('advancedOverrides')}</summary>
                        <div className="form-group">
                          <label>{t('milkKgPerYear')}</label>
                          <input
                            type="number"
                            value={overridesB.milk_kg_yr}
                            onChange={(e) => handleOverrideChange('milk_kg_yr', e.target.value, 'B')}
                            placeholder={t('leaveEmptyForDefault')}
                          />
                        </div>
                        <div className="form-group">
                          <label>{t('fatPercent')}</label>
                          <input
                            type="number"
                            value={overridesB.fat_pct}
                            onChange={(e) => handleOverrideChange('fat_pct', e.target.value, 'B')}
                            placeholder={t('leaveEmptyForDefault')}
                            step="0.01"
                          />
                        </div>
                        <div className="form-group">
                          <label>{t('proteinPercent')}</label>
                          <input
                            type="number"
                            value={overridesB.protein_pct}
                            onChange={(e) => handleOverrideChange('protein_pct', e.target.value, 'B')}
                            placeholder={t('leaveEmptyForDefault')}
                            step="0.01"
                          />
                        </div>
                      </details>
                    </>
                  )}
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleCompare}
                disabled={loading || !breedA || !breedB}
              >
                {loading ? t('comparing') : t('runComparison')}
              </button>

              {comparisonResult && (
                <div style={{ marginTop: '30px' }}>
                  <h2>{t('comparisonResults')}</h2>
                  <div style={{ padding: '20px', background: comparisonResult.winner === 'A' ? '#e3f2fd' : '#f3e5f5', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3 style={{ marginTop: 0 }}>
                      🏆 {t('winner')}: {t('breed')} {comparisonResult.winner} ({comparisonResult.winner === 'A' ? comparisonResult.aScenario.breed_name : comparisonResult.bScenario.breed_name})
                    </h3>
                    <p><strong>{t('ecmLifetimeDifference')}:</strong> {formatNumber(Math.abs(comparisonResult.delta.ecm_kg_lifetime_total))} kg ({formatNumber(Math.abs(comparisonResult.ecmDeltaPercent), 1)}%)</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' }}>
                    <div>
                      <h4>{t('breedA')}: {comparisonResult.aScenario.breed_name}</h4>
                      <p><strong>{t('herdSize')}:</strong> {formatNumber(comparisonResult.aScenario.herd_size, 0)} {t('animals')}</p>
                      <p><strong>ECM/{t('animals')}/yr:</strong> {formatNumber(comparisonResult.aScenario.ecm_kg_yr)} kg</p>
                      <p><strong>{t('totalECMLifetime')}:</strong> {formatNumber(comparisonResult.aScenario.ecm_kg_lifetime_total)} kg</p>
                      <p><strong>{t('fat')} {t('totalECMLifetime')}:</strong> {formatNumber(comparisonResult.aScenario.fat_kg_lifetime * comparisonResult.aScenario.herd_size)} kg</p>
                      <p><strong>{t('protein')} {t('totalECMLifetime')}:</strong> {formatNumber(comparisonResult.aScenario.protein_kg_lifetime * comparisonResult.aScenario.herd_size)} kg</p>
                    </div>
                    <div>
                      <h4>{t('breedB')}: {comparisonResult.bScenario.breed_name}</h4>
                      <p><strong>{t('herdSize')}:</strong> {formatNumber(comparisonResult.bScenario.herd_size, 0)} {t('animals')}</p>
                      <p><strong>ECM/{t('animals')}/yr:</strong> {formatNumber(comparisonResult.bScenario.ecm_kg_yr)} kg</p>
                      <p><strong>{t('totalECMLifetime')}:</strong> {formatNumber(comparisonResult.bScenario.ecm_kg_lifetime_total)} kg</p>
                      <p><strong>{t('fat')} {t('totalECMLifetime')}:</strong> {formatNumber(comparisonResult.bScenario.fat_kg_lifetime * comparisonResult.bScenario.herd_size)} kg</p>
                      <p><strong>{t('protein')} {t('totalECMLifetime')}:</strong> {formatNumber(comparisonResult.bScenario.protein_kg_lifetime * comparisonResult.bScenario.herd_size)} kg</p>
                    </div>
                  </div>

                  {/* Charts */}
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'Breed A', 'ECM Lifetime': comparisonResult.aScenario.ecm_kg_lifetime_total, 'Fat': comparisonResult.aScenario.fat_kg_lifetime * comparisonResult.aScenario.herd_size, 'Protein': comparisonResult.aScenario.protein_kg_lifetime * comparisonResult.aScenario.herd_size },
                      { name: 'Breed B', 'ECM Lifetime': comparisonResult.bScenario.ecm_kg_lifetime_total, 'Fat': comparisonResult.bScenario.fat_kg_lifetime * comparisonResult.bScenario.herd_size, 'Protein': comparisonResult.bScenario.protein_kg_lifetime * comparisonResult.bScenario.herd_size }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="ECM Lifetime" fill="#8884d8" />
                      <Bar dataKey="Fat" fill="#82ca9d" />
                      <Bar dataKey="Protein" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Ranking View */}
          {viewMode === 'ranking' && rankingResults && (
            <div className="card">
              <h2>🏆 {t('breedRankingByEcmLifetime')}</h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                {t('breedRankingSubtitle')}
              </p>

              <div className="table-container" style={{ overflowX: 'auto', marginBottom: '30px' }}>
                <table className="table" style={{ minWidth: '800px' }}>
                  <thead>
                    <tr>
                      <th>{t('rank')}</th>
                      <th>{t('breed')}</th>
                      <th>{t('countrySystem')}</th>
                      <th>{t('milkKgPerYear')}</th>
                      <th>{t('fatPercent')}</th>
                      <th>{t('proteinPercent')}</th>
                      <th>{t('ecmPerYear')}</th>
                      <th>{t('lactationsPerLife')}</th>
                      <th style={{ fontWeight: 'bold', background: '#e8f5e9' }}>{t('ecmLifetime')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingResults.scenarios.map((scenario, idx) => (
                      <tr key={scenario.breed_key || idx} style={{ cursor: 'pointer' }} onClick={() => setExpandedBreed(prev => ({ ...prev, [scenario.breed_key]: !prev[scenario.breed_key] }))}>
                        <td style={{ fontWeight: 'bold' }}>{idx + 1}</td>
                        <td><strong>{scenario.breed_name || scenario.breed_key}</strong></td>
                        <td><small>{scenario.country_or_system}</small></td>
                        <td>{formatNumber(scenario.milk_kg_yr)}</td>
                        <td>{formatNumber(scenario.fat_pct, 2)}</td>
                        <td>{formatNumber(scenario.protein_pct, 2)}</td>
                        <td>{formatNumber(scenario.ecm_kg_yr)}</td>
                        <td>{formatNumber(scenario.lactations_lifetime_avg, 1)}</td>
                        <td style={{ fontWeight: 'bold', background: idx < 3 ? '#fff3e0' : '#e8f5e9' }}>
                          {formatNumber(scenario.ecm_kg_lifetime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ranking Chart */}
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={rankingResults.scenarios.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="breed_name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ecm_kg_lifetime" fill="#8884d8" name="ECM Lifetime (kg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.type === 'success' ? t('success') : alertModal.type === 'error' ? t('error') : t('information')}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

export default Module3Lactation;
