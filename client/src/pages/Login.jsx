import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';


const Login = () => {
    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            // Validation Logic
            const isFaculty = email.endsWith('@jaipur.manipal.edu');
            const isStudent = email.endsWith('@muj.manipal.edu');

            if (!isFaculty && !isStudent) {
                setError('Invalid Email Domain. Must be @jaipur.manipal.edu or @muj.manipal.edu');
                return;
            }

            let result;
            if (isLogin) {
                result = await signInWithEmailAndPassword(auth, email, password);

                if (!result.user.emailVerified && email !== 'master1@jaipur.manipal.edu') {
                    await auth.signOut();
                    setError('Please verify your email address to log in. Check your inbox.');
                    return;
                }
            } else {
                if (!name.trim()) {
                    setError('Please enter your name.');
                    return;
                }
                result = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(result.user);
                await auth.signOut(); // Sign out immediately so they have to login after verifying
                alert('Account created! A verification link has been sent to your email. Please verify and then log in.');
                setIsLogin(true); // Switch to login view
                return;
            }

            const token = await result.user.getIdToken();
            await login(token, name); // Pass name to login context
            navigate('/');
        } catch (error) {
            console.error(error);
            let msg = error.message;
            if (error.code === 'auth/invalid-credential') {
                msg = 'Incorrect Email or Password.';
            } else if (error.code === 'auth/email-already-in-use') {
                msg = 'Email already registered. Please Login.';
            } else if (error.code === 'auth/weak-password') {
                msg = 'Password should be at least 6 characters.';
            }
            setError(msg);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem', fontWeight: 'bold' }}>
                    {isLogin ? 'Login' : 'Register'}
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    {isLogin ? 'Enter your credentials to access the portal.' : 'Create an account with your college email.'}
                </p>

                {error && <div style={{ color: 'red', marginBottom: '1rem', background: 'rgba(255,0,0,0.1)', padding: '0.5rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="input-field"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email (e.g., student@muj.manipal.edu)"
                        className="input-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        {isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        {isLogin ? 'Register' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
