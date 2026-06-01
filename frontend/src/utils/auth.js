import { normalizeRole } from '../config/roles';

export { ROLE_GROUPS, ROLE_META, ROLES, getRoleHome, getRoleSlug, hasPermission, normalizeRole, slugToRole } from '../config/roles';

export const AUTH_STORAGE_KEYS = {
  token: 'hrms_token',
  user: 'hrms_user',
  role: 'hrms_role',
  username: 'hrms_username',
  userId: 'hrms_user_id',
  legacyUserId: 'hrms_userId',
  invalidSession: 'hrms_auth_invalid',
};

export const getUserId = (user) => user?.userId || user?.id || user?._id || '';

export const buildStoredUser = (user = {}) => {
  const role = normalizeRole(user.role);
  const username = user.username || user.name || user.email || 'User';
  const userId = getUserId(user);
  const profileImage = user.profileImage || user.profile_image || user.avatar || '';
  return { ...user, role, username, userId, profileImage };
};

export const persistAuthSession = ({ token, user }) => {
  const storedUser = buildStoredUser(user);
  localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(storedUser));
  localStorage.setItem(AUTH_STORAGE_KEYS.role, storedUser.role);
  localStorage.setItem(AUTH_STORAGE_KEYS.username, storedUser.username);
  localStorage.setItem(AUTH_STORAGE_KEYS.userId, storedUser.userId);
  localStorage.setItem(AUTH_STORAGE_KEYS.legacyUserId, storedUser.userId);
  localStorage.setItem('hrms_profile_image', storedUser.profileImage || '');
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.invalidSession);
  return storedUser;
};

export const clearAuthSession = ({ invalid = false } = {}) => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  localStorage.removeItem(AUTH_STORAGE_KEYS.role);
  localStorage.removeItem(AUTH_STORAGE_KEYS.username);
  localStorage.removeItem(AUTH_STORAGE_KEYS.userId);
  localStorage.removeItem(AUTH_STORAGE_KEYS.legacyUserId);
  localStorage.removeItem('hrms_profile_image');
  if (invalid) {
    sessionStorage.setItem(AUTH_STORAGE_KEYS.invalidSession, '1');
  }
};

export const getTokenExpiryMs = (token) => {
  try {
    const [, payload] = token.split('.');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalized));
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
};
