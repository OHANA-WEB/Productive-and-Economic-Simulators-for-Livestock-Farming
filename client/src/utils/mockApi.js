// Mock API service for demo mode
// Uses localStorage to persist data across sessions

import { getInitialMockData, calculateMockResults } from './mockData.js';

const STORAGE_KEY = 'mvp_web_mock_data';
const MOCK_USER_KEY = 'mvp_web_mock_user';

// Helper functions for localStorage
function getMockData() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getInitialMockData();
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with default data
  const initialData = getInitialMockData();
  saveMockData(initialData);
  return initialData;
}

function saveMockData(data) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

function getCurrentUserId() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 1; // Default user ID for build time
  }
  const user = window.localStorage.getItem(MOCK_USER_KEY);
  return user ? JSON.parse(user).id : null;
}

// Simulate network delay
function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock API implementation
const mockApi = {
  // Auth endpoints
  async post(endpoint, data) {
    await delay();

    if (endpoint === '/auth/login' || endpoint === '/auth/register') {
      const mockData = getMockData();
      const { email, password, name } = data;

      if (endpoint === '/auth/register') {
        // Register new user
        const newUser = {
          id: mockData.users.length + 1,
          email,
          name: name || email,
        };
        mockData.users.push(newUser);
        saveMockData(mockData);
        
        const token = `mock_token_${newUser.id}_${Date.now()}`;
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(MOCK_USER_KEY, JSON.stringify(newUser));
        }
        return { data: { user: newUser, token } };
      } else {
        // Login - in demo mode, accept any credentials or use demo user
        let user = mockData.users.find(u => u.email === email);
        
        // If user not found or password doesn't match, use demo user in demo mode
        if (!user || (user.password && user.password !== password)) {
          // In demo mode, allow any login with demo user
          user = mockData.users[0]; // Use first demo user
        }
        
        const token = `mock_token_${user.id}_${Date.now()}`;
        const userData = { id: user.id, email: user.email, name: user.name };
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(MOCK_USER_KEY, JSON.stringify(userData));
        }
        return { data: { user: userData, token } };
      }
    }

    // POST /scenarios (create new scenario)
    if (endpoint === '/scenarios' && data && data.name) {
      const mockData = getMockData();
      const userId = getCurrentUserId();
      const maxId = mockData.scenarios.length > 0 
        ? Math.max(...mockData.scenarios.map(s => s.id))
        : 0;
      const newScenario = {
        id: maxId + 1,
        user_id: userId,
        name: data.name,
        type: data.type,
        description: data.description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockData.scenarios.push(newScenario);
      saveMockData(mockData);
      return { data: newScenario };
    }

    if (endpoint.startsWith('/scenarios/') && endpoint.includes('/duplicate')) {
      const scenarioId = parseInt(endpoint.split('/')[2]);
      const mockData = getMockData();
      const scenario = mockData.scenarios.find(s => s.id === scenarioId);
      
      if (!scenario) {
        throw { response: { data: { error: 'Scenario not found' }, status: 404 } };
      }

      const maxId = mockData.scenarios.length > 0
        ? Math.max(...mockData.scenarios.map(s => s.id))
        : 0;
      const newScenario = {
        ...scenario,
        id: maxId + 1,
        name: `${scenario.name} (Copy)`,
        created_at: new Date().toISOString(),
      };
      
      mockData.scenarios.push(newScenario);
      
      // Duplicate related data
      const production = mockData.productionData.find(p => p.scenario_id === scenarioId);
      if (production) {
        const maxProdId = mockData.productionData.length > 0
          ? Math.max(...mockData.productionData.map(p => p.id))
          : 0;
        mockData.productionData.push({
          ...production,
          id: maxProdId + 1,
          scenario_id: newScenario.id,
        });
      }
      
      saveMockData(mockData);
      return { data: newScenario };
    }

    if (endpoint.startsWith('/scenarios/') && !endpoint.includes('/compare')) {
      const parts = endpoint.split('/');
      const scenarioId = parseInt(parts[2]);
      const mockData = getMockData();
      
      if (parts.length === 3) {
        // GET /scenarios/:id
        const scenario = mockData.scenarios.find(s => s.id === scenarioId);
        if (!scenario) {
          throw { response: { data: { error: 'Scenario not found' }, status: 404 } };
        }

        const productionData = mockData.productionData.find(p => p.scenario_id === scenarioId) || null;
        const transformationData = mockData.transformationData.find(t => t.scenario_id === scenarioId) || null;
        const lactationData = mockData.lactationData.find(l => l.scenario_id === scenarioId) || null;
        const yieldData = mockData.yieldData.find(y => y.scenario_id === scenarioId) || null;
        const results = mockData.results.find(r => r.scenario_id === scenarioId) || null;

        return {
          data: {
            ...scenario,
            productionData,
            transformationData,
            lactationData,
            yieldData,
            results,
          },
        };
      }
    }

    if (endpoint === '/scenarios/compare') {
      const { scenarioIds } = data;
      const mockData = getMockData();
      
      const comparisons = scenarioIds.map(id => {
        const scenario = mockData.scenarios.find(s => s.id === id);
        if (!scenario) return null;

        const productionData = mockData.productionData.find(p => p.scenario_id === id);
        const transformationData = mockData.transformationData.find(t => t.scenario_id === id);
        const lactationData = mockData.lactationData.find(l => l.scenario_id === id);
        const yieldData = mockData.yieldData.find(y => y.scenario_id === id);

        const results = calculateMockResults(id, mockData) || mockData.results.find(r => r.scenario_id === id);

        return {
          scenario,
          results: {
            totalProductionLiters: results?.total_production_liters || 0,
            totalRevenue: results?.total_revenue || 0,
            totalCosts: results?.total_costs || 0,
            grossMargin: results?.gross_margin || 0,
            marginPercentage: results?.margin_percentage || 0,
          },
        };
      }).filter(Boolean);

      return { data: comparisons };
    }

    // Module endpoints
    if (endpoint.startsWith('/modules/production/')) {
      const scenarioId = parseInt(endpoint.split('/').pop());
      const mockData = getMockData();
      
      const existing = mockData.productionData.findIndex(p => p.scenario_id === scenarioId);
      const maxProdId = mockData.productionData.length > 0
        ? Math.max(...mockData.productionData.map(p => p.id))
        : 0;
      const productionData = {
        id: existing >= 0 ? mockData.productionData[existing].id : maxProdId + 1,
        scenario_id: scenarioId,
        ...data,
        created_at: existing >= 0 ? mockData.productionData[existing].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing >= 0) {
        mockData.productionData[existing] = productionData;
      } else {
        mockData.productionData.push(productionData);
      }

      // Recalculate results
      const results = calculateMockResults(scenarioId, mockData);
      if (results) {
        const resultIndex = mockData.results.findIndex(r => r.scenario_id === scenarioId);
        const maxResultId = mockData.results.length > 0
          ? Math.max(...mockData.results.map(r => r.id))
          : 0;
        const resultData = {
          id: resultIndex >= 0 ? mockData.results[resultIndex].id : maxResultId + 1,
          scenario_id: scenarioId,
          ...results,
          calculated_at: new Date().toISOString(),
        };
        if (resultIndex >= 0) {
          mockData.results[resultIndex] = resultData;
        } else {
          mockData.results.push(resultData);
        }
      }

      saveMockData(mockData);
      return { data: productionData };
    }

    if (endpoint.startsWith('/modules/transformation/')) {
      const scenarioId = parseInt(endpoint.split('/').pop());
      const mockData = getMockData();
      
      const existing = mockData.transformationData.findIndex(t => t.scenario_id === scenarioId);
      const maxTransId = mockData.transformationData.length > 0
        ? Math.max(...mockData.transformationData.map(t => t.id))
        : 0;
      const transformationData = {
        id: existing >= 0 ? mockData.transformationData[existing].id : maxTransId + 1,
        scenario_id: scenarioId,
        ...data,
        created_at: existing >= 0 ? mockData.transformationData[existing].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing >= 0) {
        mockData.transformationData[existing] = transformationData;
      } else {
        mockData.transformationData.push(transformationData);
      }

      // Recalculate results
      const results = calculateMockResults(scenarioId, mockData);
      if (results) {
        const resultIndex = mockData.results.findIndex(r => r.scenario_id === scenarioId);
        if (resultIndex >= 0) {
          mockData.results[resultIndex] = {
            ...mockData.results[resultIndex],
            ...results,
            calculated_at: new Date().toISOString(),
          };
        }
      }

      saveMockData(mockData);
      return { data: transformationData };
    }

    if (endpoint.startsWith('/modules/lactation/')) {
      const scenarioId = parseInt(endpoint.split('/').pop());
      const mockData = getMockData();
      
      const existing = mockData.lactationData.findIndex(l => l.scenario_id === scenarioId);
      const maxLactId = mockData.lactationData.length > 0
        ? Math.max(...mockData.lactationData.map(l => l.id))
        : 0;
      const lactationData = {
        id: existing >= 0 ? mockData.lactationData[existing].id : maxLactId + 1,
        scenario_id: scenarioId,
        ...data,
        created_at: existing >= 0 ? mockData.lactationData[existing].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing >= 0) {
        mockData.lactationData[existing] = lactationData;
      } else {
        mockData.lactationData.push(lactationData);
      }

      saveMockData(mockData);
      return { data: lactationData };
    }

    if (endpoint.startsWith('/modules/yield/')) {
      const scenarioId = parseInt(endpoint.split('/').pop());
      const mockData = getMockData();
      
      const existing = mockData.yieldData.findIndex(y => y.scenario_id === scenarioId);
      const maxYieldId = mockData.yieldData.length > 0
        ? Math.max(...mockData.yieldData.map(y => y.id))
        : 0;
      const yieldData = {
        id: existing >= 0 ? mockData.yieldData[existing].id : maxYieldId + 1,
        scenario_id: scenarioId,
        ...data,
        created_at: existing >= 0 ? mockData.yieldData[existing].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing >= 0) {
        mockData.yieldData[existing] = yieldData;
      } else {
        mockData.yieldData.push(yieldData);
      }

      saveMockData(mockData);
      return { data: yieldData };
    }

    throw { response: { data: { error: 'Endpoint not found' }, status: 404 } };
  },

  async get(endpoint) {
    await delay();

    if (endpoint === '/scenarios' || endpoint.startsWith('/scenarios?')) {
      const mockData = getMockData();
      const userId = getCurrentUserId();
      let userScenarios = mockData.scenarios.filter(s => s.user_id === userId);
      
      // Handle query parameters
      if (endpoint.includes('?')) {
        const params = new URLSearchParams(endpoint.split('?')[1]);
        const type = params.get('type');
        if (type) {
          userScenarios = userScenarios.filter(s => s.type === type);
        }
      }
      
      return { data: userScenarios };
    }

    if (endpoint.startsWith('/scenarios/')) {
      const scenarioId = parseInt(endpoint.split('/')[2]);
      const mockData = getMockData();
      const scenario = mockData.scenarios.find(s => s.id === scenarioId);
      
      if (!scenario) {
        throw { response: { data: { error: 'Scenario not found' }, status: 404 } };
      }

      const productionData = mockData.productionData.find(p => p.scenario_id === scenarioId) || null;
      const transformationData = mockData.transformationData.find(t => t.scenario_id === scenarioId) || null;
      const lactationData = mockData.lactationData.find(l => l.scenario_id === scenarioId) || null;
      const yieldData = mockData.yieldData.find(y => y.scenario_id === scenarioId) || null;
      const results = mockData.results.find(r => r.scenario_id === scenarioId) || null;

      return {
        data: {
          ...scenario,
          productionData,
          transformationData,
          lactationData,
          yieldData,
          results,
        },
      };
    }

    throw { response: { data: { error: 'Endpoint not found' }, status: 404 } };
  },

  async delete(endpoint) {
    await delay();

    if (endpoint.startsWith('/scenarios/')) {
      const scenarioId = parseInt(endpoint.split('/')[2]);
      const mockData = getMockData();
      
      mockData.scenarios = mockData.scenarios.filter(s => s.id !== scenarioId);
      mockData.productionData = mockData.productionData.filter(p => p.scenario_id !== scenarioId);
      mockData.transformationData = mockData.transformationData.filter(t => t.scenario_id !== scenarioId);
      mockData.lactationData = mockData.lactationData.filter(l => l.scenario_id !== scenarioId);
      mockData.yieldData = mockData.yieldData.filter(y => y.scenario_id !== scenarioId);
      mockData.results = mockData.results.filter(r => r.scenario_id !== scenarioId);
      
      saveMockData(mockData);
      return { data: { message: 'Scenario deleted successfully' } };
    }

    throw { response: { data: { error: 'Endpoint not found' }, status: 404 } };
  },
};

export default mockApi;
