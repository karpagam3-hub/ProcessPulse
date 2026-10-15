import axios from 'axios';

const API_BASE = 'https://processpulse-1.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Phase 1 & 2 Endpoints
export const getHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const getSOP = async () => {
  const response = await apiClient.get('/sop');
  return response.data;
};

export const getExecutions = async (params = {}) => {
  const response = await apiClient.get('/executions', { params });
  return response.data;
};

export const getExecutionDetail = async (executionId) => {
  const response = await apiClient.get(`/executions/${executionId}`);
  return response.data;
};

export const getSummaryMetrics = async () => {
  const response = await apiClient.get('/metrics/summary');
  return response.data;
};

export const getDeviations = async () => {
  const response = await apiClient.get('/deviations');
  return response.data;
};

export const getMachineAnalysis = async () => {
  const response = await apiClient.get('/analysis/machines');
  return response.data;
};

export const getShiftAnalysis = async () => {
  const response = await apiClient.get('/analysis/shifts');
  return response.data;
};

// Phase 3 Endpoints: Patterns, Impact, Investigation, Validation, Memory
export const getPatternAnalysis = async () => {
  const response = await apiClient.get('/analysis/patterns');
  return response.data;
};

export const getImpactAnalysis = async () => {
  const response = await apiClient.get('/analysis/impact');
  return response.data;
};

export const requestInvestigation = async (executionId) => {
  const response = await apiClient.post('/investigation', { execution_id: executionId });
  return response.data;
};

export const getPendingValidations = async () => {
  const response = await apiClient.get('/validation/pending');
  return response.data;
};

export const submitValidation = async (payload) => {
  const response = await apiClient.post('/validation', payload);
  return response.data;
};

export const getValidationHistory = async () => {
  const response = await apiClient.get('/validation/history');
  return response.data;
};

export const getProcessMemory = async () => {
  const response = await apiClient.get('/memory');
  return response.data;
};

export const getMemoryMatch = async (executionId) => {
  const response = await apiClient.get(`/memory/matches/${executionId}`);
  return response.data;
};
