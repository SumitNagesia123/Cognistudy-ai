import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children, addToast }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          logout();
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
      addToast("Successfully logged in!");
      return true;
    } catch (err) {
      addToast(err.message || "Invalid credentials", "error");
      return false;
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
      addToast("Registration successful!");
      return true;
    } catch (err) {
      addToast(err.message || "Failed to register", "error");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    addToast("Logged out successfully");
  };

  const updatePreferences = async (preferences) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ preferences })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, preferences: data.preferences } : null);
        addToast("Preferences saved!");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to update preferences", "error");
    }
  };

  const updatePoints = async (pointsToAdd) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/points`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ points: pointsToAdd })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, points: data.points } : null);
        addToast(`Awarded ${pointsToAdd} points! 🪙`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updatePreferences, updatePoints, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};
