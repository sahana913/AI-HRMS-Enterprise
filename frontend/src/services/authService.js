import api from './api';

export const loginUser = async (email, password) => {
  const form = new FormData();
  form.append('username', email);
  form.append('password', password);
  const response = await api.post('/api/auth/login', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const generateOTP = async (email) => {
  const response = await api.post('/api/auth/generate-otp', { email });
  return response.data;
};

export const verifyOTP = async (email, otp) => {
  const response = await api.post('/api/auth/verify-otp', { email, otp });
  return response.data;
};

export const registerUser = async (payload) => {
  const response = await api.post('/api/auth/register', payload);
  return response.data;
};

export const fetchProfile = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};
