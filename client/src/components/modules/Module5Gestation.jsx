import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';

/**
 * Module 5: Gestation Simulator + Reproductive Calendar
 * Visual tool for tracking goat gestation and reproductive management
 * 
 * Features:
 * - Mating/insemination date input
 * - Gestation duration (150 days default, editable)
 * - Probable birth date calculation
 * - 22-week timeline visualization
 * - Stage-based checklists and critical alerts
 * - Scenario persistence
 */
function Module5Gestation({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

  const [formData, setFormData] = useState({
    mating_date: '',
    gestation_days: 150, // Default for goats
    notes: '',
  });

  const [calculatedData, setCalculatedData] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });

  useEffect(() => {
    const initialize = async () => {
      await loadScenarios();
      if (scenarioId) {
        await loadScenario(scenarioId);
      }
    };
    initialize();
  }, [scenarioId]);

  useEffect(() => {
    if (formData.mating_date && formData.gestation_days) {
      calculateGestationTimeline();
    }
  }, [formData.mating_date, formData.gestation_days]);

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios');
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
      if (scenario.gestationData) {
        setFormData(scenario.gestationData);
      }
      if (scenario.calculatedGestationTimeline) {
        setCalculatedData(scenario.calculatedGestationTimeline);
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateGestationTimeline = () => {
    if (!formData.mating_date) return;

    const matingDate = new Date(formData.mating_date);
    const gestationDays = parseInt(formData.gestation_days) || 150;
    
    // Calculate birth date
    const birthDate = new Date(matingDate);
    birthDate.setDate(birthDate.getDate() + gestationDays);
    
    // Calculate today's position
    const today = new Date();
    const daysFromMating = Math.floor((today - matingDate) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysFromMating / 7);
    const daysUntilBirth = gestationDays - daysFromMating;
    
    // Calculate weeks
    const totalWeeks = Math.ceil(gestationDays / 7);
    const weeks = [];
    
    for (let week = 1; week <= totalWeeks; week++) {
      const weekStartDay = (week - 1) * 7;
      const weekEndDay = Math.min(week * 7, gestationDays);
      const weekStartDate = new Date(matingDate);
      weekStartDate.setDate(weekStartDate.getDate() + weekStartDay);
      
      const stage = getGestationStage(week, totalWeeks);
      const alerts = getStageAlerts(week, totalWeeks);
      
      weeks.push({
        week,
        startDay: weekStartDay,
        endDay: weekEndDay,
        startDate: weekStartDate,
        stage: stage.name,
        stageColor: stage.color,
        alerts,
        isCurrent: week === currentWeek || (week === currentWeek + 1 && daysFromMating % 7 > 0),
        isPast: week < currentWeek,
      });
    }
    
    setCalculatedData({
      matingDate,
      birthDate,
      gestationDays,
      totalWeeks,
      currentWeek: Math.max(0, currentWeek),
      daysFromMating: Math.max(0, daysFromMating),
      daysUntilBirth,
      weeks,
      isPregnant: daysFromMating >= 0 && daysFromMating <= gestationDays,
      hasGivenBirth: daysFromMating > gestationDays,
    });
  };

  const getGestationStage = (week, totalWeeks) => {
    const progress = week / totalWeeks;
    
    if (progress <= 0.33) {
      return { name: t('earlyGestation'), color: '#e3f2fd' }; // Light blue
    } else if (progress <= 0.67) {
      return { name: t('midGestation'), color: '#fff3e0' }; // Light orange
    } else {
      return { name: t('lateGestation'), color: '#ffebee' }; // Light red
    }
  };

  const getStageAlerts = (week, totalWeeks) => {
    const alerts = [];
    
    // Early stage (weeks 1-7)
    if (week === 1) {
      alerts.push({ type: 'info', message: t('gestationWeek1Alert') });
    }
    if (week === 2) {
      alerts.push({ type: 'info', message: t('gestationWeek2Alert') });
    }
    if (week >= 3 && week <= 5) {
      alerts.push({ type: 'success', message: t('gestationWeek3to5Alert') });
    }
    
    // Mid stage (weeks 8-14)
    if (week === 8) {
      alerts.push({ type: 'warning', message: t('gestationWeek8Alert') });
    }
    if (week === 12) {
      alerts.push({ type: 'info', message: t('gestationWeek12Alert') });
    }
    
    // Late stage (weeks 15-22)
    if (week === 15) {
      alerts.push({ type: 'warning', message: t('gestationWeek15Alert') });
    }
    if (week === 18) {
      alerts.push({ type: 'error', message: t('gestationWeek18Alert') });
    }
    if (week === 20) {
      alerts.push({ type: 'error', message: t('gestationWeek20Alert') });
    }
    if (week === 21 || week === 22) {
      alerts.push({ type: 'error', message: t('gestationWeek21Alert') });
    }
    
    return alerts;
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

    setLoading(true);
    try {
      await api.put(`/scenarios/${selectedScenario.id}`, {
        gestationData: formData,
        calculatedGestationTimeline: calculatedData,
      });
      
      setAlertModal({
        isOpen: true,
        message: t('dataSaved'),
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving gestation data:', error);
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorSaving'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return '🚨';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'error': return '#ffebee';
      case 'warning': return '#fff3e0';
      case 'success': return '#e8f5e9';
      case 'info': return '#e3f2fd';
      default: return '#f5f5f5';
    }
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          {t('backToDashboard')}
        </button>
        <h1 style={{ marginTop: '20px' }}>{t('module5Title')}</h1>
        <p style={{ color: '#666', fontSize: '0.95em' }}>
          🐐 {t('module5Subtitle')}
        </p>
      </header>

      <div className="card">
        <h2>{t('selectScenario')}</h2>
        <select
          value={selectedScenario?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (id) {
              navigate(`/module5`, { state: { scenarioId: id }, replace: true });
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
            <h2>{t('gestationInputs')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <div className="form-group">
                <label>{t('matingDate')}</label>
                <input
                  type="date"
                  name="mating_date"
                  value={formData.mating_date}
                  onChange={handleInputChange}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  {t('matingDateHint')}
                </small>
              </div>
              
              <div className="form-group">
                <label>{t('gestationDays')}</label>
                <input
                  type="number"
                  name="gestation_days"
                  value={formData.gestation_days}
                  onChange={handleInputChange}
                  min="140"
                  max="160"
                  step="1"
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  {t('gestationDaysHint')}
                </small>
              </div>
            </div>
            
            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>{t('notes')} ({t('optional')})</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder={t('gestationNotesPlaceholder')}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>

            <button className="btn btn-secondary" onClick={handleSave} disabled={loading} style={{ marginTop: '15px' }}>
              {loading ? t('saving') : t('save')}
            </button>
          </div>

          {calculatedData && (
            <>
              {/* Summary Card */}
              <div className="card">
                <h2>{t('gestationSummary')}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1em', color: '#1976d2' }}>{t('matingDate')}</h3>
                    <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                      {formatDate(calculatedData.matingDate)}
                    </p>
                  </div>
                  
                  <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1em', color: '#388e3c' }}>{t('probableBirthDate')}</h3>
                    <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                      {formatDate(calculatedData.birthDate)}
                    </p>
                  </div>
                  
                  <div style={{ padding: '15px', background: '#fff3e0', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1em', color: '#f57c00' }}>{t('gestationDuration')}</h3>
                    <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                      {calculatedData.gestationDays} {t('days')} ({calculatedData.totalWeeks} {t('weeks')})
                    </p>
                  </div>
                  
                  {calculatedData.isPregnant && !calculatedData.hasGivenBirth && (
                    <>
                      <div style={{ padding: '15px', background: '#f3e5f5', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1em', color: '#7b1fa2' }}>{t('currentWeek')}</h3>
                        <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                          {t('week')} {calculatedData.currentWeek + 1} ({calculatedData.daysFromMating} {t('days')})
                        </p>
                      </div>
                      
                      <div style={{ padding: '15px', background: '#ffebee', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1em', color: '#c62828' }}>{t('daysUntilBirth')}</h3>
                        <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                          {calculatedData.daysUntilBirth > 0 ? calculatedData.daysUntilBirth : 0} {t('days')}
                        </p>
                      </div>
                    </>
                  )}
                  
                  {calculatedData.hasGivenBirth && (
                    <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
                      <h3 style={{ marginTop: 0, fontSize: '1em', color: '#388e3c' }}>📣 {t('status')}</h3>
                      <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold' }}>
                        {t('birthOccurred')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {calculatedData.isPregnant && !calculatedData.hasGivenBirth && (
                <div className="card">
                  <h2>{t('gestationProgress')}</h2>
                  <div style={{ width: '100%', background: '#e0e0e0', borderRadius: '8px', height: '30px', position: 'relative', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${(calculatedData.daysFromMating / calculatedData.gestationDays) * 100}%`, 
                        background: 'linear-gradient(90deg, #64b5f6, #1976d2)',
                        height: '100%',
                        borderRadius: '8px',
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '10px',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.9em'
                      }}
                    >
                      {Math.round((calculatedData.daysFromMating / calculatedData.gestationDays) * 100)}%
                    </div>
                  </div>
                  <p style={{ marginTop: '10px', textAlign: 'center', color: '#666' }}>
                    {calculatedData.daysFromMating} / {calculatedData.gestationDays} {t('days')}
                  </p>
                </div>
              )}

              {/* Weekly Timeline */}
              <div className="card">
                <h2>{t('weeklyTimeline')}</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  {t('weeklyTimelineDescription')}
                </p>
                
                <div style={{ display: 'grid', gap: '15px' }}>
                  {calculatedData.weeks.map((week) => (
                    <div 
                      key={week.week}
                      style={{
                        padding: '15px',
                        background: week.isCurrent ? '#fff9c4' : week.isPast ? '#f5f5f5' : week.stageColor,
                        borderRadius: '8px',
                        border: week.isCurrent ? '3px solid #fbc02d' : '1px solid #e0e0e0',
                        opacity: week.isPast ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1em' }}>
                            {week.isCurrent && '📍 '}{t('week')} {week.week}
                            {week.isCurrent && ` (${t('current')})`}
                          </h3>
                          <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: '#666' }}>
                            {formatDate(week.startDate)} • {t('days')} {week.startDay}-{week.endDay}
                          </p>
                        </div>
                        <div style={{ 
                          padding: '6px 12px', 
                          background: 'rgba(255,255,255,0.7)', 
                          borderRadius: '4px',
                          fontSize: '0.85em',
                          fontWeight: 'bold'
                        }}>
                          {week.stage}
                        </div>
                      </div>
                      
                      {week.alerts.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          {week.alerts.map((alert, idx) => (
                            <div 
                              key={idx}
                              style={{
                                padding: '10px',
                                background: getAlertColor(alert.type),
                                borderRadius: '4px',
                                marginTop: idx > 0 ? '8px' : 0,
                                border: `1px solid ${alert.type === 'error' ? '#ef5350' : alert.type === 'warning' ? '#ff9800' : '#e0e0e0'}`,
                              }}
                            >
                              <p style={{ margin: 0, fontSize: '0.9em' }}>
                                {getAlertIcon(alert.type)} {alert.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* General Care Checklist */}
              <div className="card">
                <h2>{t('generalCareChecklist')}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                  <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1em' }}>📋 {t('nutrition')}</h3>
                    <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                      <li>{t('nutritionItem1')}</li>
                      <li>{t('nutritionItem2')}</li>
                      <li>{t('nutritionItem3')}</li>
                    </ul>
                  </div>
                  
                  <div style={{ padding: '15px', background: '#fff3e0', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1em' }}>🏥 {t('healthMonitoring')}</h3>
                    <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                      <li>{t('healthItem1')}</li>
                      <li>{t('healthItem2')}</li>
                      <li>{t('healthItem3')}</li>
                    </ul>
                  </div>
                  
                  <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1em' }}>🏠 {t('environment')}</h3>
                    <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                      <li>{t('environmentItem1')}</li>
                      <li>{t('environmentItem2')}</li>
                      <li>{t('environmentItem3')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
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

export default Module5Gestation;
