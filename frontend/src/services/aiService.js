import api from './api';

export const uploadResume = async (jd, resumeFile) => {
  const formData = new FormData();
  formData.append('jd', jd);
  formData.append('resume', resumeFile);
  const response = await api.post('/api/ai/upload-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const fetchShortlisted = async () => {
  const response = await api.get('/api/ai/shortlisted');
  return response.data;
};
