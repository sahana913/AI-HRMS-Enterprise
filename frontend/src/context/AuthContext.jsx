import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { AUTH_STORAGE_KEYS, buildStoredUser, clearAuthSession, getTokenExpiryMs, persistAuthSession } from '../utils/auth';

const AuthContext = createContext(null);

const getAuthErrorMessage = (error, fallback) => {
  if (error?.message && !error?.response) {
    return error.message;
  }
  if (!error?.response) {
    return 'Backend is not running. Start the backend server and try again.';
  }
  return error.response.data?.detail || fallback;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEYS.user);
      return savedUser ? buildStoredUser(JSON.parse(savedUser)) : null;
    } catch {
      clearAuthSession();
      return null;
    }
  });

  const [token, setToken] = useState(localStorage.getItem(AUTH_STORAGE_KEYS.token));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  const clearSession = useCallback((notify = true, options = {}) => {
    clearAuthSession(options);
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
    if (notify) toast.info('Session terminated');
  }, []);

  useEffect(() => {
    const hydrateSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/api/auth/me', { skipUnauthorizedEvent: true });
        const storedUser = persistAuthSession({ token, user: response.data });
        setUser(storedUser);
      } catch {
        clearSession(false, { invalid: true });
      } finally {
        setLoading(false);
      }
    };

    hydrateSession();
  }, [clearSession, token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession(false, { invalid: true });
      toast.error('Your session expired. Please sign in again.');
    };

    window.addEventListener('hrms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('hrms:unauthorized', handleUnauthorized);
  }, [clearSession]);

  useEffect(() => {
    if (!token) return undefined;

    const expiryMs = getTokenExpiryMs(token);
    if (!expiryMs) return undefined;

    const remaining = expiryMs - Date.now();
    if (remaining <= 0) {
      clearSession(false, { invalid: true });
      toast.error('Your session expired. Please sign in again.');
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      clearSession(false, { invalid: true });
      toast.error('Your session expired. Please sign in again.');
    }, remaining);

    return () => window.clearTimeout(timeout);
  }, [clearSession, token]);

  const signUp = useCallback(async (payload) => {
    try {
      const res = await api.post('/api/auth/register', { role: payload.role || 'hr', ...payload }, {
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(res.data?.message || 'Registration successful! Please login.');
      return res.data;
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Registration failed'));
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      clearAuthSession();

      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const res = await api.post('/api/auth/login', formData);
      const accessToken = res.data?.access_token || res.data?.token;
      const userData = res.data?.user || res.data?.data?.user;

      if (!accessToken || !userData) {
        throw new Error('Login response did not include a valid session token.');
      }

      const storedUser = persistAuthSession({ token: accessToken, user: userData });
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      setToken(accessToken);
      setUser(storedUser);

      toast.success(`Welcome back, ${storedUser.username}`);
      return res.data;
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Invalid credentials'));
      throw error;
    }
  }, []);

  const signOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const isAuthenticated = Boolean(token && user);

  const value = useMemo(
    () => ({ user, token, loading, isAuthenticated, signIn, signUp, signOut }),
    [user, token, loading, isAuthenticated, signIn, signUp, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-bold text-blue-700">
          <span className="h-3 w-3 animate-ping rounded-full bg-blue-500" />
          <span className="ml-3">Restoring secure session...</span>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
