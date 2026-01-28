import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                setUser(JSON.parse(userInfo));
            } catch (error) {
                console.error("Failed to parse user info:", error);
                localStorage.removeItem('userInfo');
            }
        }
        setLoading(false);
    }, []);

    const login = async (firebaseToken, name = '') => {
        try {
            // Send Firebase Token (and optional name) to Backend
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login-sync`, { name }, {
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
