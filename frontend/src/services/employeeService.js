import api from './api';

export const fetchEmployees = async () => {
  const response = await api.get('/api/employees/');
  return response.data;
};

export const addEmployee = async (payload) => {
  const response = await api.post('/api/employees/add', payload);
  return response.data;
};

export const updateEmployee = async (id, payload) => {
  const response = await api.put(`/api/employees/update/${id}`, payload);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/api/employees/delete/${id}`);
  return response.data;
};
