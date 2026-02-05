import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

import bgImage from '../assets/image.png';
import mujLogo from '../assets/mujLogo.png';


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
            // Validation Logic - Use environment variables
            const studentDomain = import.meta.env.VITE_ALLOWED_STUDENT_DOMAIN || '@muj.manipal.edu';
            const facultyDomain = import.meta.env.VITE_ALLOWED_FACULTY_DOMAIN || '@jaipur.manipal.edu';

            const isFaculty = email.endsWith(facultyDomain);
            const isStudent = email.endsWith(studentDomain);

            if (!isFaculty && !isStudent) {
                setError(`Invalid Email Domain. Must be ${facultyDomain} or ${studentDomain}`);
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
        <div className="relative flex items-center justify-center h-screen w-full overflow-hidden">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 z-0 w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${bgImage})` }}
            >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
            </div>

            {/* Glassmorphism Card */}
            <form
                onSubmit={handleSubmit}
                className="relative z-10 bg-white/90 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/20"
            >
                <div className="flex justify-center mb-6">
                    <img src={mujLogo} alt="MUJ Logo" className="h-20 drop-shadow-md" />
                </div>

                <h2 className="text-3xl font-bold mb-2 text-center text-orange-600">
                    {isLogin ? 'Welcome Back' : 'Join Us'}
                </h2>
                <p className="text-center text-gray-500 mb-8 text-sm">
                    {isLogin ? 'Enter your credentials to access the portal' : 'Create your account to get started'}
                </p>

                {!isLogin && (
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                )}

                <div className="mb-4">
                    <input
                        type="email"
                        placeholder="Email (@muj.manipal.edu)"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-6">
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm rounded">
                        <p>{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                    {isLogin ? 'Sign In' : 'Create Account'}
                </button>

                <div className="mt-8 text-center border-t border-gray-200 pt-6">
                    <p className="text-sm text-gray-600">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-orange-600 font-semibold hover:text-orange-700 hover:underline transition-colors"
                        >
                            {isLogin ? 'Sign up' : 'Login'}
                        </button>
                    </p>
                </div>
            </form>
        </div>
    );
};

export default Login;
