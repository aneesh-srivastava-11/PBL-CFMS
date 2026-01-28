import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

import { getApiUrl } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // ... existing code ...
    const login = async (firebaseToken, name = '') => {
        try {
            const API_URL = getApiUrl();
            // Send Firebase Token (and optional name) to Backend
            const { data } = await axios.post(`${API_URL}/api/auth/login-sync`, { name }, {
                headers: {
                    Authorization: `Bearer ${firebaseToken}`
                }
            });

            // Backend returns our internal user object + role
            setUser({ ...data, token: firebaseToken });
            localStorage.setItem('userInfo', JSON.stringify({ ...data, token: firebaseToken }));
            return data;
        } catch (error) {
            console.error(error);
            throw error.response?.data?.message || 'Login sync failed';
        }
    };

    const register = async () => {
        // Deprecated in favor of Google Sync
        throw new Error("Registration is disabled. Use Google Sign-In.");
    };

    const logout = () => {
        localStorage.removeItem('userInfo');
        setUser(null);
        // also sign out from firebase if needed, but context might not have auth instance imported directly?
        // Ideally we import auth here and signOut(auth)
    };

    const updateUser = (userData) => {
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
