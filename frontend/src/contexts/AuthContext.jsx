import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Helper functions for storage
const setAuthData = (token, user) => {
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Error setting auth data:', error);
  }
};

const getAuthData = () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    return { token, user };
  } catch (error) {
    console.error('Error getting auth data:', error);
    return { token: null, user: null };
  }
};

const clearAuthData = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Function to verify token
  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      return { success: response.ok && data.success, data };
    } catch (error) {
      console.error('Token verification failed:', error);
      return { success: false, error };
    }
  };

  // Function to refresh token
  const refreshToken = async (oldToken) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${oldToken}`
        }
      });

      const data = await response.json();
      if (response.ok && data.token) {
        return { success: true, token: data.token };
      }
      return { success: false, error: data.error };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const { token: storedToken, user: storedUser } = getAuthData();

        if (storedToken && storedUser) {
          // First try to verify the token
          const verifyResult = await verifyToken(storedToken);

          if (verifyResult.success) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          } else {
            // If verification fails, try to refresh the token
            const refreshResult = await refreshToken(storedToken);

            if (refreshResult.success) {
              // Update stored token and user data
              setAuthData(refreshResult.token, JSON.parse(storedUser));
              setToken(refreshResult.token);
              setUser(JSON.parse(storedUser));
            } else {
              // If refresh fails, clear auth data
              clearAuthData();
              setToken(null);
              setUser(null);
            }
          }
        } else {
          // No stored credentials
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        clearAuthData();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      // Determine if this is a student or admin login
      const endpoint = credentials.studentId ? 'student-login' : 'admin-login';

      console.log('Attempting login with:', { credentials, endpoint });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('Login response status:', response.status);
      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user data
      const userData = credentials.studentId ? data.student : { role: 'admin', ...data.admin };
      setAuthData(data.token, userData);
      setUser(userData);
      setToken(data.token);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    clearAuthData();
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    token,
    isAuthenticated: !!user,
    isStudent: user?.role === 'student',
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 