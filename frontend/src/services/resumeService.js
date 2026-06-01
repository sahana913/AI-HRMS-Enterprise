import api from './api';

export const fetchResumes = async () => {
  const response = await api.get('/api/resumes');
  return response.data;
};

export const createResume = async (payload = {}) => {
  const response = await api.post('/api/resumes', payload);
  return response.data;
};

export const updateResume = async (id, payload) => {
  const response = await api.put(`/api/resumes/${id}`, payload);
  return response.data;
};

export const deleteResume = async (id) => {
  const response = await api.delete(`/api/resumes/${id}`);
  return response.data;
};

export const duplicateResume = async (id) => {
  const response = await api.post(`/api/resumes/${id}/duplicate`);
  return response.data;
};

export const optimizeResumeContent = async (payload) => {
  const response = await api.post('/api/resumes/ai/optimize', payload);
  return response.data;
};

export const parseResumeFile = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  const response = await api.post('/api/resumes/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
