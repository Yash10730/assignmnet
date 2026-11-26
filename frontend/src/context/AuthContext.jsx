import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);

    if (!tokenStore.get()) {
      setLoading(false);
    } else {
      api
        .get('/auth/me')
        .then((res) => setUser(res.data.data))
        .catch(() => tokenStore.clear())
        .finally(() => setLoading(false));
    }
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const authenticate = async (path, body) => {
    const res = await api.post(path, body);
    tokenStore.set(res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const value = {
    user,
    loading,
    isAdmin: user?.role === 'admin',
    login: (body) => authenticate('/auth/login', body),
    register: (body) => authenticate('/auth/register', body),
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
