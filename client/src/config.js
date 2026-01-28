export const getApiUrl = () => {
    return import.meta.env.VITE_API_URL ?? (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
};
