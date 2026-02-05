import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, DollarSign, FileText, Award, MessageCircle, Book, Menu, X, LogOut } from "lucide-react";
import muJLogo from "../assets/mujLogo.png";

export default function Sidebar({ user, onLogout }) {
    const location = useLocation();

    const links = [
        { name: "Home", to: "/dashboard", icon: <Home size={20} /> },
        { name: "Academics", to: "#", icon: <BookOpen size={20} /> },
        { name: "Finance", to: "#", icon: <DollarSign size={20} /> },
        { name: "Examination", to: "#", icon: <FileText size={20} /> },
        { name: "Scholarship", to: "#", icon: <Award size={20} /> },
        { name: "Counselling", to: "#", icon: <MessageCircle size={20} /> },
        { name: "E-Library", to: "#", icon: <Book size={20} /> },
    ];

    return (
        <aside className="w-64 bg-orange-600 text-white min-h-screen flex flex-col shadow-lg fixed md:relative z-20 transition-all duration-300">
            {/* Logo Section */}
            <div className="p-4 flex items-center space-x-3 border-b border-orange-500 bg-white">
                <img src={muJLogo} alt="MUJ Logo" className="h-12 w-auto" />
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-orange-700 tracking-wide uppercase">Manipal University</span>
                    <span className="text-xs font-bold text-orange-700 tracking-wide uppercase">Jaipur</span>
                </div>
            </div>

            {/* Menu Label */}
            <div className="px-6 py-4 text-xs font-semibold text-orange-200 uppercase tracking-wider">
                Menu
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-2 space-y-1">
                {links.map((link) => (
                    <Link
                        key={link.name}
                        to={link.to}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200
                         ${location.pathname === link.to ? "bg-orange-700 font-semibold" : "hover:bg-orange-500"}`}
                    >
                        {link.icon}
                        <span>{link.name}</span>
                        <span className="ml-auto opacity-50 text-sm">›</span>
                    </Link>
                ))}
            </nav>

            {/* Logout Button (Client Request: Sidebar should handle logout if convenient) */}
            <div className="p-4 border-t border-orange-500">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center space-x-2 bg-orange-700 hover:bg-orange-800 text-white py-2 px-4 rounded-lg transition"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
