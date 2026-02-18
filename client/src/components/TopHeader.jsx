import { User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function TopHeader({ user }) {
    return (
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
            {/* Left: Empty Spacer for now (since search is removed) */}
            <div className="flex-1"></div>

            {/* Right: User Profile */}
            <div className="flex items-center ml-4">
                <Link to="/profile" className="flex items-center space-x-3 pl-6 border-l border-gray-200 hover:bg-gray-50 transition p-2 rounded-lg">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-orange-600">
                            <span className="text-gray-800 uppercase">{user?.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 uppercase">{user?.role}</div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <UserIcon className="h-5 w-5" />
                    </div>
                </Link>
            </div>
        </header>
    );
}
