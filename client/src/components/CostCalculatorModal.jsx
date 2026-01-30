import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

/**
 * Module 4: Cost Mini-Calculator Modal
 * Integrated into Module 1 for estimating costs when user doesn't know exact values
 * 
 * Features:
 * - 5 sub-calculators: Feed, Labor, Health, Services, Rearing
 * - "Apply to Module 1" button auto-fills the calculated cost
 * - Simple, producer-oriented UI
 */
function CostCalculatorModal({ isOpen, onClose, calculatorType, onApply, currentAnimals = 1, currentDailyProduction = 1 }) {
  const { t } = useI18n();
  
  // Feed Calculator State
  const [feedData, setFeedData] = useState({
    concentrate_kg_per_day: '',
    concentrate_price_per_kg: '',
    forage_kg_per_day: '',
    forage_price_per_kg: '',
    supplement_kg_per_day: '',
    supplement_price_per_kg: '',
    mineral_monthly_cost: '',
  });
  
  // Labor Calculator State
  const [laborData, setLaborData] = useState({
    hours_per_day_per_worker: '',
    workers_count: '',
    wage_per_hour: '',
    monthly_wage_per_worker: '',
    use_monthly: false,
  });
  
  // Health Calculator State
  const [healthData, setHealthData] = useState({
    annual_health_cost_per_animal: '',
    vaccine_cost_annual: '',
    deworming_cost_annual: '',
    vet_visits_annual: '',
  });
  
  // Services Calculator State
  const [servicesData, setServicesData] = useState({
    electricity_monthly: '',
    water_monthly: '',
    maintenance_monthly: '',
    transport_monthly: '',
  });
  
  // Rearing Calculator State
  const [rearingData, setRearingData] = useState({
    rearing_cost_per_animal: '',
    productive_years: '5',
    replacement_rate_percent: '20',
  });
  
  const [calculatedCost, setCalculatedCost] = useState(0);
  
  useEffect(() => {
    if (isOpen) {
      calculateCost();
    }
  }, [isOpen, feedData, laborData, healthData, servicesData, rearingData, currentAnimals, currentDailyProduction]);
  
  const calculateCost = () => {
    const animals = parseFloat(currentAnimals) || 1;
    const dailyProd = parseFloat(currentDailyProduction) || 1;
    const totalDailyProduction = dailyProd * animals;
    
    let costPerLiter = 0;
    
    switch (calculatorType) {
      case 'feed':
        const concentrateKg = parseFloat(feedData.concentrate_kg_per_day) || 0;
        const concentratePrice = parseFloat(feedData.concentrate_price_per_kg) || 0;
        const forageKg = parseFloat(feedData.forage_kg_per_day) || 0;
        const foragePrice = parseFloat(feedData.forage_price_per_kg) || 0;
        const supplementKg = parseFloat(feedData.supplement_kg_per_day) || 0;
        const supplementPrice = parseFloat(feedData.supplement_price_per_kg) || 0;
        const mineralMonthly = parseFloat(feedData.mineral_monthly_cost) || 0;
        
        const dailyFeedCost = (concentrateKg * concentratePrice) + (forageKg * foragePrice) + (supplementKg * supplementPrice);
        const dailyMineralCost = mineralMonthly / 30;
        const totalDailyFeedCost = (dailyFeedCost * animals) + dailyMineralCost;
        
        costPerLiter = totalDailyProduction > 0 ? totalDailyFeedCost / totalDailyProduction : 0;
        break;
        
      case 'labor':
        const useMonthly = laborData.use_monthly;
        const workers = parseFloat(laborData.workers_count) || 0;
        let dailyLaborCost = 0;
        
        if (useMonthly) {
          const monthlyWage = parseFloat(laborData.monthly_wage_per_worker) || 0;
          dailyLaborCost = (monthlyWage * workers) / 30;
        } else {
          const hoursPerDay = parseFloat(laborData.hours_per_day_per_worker) || 0;
          const wagePerHour = parseFloat(laborData.wage_per_hour) || 0;
          dailyLaborCost = hoursPerDay * wagePerHour * workers;
        }
        
        costPerLiter = totalDailyProduction > 0 ? dailyLaborCost / totalDailyProduction : 0;
        break;
        
      case 'health':
        const annualHealthPerAnimal = parseFloat(healthData.annual_health_cost_per_animal) || 0;
        const vaccineCost = parseFloat(healthData.vaccine_cost_annual) || 0;
        const dewormingCost = parseFloat(healthData.deworming_cost_annual) || 0;
        const vetVisits = parseFloat(healthData.vet_visits_annual) || 0;
        
        const totalAnnualHealth = (annualHealthPerAnimal > 0 ? annualHealthPerAnimal : (vaccineCost + dewormingCost + vetVisits)) * animals;
        const dailyHealthCost = totalAnnualHealth / 365;
        
        costPerLiter = totalDailyProduction > 0 ? dailyHealthCost / totalDailyProduction : 0;
        break;
        
      case 'services':
        const electricity = parseFloat(servicesData.electricity_monthly) || 0;
        const water = parseFloat(servicesData.water_monthly) || 0;
        const maintenance = parseFloat(servicesData.maintenance_monthly) || 0;
        const transport = parseFloat(servicesData.transport_monthly) || 0;
        
        const totalMonthlyServices = electricity + water + maintenance + transport;
        const dailyServicesCost = totalMonthlyServices / 30;
        
        costPerLiter = totalDailyProduction > 0 ? dailyServicesCost / totalDailyProduction : 0;
        break;
        
      case 'rearing':
        const rearingCostPerAnimal = parseFloat(rearingData.rearing_cost_per_animal) || 0;
        const productiveYears = parseFloat(rearingData.productive_years) || 5;
        const replacementRate = parseFloat(rearingData.replacement_rate_percent) || 20;
        
        const annualReplacementAnimals = animals * (replacementRate / 100);
        const annualRearingCost = annualReplacementAnimals * rearingCostPerAnimal;
        const dailyRearingCost = annualRearingCost / 365;
        
        costPerLiter = totalDailyProduction > 0 ? dailyRearingCost / totalDailyProduction : 0;
        break;
        
      default:
        costPerLiter = 0;
    }
    
    setCalculatedCost(costPerLiter);
  };
  
  const handleApply = () => {
    onApply(calculatedCost);
    onClose();
  };
  
  const handleInputChange = (e, dataType) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    switch (dataType) {
      case 'feed':
        setFeedData(prev => ({ ...prev, [name]: newValue }));
        break;
      case 'labor':
        setLaborData(prev => ({ ...prev, [name]: newValue }));
        break;
      case 'health':
        setHealthData(prev => ({ ...prev, [name]: newValue }));
        break;
      case 'services':
        setServicesData(prev => ({ ...prev, [name]: newValue }));
        break;
      case 'rearing':
        setRearingData(prev => ({ ...prev, [name]: newValue }));
        break;
      default:
        break;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>📊 {t('costEstimator')} - {t(`calc${calculatorType.charAt(0).toUpperCase() + calculatorType.slice(1)}`)}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '20px', fontSize: '0.95em' }}>
            {t('costEstimatorDescription')}
          </p>
          
          {/* Feed Calculator */}
          {calculatorType === 'feed' && (
            <div>
              <h3>{t('feedCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('feedCalcDescription')}
              </p>
              
              <div className="form-group">
                <label>{t('concentrateKgPerDay')} (kg/animal/day)</label>
                <input
                  type="number"
                  name="concentrate_kg_per_day"
                  value={feedData.concentrate_kg_per_day}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.1"
                  placeholder="Ej: 0.5"
                />
              </div>
              
              <div className="form-group">
                <label>{t('concentratePricePerKg')} ($/kg)</label>
                <input
                  type="number"
                  name="concentrate_price_per_kg"
                  value={feedData.concentrate_price_per_kg}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.01"
                  placeholder="Ej: 0.45"
                />
              </div>
              
              <div className="form-group">
                <label>{t('forageKgPerDay')} (kg/animal/day)</label>
                <input
                  type="number"
                  name="forage_kg_per_day"
                  value={feedData.forage_kg_per_day}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.1"
                  placeholder="Ej: 3.0"
                />
              </div>
              
              <div className="form-group">
                <label>{t('foragePricePerKg')} ($/kg)</label>
                <input
                  type="number"
                  name="forage_price_per_kg"
                  value={feedData.forage_price_per_kg}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.01"
                  placeholder="Ej: 0.15"
                />
              </div>
              
              <div className="form-group">
                <label>{t('supplementKgPerDay')} (kg/animal/day)</label>
                <input
                  type="number"
                  name="supplement_kg_per_day"
                  value={feedData.supplement_kg_per_day}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.1"
                  placeholder="Ej: 0.2"
                />
              </div>
              
              <div className="form-group">
                <label>{t('supplementPricePerKg')} ($/kg)</label>
                <input
                  type="number"
                  name="supplement_price_per_kg"
                  value={feedData.supplement_price_per_kg}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.01"
                  placeholder="Ej: 0.60"
                />
              </div>
              
              <div className="form-group">
                <label>{t('mineralMonthlyCost')} ($/month total herd)</label>
                <input
                  type="number"
                  name="mineral_monthly_cost"
                  value={feedData.mineral_monthly_cost}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.01"
                  placeholder="Ej: 30"
                />
              </div>
            </div>
          )}
          
          {/* Labor Calculator */}
          {calculatorType === 'labor' && (
            <div>
              <h3>{t('laborCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('laborCalcDescription')}
              </p>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="use_monthly"
                    checked={laborData.use_monthly}
                    onChange={(e) => handleInputChange(e, 'labor')}
                    style={{ marginRight: '8px' }}
                  />
                  {t('useMonthlyWage')}
                </label>
              </div>
              
              <div className="form-group">
                <label>{t('workersCount')}</label>
                <input
                  type="number"
                  name="workers_count"
                  value={laborData.workers_count}
                  onChange={(e) => handleInputChange(e, 'labor')}
                  step="1"
                  min="0"
                  placeholder="Ej: 2"
                />
              </div>
              
              {laborData.use_monthly ? (
                <div className="form-group">
                  <label>{t('monthlyWagePerWorker')} ($/month)</label>
                  <input
                    type="number"
                    name="monthly_wage_per_worker"
                    value={laborData.monthly_wage_per_worker}
                    onChange={(e) => handleInputChange(e, 'labor')}
                    step="0.01"
                    placeholder="Ej: 400"
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>{t('hoursPerDayPerWorker')}</label>
                    <input
                      type="number"
                      name="hours_per_day_per_worker"
                      value={laborData.hours_per_day_per_worker}
                      onChange={(e) => handleInputChange(e, 'labor')}
                      step="0.5"
                      placeholder="Ej: 8"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>{t('wagePerHour')} ($/hour)</label>
                    <input
                      type="number"
                      name="wage_per_hour"
                      value={laborData.wage_per_hour}
                      onChange={(e) => handleInputChange(e, 'labor')}
                      step="0.01"
                      placeholder="Ej: 2.50"
                    />
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Health Calculator */}
          {calculatorType === 'health' && (
            <div>
              <h3>{t('healthCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('healthCalcDescription')}
              </p>
              
              <div className="form-group">
                <label>{t('annualHealthCostPerAnimal')} ($/animal/year)</label>
                <input
                  type="number"
                  name="annual_health_cost_per_animal"
                  value={healthData.annual_health_cost_per_animal}
                  onChange={(e) => handleInputChange(e, 'health')}
                  step="0.01"
                  placeholder="Ej: 25"
                />
                <small style={{ display: 'block', marginTop: '5px', color: 'var(--text-tertiary)' }}>
                  {t('healthCostHint')}
                </small>
              </div>
              
              <p style={{ fontSize: '0.9em', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px' }}>
                {t('orBreakdownByConcept')}:
              </p>
              
              <div className="form-group">
                <label>{t('vaccineCostAnnual')} ($/animal/year)</label>
                <input
                  type="number"
                  name="vaccine_cost_annual"
                  value={healthData.vaccine_cost_annual}
                  onChange={(e) => handleInputChange(e, 'health')}
                  step="0.01"
                  placeholder="Ej: 10"
                />
              </div>
              
              <div className="form-group">
                <label>{t('dewormingCostAnnual')} ($/animal/year)</label>
                <input
                  type="number"
                  name="deworming_cost_annual"
                  value={healthData.deworming_cost_annual}
                  onChange={(e) => handleInputChange(e, 'health')}
                  step="0.01"
                  placeholder="Ej: 5"
                />
              </div>
              
              <div className="form-group">
                <label>{t('vetVisitsAnnual')} ($/animal/year)</label>
                <input
                  type="number"
                  name="vet_visits_annual"
                  value={healthData.vet_visits_annual}
                  onChange={(e) => handleInputChange(e, 'health')}
                  step="0.01"
                  placeholder="Ej: 10"
                />
              </div>
            </div>
          )}
          
          {/* Services Calculator */}
          {calculatorType === 'services' && (
            <div>
              <h3>{t('servicesCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('servicesCalcDescription')}
              </p>
              
              <div className="form-group">
                <label>{t('electricityMonthly')} ($/month)</label>
                <input
                  type="number"
                  name="electricity_monthly"
                  value={servicesData.electricity_monthly}
                  onChange={(e) => handleInputChange(e, 'services')}
                  step="0.01"
                  placeholder="Ej: 50"
                />
              </div>
              
              <div className="form-group">
                <label>{t('waterMonthly')} ($/month)</label>
                <input
                  type="number"
                  name="water_monthly"
                  value={servicesData.water_monthly}
                  onChange={(e) => handleInputChange(e, 'services')}
                  step="0.01"
                  placeholder="Ej: 20"
                />
              </div>
              
              <div className="form-group">
                <label>{t('maintenanceMonthly')} ($/month)</label>
                <input
                  type="number"
                  name="maintenance_monthly"
                  value={servicesData.maintenance_monthly}
                  onChange={(e) => handleInputChange(e, 'services')}
                  step="0.01"
                  placeholder="Ej: 30"
                />
              </div>
              
              <div className="form-group">
                <label>{t('transportMonthly')} ($/month)</label>
                <input
                  type="number"
                  name="transport_monthly"
                  value={servicesData.transport_monthly}
                  onChange={(e) => handleInputChange(e, 'services')}
                  step="0.01"
                  placeholder="Ej: 40"
                />
              </div>
            </div>
          )}
          
          {/* Rearing Calculator */}
          {calculatorType === 'rearing' && (
            <div>
              <h3>{t('rearingCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('rearingCalcDescription')}
              </p>
              
              <div className="form-group">
                <label>{t('rearingCostPerAnimal')} ($ total per animal to productive age)</label>
                <input
                  type="number"
                  name="rearing_cost_per_animal"
                  value={rearingData.rearing_cost_per_animal}
                  onChange={(e) => handleInputChange(e, 'rearing')}
                  step="0.01"
                  placeholder="Ej: 300"
                />
                <small style={{ display: 'block', marginTop: '5px', color: 'var(--text-tertiary)' }}>
                  {t('rearingCostHint')}
                </small>
              </div>
              
              <div className="form-group">
                <label>{t('productiveYears')}</label>
                <input
                  type="number"
                  name="productive_years"
                  value={rearingData.productive_years}
                  onChange={(e) => handleInputChange(e, 'rearing')}
                  step="0.5"
                  placeholder="Ej: 5"
                />
              </div>
              
              <div className="form-group">
                <label>{t('replacementRatePercent')} (%/year)</label>
                <input
                  type="number"
                  name="replacement_rate_percent"
                  value={rearingData.replacement_rate_percent}
                  onChange={(e) => handleInputChange(e, 'rearing')}
                  step="1"
                  placeholder="Ej: 20"
                />
                <small style={{ display: 'block', marginTop: '5px', color: 'var(--text-tertiary)' }}>
                  {t('replacementRateHint')}
                </small>
              </div>
            </div>
          )}
          
          {/* Calculated Result */}
          <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', border: '1px solid var(--accent-info)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>{t('estimatedCost')}</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '2em', fontWeight: 'bold', color: 'var(--accent-info)' }}>
                ${calculatedCost.toFixed(4)}
              </span>
              <span style={{ color: 'var(--text-tertiary)' }}>{t('perLiter')}</span>
            </div>
            <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', margin: 0 }}>
              {t('basedOnCurrentHerdSize')}: {currentAnimals} {t('animals')} × {currentDailyProduction} L/day = {(currentAnimals * currentDailyProduction).toFixed(1)} L/day {t('total')}
            </p>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            ✅ {t('applyToModule1')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CostCalculatorModal;
