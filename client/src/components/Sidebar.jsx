import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, User, Book, Menu, LogOut, ChevronDown, ChevronRight, GraduationCap, DollarSign, FileText, Award, MessageCircle } from "lucide-react";
import muJLogo from "../assets/mujLogo.png";

export default function Sidebar({ user, onLogout }) {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [openMenus, setOpenMenus] = useState({});

    const toggleMenu = (name) => {
        setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const menuItems = [
        {
            name: "Academics",
            icon: <GraduationCap size={20} />,
            submenu: [
                { name: "Timetable", to: "#" },
                { name: "Attendance", to: "#" },
                { name: "Marks", to: "#" },
                { name: "Grades / GPA", to: "#" },
            ]
        },
        {
            name: "DSW",
            icon: <User size={20} />,
            submenu: [
                { name: "Scholarships", to: "#" }, // Should technically be nested but keeping flat for simple V1 unless deep nest requested
                { name: "Exams", to: "#" },
                { name: "Finance", to: "#" },
                { name: "Registration", to: "#" },
                { name: "Reregistrations", to: "#" },
                { name: "Makeups", to: "#" },
                { name: "Feedback", to: "#" },
            ]
        },
        {
            name: "E-Library",
            icon: <Book size={20} />,
            to: "https://muj.remotlog.com/",
            external: true
        }
    ];


    return (
        <aside
            className={`${isCollapsed ? 'w-20' : 'w-64'} bg-orange-600 text-white min-h-screen flex flex-col shadow-lg transition-all duration-300 relative`}
        >
            {/* Logo & Toggle Section */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-orange-500 bg-white">
                {!isCollapsed && (
                    <div className="flex items-center space-x-2 overflow-hidden">
                        <img src={muJLogo} alt="MUJ Logo" className="h-10 w-auto" />
                        <div className="flex flex-col whitespace-nowrap">
                            <span className="text-[10px] font-bold text-orange-700 tracking-wide uppercase">Manipal University</span>
                            <span className="text-[10px] font-bold text-orange-700 tracking-wide uppercase">Jaipur</span>
                        </div>
                    </div>
                )}
                <button onClick={toggleSidebar} className="text-orange-700 hover:bg-orange-100 p-1 rounded-full">
                    <Menu size={24} />
                </button>
            </div>

            {/* Home Link (Always visible) */}
            <div className="mt-4 px-2">
                <Link to="/dashboard"
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-orange-500 transition-colors ${location.pathname === '/dashboard' ? 'bg-orange-700' : ''}`}
                    title="Home"
                >
                    <Home size={20} />
                    {!isCollapsed && <span>Home</span>}
                </Link>
            </div>

            {/* Menu Label */}
            {!isCollapsed && (
                <div className="px-6 py-4 text-xs font-semibold text-orange-200 uppercase tracking-wider">
                    Menu
                </div>
            )}

            {/* Dynamic Menu Items */}
            <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                    <div key={item.name}>
                        {/* Parent Item */}
                        {item.submenu ? (
                            <button
                                onClick={() => toggleMenu(item.name)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-orange-500 transition-colors ${openMenus[item.name] ? 'bg-orange-700' : ''}`}
                                title={item.name}
                            >
                                <div className="flex items-center space-x-3">
                                    {item.icon}
                                    {!isCollapsed && <span>{item.name}</span>}
                                </div>
                                {!isCollapsed && (
                                    openMenus[item.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                )}
                            </button>
                        ) : (
                            // External Link or Regular Link
                            <Link
                                to={item.to}
                                target={item.external ? "_blank" : "_self"}
                                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-orange-500 transition-colors"
                                title={item.name}
                            >
                                {item.icon}
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        )}

                        {/* Submenu Items */}
                        {!isCollapsed && item.submenu && openMenus[item.name] && (
                            <div className="pl-12 space-y-1 mt-1">
                                {item.submenu.map((subItem) => (
                                    <Link
                                        key={subItem.name}
                                        to={subItem.to}
                                        className="block py-2 text-sm text-orange-100 hover:text-white hover:underline truncate"
                                    >
                                        - {subItem.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-orange-500">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center space-x-2 bg-orange-700 hover:bg-orange-800 text-white py-2 px-4 rounded-lg transition"
                    title="Logout"
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}
